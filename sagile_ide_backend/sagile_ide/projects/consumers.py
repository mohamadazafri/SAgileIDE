import os
import asyncio
import pycrdt
from bson import ObjectId
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from channels.layers import get_channel_layer
from django.conf import settings
from repositories.models import Repository
from asgiref.sync import sync_to_async

# Yjs Protocol Message Types
Y_SYNC_MESSAGE_TYPE = 0
Y_AWARENESS_MESSAGE_TYPE = 1

# In-memory store for active documents.
# Key: f"{project_id}:{file_path}"
# Value: {
#   'doc': pycrdt.Doc,
#   'save_task': asyncio.Task | None,
#   'users': int,
#   'subscription': Subscription,
#   'room_group_name': str
# }
active_documents: dict = {}

# Per-doc locks to prevent race conditions when multiple clients connect
# to the same document simultaneously (concurrent initialization).
_session_locks: dict = {}


class EditorConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.project_id = self.scope['url_route']['kwargs']['project_id']
        self.file_path_param = self.scope['url_route']['kwargs']['file_path']

        self.room_group_name = (
            f"editor_{self.project_id}_{self.file_path_param.replace('/', '_')}"
        )
        self.doc_key = f"{self.project_id}:{self.file_path_param}"

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        print(f"[WS] Connected: {self.channel_name} → {self.doc_key}")

        await self.initialize_session()

        # Send sync step 1 so the client can advertise its state vector
        # and receive anything it is missing from the server.
        if self.doc_key in active_documents:
            doc = active_documents[self.doc_key]['doc']
            sync_step1 = pycrdt.create_sync_message(doc)
            await self.send(bytes_data=sync_step1)

    async def disconnect(self, close_code):
        print(
            f"[WS] Disconnected: {self.channel_name} → {self.doc_key} "
            f"(code: {close_code})"
        )
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        await self.cleanup_session()

    async def receive(self, text_data=None, bytes_data=None):
        if not bytes_data:
            return

        message_type = bytes_data[0]
        payload = bytes_data[1:]

        if message_type == Y_SYNC_MESSAGE_TYPE:
            if self.doc_key in active_documents:
                doc = active_documents[self.doc_key]['doc']
                # handle_sync_message applies the received update/state-vector
                # to the doc and returns a reply when needed (e.g. sync step 2).
                reply = pycrdt.handle_sync_message(payload, doc)
                if reply:
                    await self.send(bytes_data=reply)

        elif message_type == Y_AWARENESS_MESSAGE_TYPE:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'awareness_update',
                    'bytes_data': bytes_data,
                    'sender_channel': self.channel_name,
                }
            )

    # -------------------------------------------------------------------------
    # Channel layer message handlers
    # -------------------------------------------------------------------------

    async def editor_update(self, event):
        if self.channel_name != event.get('sender_channel'):
            await self.send(bytes_data=event['bytes_data'])

    async def awareness_update(self, event):
        if self.channel_name != event['sender_channel']:
            await self.send(bytes_data=event['bytes_data'])

    # -------------------------------------------------------------------------
    # Session management
    # -------------------------------------------------------------------------

    async def initialize_session(self):
        """
        Create or join an in-memory document session.

        A per-doc asyncio.Lock prevents two concurrent connections from both
        finding the session absent and each initialising a separate document.
        """
        lock = _session_locks.setdefault(self.doc_key, asyncio.Lock())

        async with lock:
            if self.doc_key not in active_documents:
                doc = pycrdt.Doc()

                # --- Restore document state (before registering the observer) ---
                # Prefer the persisted CRDT binary state because it preserves
                # the full Yjs document identity.  Falling back to plain text
                # creates a fresh doc history, which is fine as long as the
                # frontend always creates a new Y.Doc on connect (which it does).
                crdt_state = await self.read_crdt_state_from_disk()
                if crdt_state:
                    try:
                        doc.apply_update(crdt_state)
                        print(f"[WS] Restored CRDT state from disk: {self.doc_key}")
                    except Exception as e:
                        print(
                            f"[WS] CRDT state restore failed ({e}), "
                            f"falling back to text bootstrap: {self.doc_key}"
                        )
                        await self._bootstrap_from_text(doc)
                else:
                    await self._bootstrap_from_text(doc)

                # --- Register observer AFTER content is loaded ---
                # Registering before the initial insert would fire on_update
                # and broadcast the entire file contents to the room before any
                # client has completed the sync handshake.
                room_group_name = self.room_group_name
                doc_key = self.doc_key

                def on_update(event: pycrdt.TransactionEvent):
                    update = event.update
                    message = pycrdt.create_update_message(update)
                    layer = get_channel_layer()

                    async def _broadcast():
                        await layer.group_send(
                            room_group_name,
                            {
                                'type': 'editor_update',
                                'bytes_data': message,
                                'sender_channel': 'server',
                            }
                        )

                    asyncio.create_task(_broadcast())
                    self.trigger_save()

                subscription = doc.observe(on_update)

                active_documents[self.doc_key] = {
                    'doc': doc,
                    'save_task': None,
                    'users': 1,
                    'subscription': subscription,
                    'room_group_name': self.room_group_name,
                }
                print(f"[WS] New session created: {self.doc_key}")
            else:
                active_documents[self.doc_key]['users'] += 1
                count = active_documents[self.doc_key]['users']
                print(f"[WS] Joined existing session: {self.doc_key} (users: {count})")

    async def _bootstrap_from_text(self, doc: pycrdt.Doc):
        """Load file content from disk and insert it into a fresh Yjs doc."""
        content = await self.read_file_from_disk()
        if content:
            text = doc.get('monaco', type=pycrdt.Text)
            text.insert(0, content)
            print(f"[WS] Bootstrapped from text: {self.doc_key}")

    async def cleanup_session(self):
        if self.doc_key not in active_documents:
            return

        active_documents[self.doc_key]['users'] -= 1
        remaining = active_documents[self.doc_key]['users']
        print(f"[WS] Users remaining for {self.doc_key}: {remaining}")

        if remaining > 0:
            return

        # Last user left — persist and release.
        session = active_documents[self.doc_key]
        doc = session['doc']
        doc.unobserve(session['subscription'])

        # Cancel the pending debounced save so we can do an immediate one.
        save_task = session.get('save_task')
        if save_task and not save_task.done():
            save_task.cancel()
            try:
                await save_task
            except (asyncio.CancelledError, Exception):
                pass

        # Force a final save to ensure nothing is lost.
        await self.save_to_disk_immediate()

        del active_documents[self.doc_key]
        # Remove the lock so memory doesn't grow indefinitely for abandoned keys.
        _session_locks.pop(self.doc_key, None)
        print(f"[WS] Session ended: {self.doc_key}")

    # -------------------------------------------------------------------------
    # Disk I/O helpers
    # -------------------------------------------------------------------------

    @sync_to_async
    def get_full_path(self):
        try:
            try:
                project_oid = ObjectId(self.project_id)
            except Exception:
                project_oid = self.project_id

            repo = Repository.objects.filter(project_id=project_oid).first()
            if repo and repo.root_path:
                return os.path.join(repo.root_path, self.file_path_param)
        except Exception as e:
            print(f"[WS] Error resolving path: {e}")
        return None

    async def read_file_from_disk(self) -> str:
        full_path = await self.get_full_path()
        if full_path and os.path.exists(full_path):
            try:
                def _read():
                    with open(full_path, 'r', encoding='utf-8') as f:
                        return f.read()
                return await asyncio.to_thread(_read)
            except Exception as e:
                print(f"[WS] Error reading file: {e}")
        return ""

    async def read_crdt_state_from_disk(self):
        """
        Read the persisted Yjs binary state from the companion .ystate file.
        Returns raw bytes or None if the file does not exist / cannot be read.
        """
        full_path = await self.get_full_path()
        if not full_path:
            return None

        state_path = full_path + '.ystate'
        if not os.path.exists(state_path):
            return None

        try:
            def _read():
                with open(state_path, 'rb') as f:
                    return f.read()
            data = await asyncio.to_thread(_read)
            return data if data else None
        except Exception as e:
            print(f"[WS] Error reading CRDT state file: {e}")
            return None

    # -------------------------------------------------------------------------
    # Save / debounce
    # -------------------------------------------------------------------------

    def trigger_save(self):
        session = active_documents.get(self.doc_key)
        if not session:
            return

        existing = session.get('save_task')
        if existing and not existing.done():
            existing.cancel()

        session['save_task'] = asyncio.create_task(
            self.save_to_disk_debounced()
        )

    async def save_to_disk_debounced(self):
        try:
            await asyncio.sleep(2)
            await self.save_to_disk_immediate()
        except asyncio.CancelledError:
            pass
        except Exception as e:
            print(f"[WS] Error in debounced save: {e}")

    async def save_to_disk_immediate(self):
        try:
            session = active_documents.get(self.doc_key)
            if not session:
                return

            doc = session['doc']
            text = doc.get('monaco', type=pycrdt.Text)
            text_content = str(text)

            full_path = await self.get_full_path()
            if not full_path:
                return

            def _write():
                os.makedirs(os.path.dirname(full_path), exist_ok=True)

                # Persist the human-readable text file (for git, plain access, etc.)
                with open(full_path, 'w', encoding='utf-8') as f:
                    f.write(text_content)

                # Persist the Yjs binary state so that reconnecting clients
                # share the same document identity and history, enabling
                # clean CRDT merge instead of re-bootstrapping from text.
                try:
                    state = doc.get_update()
                    with open(full_path + '.ystate', 'wb') as f:
                        f.write(state)
                except Exception as e:
                    print(f"[WS] Warning: could not save CRDT state: {e}")

            await asyncio.to_thread(_write)
            print(f"[WS] Saved: {full_path}")
        except Exception as e:
            print(f"[WS] Error saving file: {e}")
