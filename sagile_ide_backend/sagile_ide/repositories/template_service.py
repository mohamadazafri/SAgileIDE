import json
import os
import re
from typing import Dict, List, Optional
from pathlib import Path

class ProjectTemplateService:
    """Service for managing project templates"""
    
    def __init__(self):
        self.templates_dir = Path(__file__).parent.parent / 'templates' / 'project_templates'
        self._templates_cache = {}
        self._load_templates()
    
    def _load_templates(self):
        """Load all templates from the templates directory"""
        if not self.templates_dir.exists():
            return
        
        for template_file in self.templates_dir.glob('*.json'):
            try:
                with open(template_file, 'r', encoding='utf-8') as f:
                    template_data = json.load(f)
                    template_id = template_file.stem
                    self._templates_cache[template_id] = template_data
            except (json.JSONError, IOError) as e:
                print(f"Error loading template {template_file}: {e}")
    
    def get_all_templates(self) -> List[Dict]:
        """Get all available templates"""
        templates = []
        for template_id, template_data in self._templates_cache.items():
            templates.append({
                'id': template_id,
                'name': template_data.get('name', template_id),
                'description': template_data.get('description', ''),
                'category': template_data.get('category', 'other'),
                'framework': template_data.get('framework', 'unknown')
            })
        return templates
    
    def get_template_by_id(self, template_id: str) -> Optional[Dict]:
        """Get a specific template by ID"""
        return self._templates_cache.get(template_id)
    
    def get_templates_by_category(self, category: str) -> List[Dict]:
        """Get templates filtered by category"""
        templates = []
        for template_id, template_data in self._templates_cache.items():
            if template_data.get('category') == category:
                templates.append({
                    'id': template_id,
                    'name': template_data.get('name', template_id),
                    'description': template_data.get('description', ''),
                    'category': template_data.get('category', 'other'),
                    'framework': template_data.get('framework', 'unknown')
                })
        return templates
    
    def apply_template_to_repository(self, repository, template_id: str, template_variables: Dict[str, str] = None) -> bool:
        """Apply a template to a repository by creating files"""
        template = self.get_template_by_id(template_id)
        if not template:
            return False
        
        # Default template variables
        default_variables = {
            'project_name': repository.name,
            'project_description': repository.description or f'A {template.get("name", "project")} created with SAgile IDE'
        }
        
        # Merge with provided variables
        variables = {**default_variables, **(template_variables or {})}
        
        try:
            # Create files from template
            for file_template in template.get('files', []):
                file_path = file_template['file_path']
                file_name = file_template['file_name']
                file_type = file_template.get('file_type', 'code')
                content = file_template['content']
                
                # Replace template variables in content
                processed_content = self._replace_template_variables(content, variables)
                
                # Add file to repository using the model's method
                repository.add_file(
                    file_path=file_path,
                    file_name=file_name,
                    file_type=file_type,
                    file_size=len(processed_content.encode('utf-8')),
                    modified_by=repository.created_by,
                    modified_by_username=repository.created_by_username
                )
                
                # Store content in the file
                for repo_file in repository.files:
                    if repo_file.file_path == file_path:
                        repo_file.content = processed_content
                        break
            
            # Mark repository as initialized
            repository.is_initialized = True
            repository.save()
            
            return True
            
        except Exception as e:
            print(f"Error applying template to repository: {e}")
            return False
    
    def _replace_template_variables(self, content: str, variables: Dict[str, str]) -> str:
        """Replace template variables in content using {{variable}} syntax"""
        for key, value in variables.items():
            # Replace {{key}} with value
            pattern = r'\{\{\s*' + re.escape(key) + r'\s*\}\}'
            content = re.sub(pattern, value, content)
        
        return content
    
    def get_template_preview(self, template_id: str, variables: Dict[str, str] = None) -> Dict:
        """Get a preview of what files will be created from a template"""
        template = self.get_template_by_id(template_id)
        if not template:
            return {}
        
        # Default variables for preview
        default_variables = {
            'project_name': variables.get('project_name', 'my-project'),
            'project_description': variables.get('project_description', 'My awesome project')
        }
        
        variables = {**default_variables, **(variables or {})}
        
        preview = {
            'template_info': {
                'id': template_id,
                'name': template.get('name'),
                'description': template.get('description'),
                'category': template.get('category'),
                'framework': template.get('framework')
            },
            'files': []
        }
        
        for file_template in template.get('files', []):
            file_preview = {
                'file_path': file_template['file_path'],
                'file_name': file_template['file_name'],
                'file_type': file_template.get('file_type', 'code'),
                'content_preview': self._replace_template_variables(
                    file_template['content'][:500] + ('...' if len(file_template['content']) > 500 else ''),
                    variables
                )
            }
            preview['files'].append(file_preview)
        
        return preview
    
    def validate_template(self, template_data: Dict) -> List[str]:
        """Validate a template structure and return any errors"""
        errors = []
        
        # Check required fields
        required_fields = ['name', 'description', 'category', 'framework', 'files']
        for field in required_fields:
            if field not in template_data:
                errors.append(f"Missing required field: {field}")
        
        # Check files structure
        if 'files' in template_data:
            if not isinstance(template_data['files'], list):
                errors.append("Files must be a list")
            else:
                for i, file_data in enumerate(template_data['files']):
                    file_required = ['file_path', 'file_name', 'content']
                    for field in file_required:
                        if field not in file_data:
                            errors.append(f"File {i}: Missing required field: {field}")
        
        return errors
    
    def create_custom_template(self, template_id: str, template_data: Dict) -> bool:
        """Create a new custom template"""
        # Validate template
        errors = self.validate_template(template_data)
        if errors:
            raise ValueError(f"Template validation failed: {', '.join(errors)}")
        
        # Save template to file
        template_file = self.templates_dir / f"{template_id}.json"
        try:
            with open(template_file, 'w', encoding='utf-8') as f:
                json.dump(template_data, f, indent=2, ensure_ascii=False)
            
            # Update cache
            self._templates_cache[template_id] = template_data
            return True
            
        except IOError as e:
            print(f"Error saving template: {e}")
            return False


# Global instance
template_service = ProjectTemplateService()
