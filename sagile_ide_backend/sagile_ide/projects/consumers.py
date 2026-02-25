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

# In-memory store for active documents
# Key: f"{project_id}:{file_path}"
# Value: { 
#   'doc': pycrdt.Doc, 
#   'save_task': asyncio.Task,
#   'users': int,
#   'subscription': Subscription,
#   'room_group_name': str
# }
active_documents = {}

class EditorConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.project_id = self.scope['url_route']['kwargs']['project_id']
        self.file_path_param = self.scope['url_route']['kwargs']['file_path']
        
        self.room_group_name = f"editor_{self.project_id}_{self.file_path_param.replace('/', '_')}"
        self.doc_key = f"{self.project_id}:{self.file_path_param}"

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # Initialize or join document session
        await self.initialize_session()
        
        # Send initial sync step 1 to client to initiate sync
        if self.doc_key in active_documents:
            doc = active_documents[self.doc_key]['doc']
            sync_step1 = pycrdt.create_sync_message(doc)
            await self.send(bytes_data=sync_step1)

    async def disconnect(self, close_code):
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
                # Handle sync message (this applies updates to doc)
                reply = pycrdt.handle_sync_message(payload, doc)
                if reply:
                    await self.send(bytes_data=reply)
                    
        elif message_type == Y_AWARENESS_MESSAGE_TYPE:
            # Broadcast awareness to others
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'awareness_update',
                    'bytes_data': bytes_data,
                    'sender_channel': self.channel_name
                }
            )

    async def editor_update(self, event):
        # Send update to client
        # Echoing back to sender is generally fine for Yjs (idempotent)
        if self.channel_name != event.get('sender_channel'):
             await self.send(bytes_data=event['bytes_data'])

    async def awareness_update(self, event):
        if self.channel_name != event['sender_channel']:
            await self.send(bytes_data=event['bytes_data'])

    async def initialize_session(self):
        if self.doc_key not in active_documents:
            doc = pycrdt.Doc()
            
            # Helper to broadcast updates
            def on_update(event: pycrdt.TransactionEvent):
                update = event.update
                message = pycrdt.create_update_message(update)
                
                layer = get_channel_layer()
                
                async def send_update():
                    await layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'editor_update',
                            'bytes_data': message,
                            'sender_channel': 'server' 
                        }
                    )
                
                asyncio.create_task(send_update())
                
                # Trigger save
                self.trigger_save()

            subscription = doc.observe(on_update)
            
            # Load existing content from disk
            content = await self.read_file_from_disk()
            if content:
                text = doc.get('monaco', type=pycrdt.Text)
                text.insert(0, content)
            
            active_documents[self.doc_key] = {
                'doc': doc,
                'save_task': None,
                'users': 1,
                'subscription': subscription,
                'room_group_name': self.room_group_name
            }
        else:
            active_documents[self.doc_key]['users'] += 1

    async def cleanup_session(self):
        if self.doc_key in active_documents:
            active_documents[self.doc_key]['users'] -= 1
            if active_documents[self.doc_key]['users'] <= 0:
                # Last user left, clean up
                session = active_documents[self.doc_key]
                doc = session['doc']
                doc.unobserve(session['subscription'])
                
                # Ensure pending save is done
                if session['save_task']:
                    try:
                        await asyncio.wait_for(session['save_task'], timeout=2.0)
                    except (asyncio.TimeoutError, asyncio.CancelledError):
                        pass
                
                # Force final save
                await self.save_to_disk_immediate()
                
                del active_documents[self.doc_key]

    @sync_to_async
    def get_full_path(self):
        try:
            try:
                project_oid = ObjectId(self.project_id)
            except:
                project_oid = self.project_id

            repo = Repository.objects.filter(project_id=project_oid).first()
            if repo and repo.root_path:
                return os.path.join(repo.root_path, self.file_path_param)
        except Exception as e:
            print(f"Error resolving path: {e}")
        return None

    async def read_file_from_disk(self):
        full_path = await self.get_full_path()
        if full_path and os.path.exists(full_path):
            try:
                def _read():
                    with open(full_path, 'r', encoding='utf-8') as f:
                        return f.read()
                return await asyncio.to_thread(_read)
            except Exception as e:
                print(f"Error reading file: {e}")
        return ""

    def trigger_save(self):
        session = active_documents.get(self.doc_key)
        if session:
            if session['save_task']:
                session['save_task'].cancel()
            
            session['save_task'] = asyncio.create_task(self.save_to_disk_debounced())

    async def save_to_disk_debounced(self):
        try:
            # Wait 2 seconds (debounce)
            await asyncio.sleep(2)
            await self.save_to_disk_immediate()
                
        except asyncio.CancelledError:
            pass
        except Exception as e:
            print(f"Error in save task: {e}")

    async def save_to_disk_immediate(self):
        try:
            session = active_documents.get(self.doc_key)
            if not session:
                return

            doc = session['doc']
            text = doc.get('monaco', type=pycrdt.Text)
            text_content = str(text)
            
            full_path = await self.get_full_path()
            if full_path:
                def _write():
                    os.makedirs(os.path.dirname(full_path), exist_ok=True)
                    with open(full_path, 'w', encoding='utf-8') as f:
                        f.write(text_content)
                
                await asyncio.to_thread(_write)
                print(f"Saved file: {full_path}")
        except Exception as e:
            print(f"Error saving file: {e}")
