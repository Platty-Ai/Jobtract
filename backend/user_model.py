"""
User model for Jobtract application
"""
import uuid
import threading
import datetime
from typing import Dict, Any, Optional, List
from security_config import SecurityManager

class User:
    """User model with secure authentication"""
    
    def __init__(self, email: str, password: str = None, role: str = 'user', **kwargs):
        self.id = str(uuid.uuid4())
        self.email = email.lower().strip()
        self.role = role
        self.created_at = datetime.datetime.utcnow()
        self.last_login = None
        self.is_active = True
        
        # Additional user fields
        self.first_name = kwargs.get('first_name', '')
        self.last_name = kwargs.get('last_name', '')
        self.company = kwargs.get('company', '')
        self.phone = kwargs.get('phone', '')
        
        # Password handling
        if password:
            self.set_password(password)
        else:
            self.password_hash = None
            self.password_salt = None
    
    def set_password(self, password: str):
        """Set user password with secure hashing"""
        # Use SecurityManager for password hashing
        security_manager = SecurityManager()
        hash_result = security_manager.hasher.hash_password(password)
        self.password_hash = hash_result['hash']
        self.password_salt = hash_result['salt']
    
    def verify_password(self, password: str) -> bool:
        """Verify user password"""
        if not self.password_hash or not self.password_salt:
            return False
        
        # Use SecurityManager for password verification
        security_manager = SecurityManager()
        return security_manager.hasher.verify_password(password, self.password_hash, self.password_salt)
    
    def update_last_login(self):
        """Update last login timestamp"""
        self.last_login = datetime.datetime.utcnow()
    
    def to_dict(self, include_sensitive: bool = False) -> Dict[str, Any]:
        """Convert user to dictionary"""
        user_dict = {
            'id': self.id,
            'email': self.email,
            'role': self.role,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'company': self.company,
            'phone': self.phone,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'is_active': self.is_active
        }
        
        if include_sensitive:
            user_dict.update({
                'password_hash': self.password_hash,
                'password_salt': self.password_salt
            })
        
        return user_dict
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'User':
        """Create user from dictionary"""
        user = cls(
            email=data['email'],
            role=data.get('role', 'user'),
            first_name=data.get('first_name', ''),
            last_name=data.get('last_name', ''),
            company=data.get('company', ''),
            phone=data.get('phone', '')
        )
        
        # Set existing data
        user.id = data.get('id', user.id)
        user.password_hash = data.get('password_hash')
        user.password_salt = data.get('password_salt')
        user.is_active = data.get('is_active', True)
        
        # Parse timestamps
        if data.get('created_at'):
            user.created_at = datetime.datetime.fromisoformat(data['created_at'])
        if data.get('last_login'):
            user.last_login = datetime.datetime.fromisoformat(data['last_login'])
        
        return user

class UserManager:
    """Thread-safe user management"""
    
    def __init__(self):
        self._users: Dict[str, User] = {}
        self._email_index: Dict[str, str] = {}  # email -> user_id
        self._lock = threading.RLock()
        
        # Create default users
        self._create_default_users()
    
    def _create_default_users(self):
        """Create default users for development"""
        default_users = [
            {
                'email': 'test@contractor.com',
                'password': 'NewTestPass56',
                'role': 'admin',
                'first_name': 'Test',
                'last_name': 'Contractor',
                'company': 'ABC Construction'
            },
            {
                'email': 'demo@jobtract.com',
                'password': 'DemoPass123!',
                'role': 'user',
                'first_name': 'Demo',
                'last_name': 'User',
                'company': 'Demo Company'
            }
        ]
        
        for user_data in default_users:
            try:
                self.create_user(**user_data)
            except ValueError:
                # User already exists, skip
                pass
    
    def create_user(self, email: str, password: str, **kwargs) -> User:
        """Create a new user"""
        with self._lock:
            email = email.lower().strip()
            
            if email in self._email_index:
                raise ValueError(f"User with email {email} already exists")
            
            user = User(email=email, password=password, **kwargs)
            self._users[user.id] = user
            self._email_index[email] = user.id
            
            return user
    
    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        with self._lock:
            return self._users.get(user_id)
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        with self._lock:
            email = email.lower().strip()
            user_id = self._email_index.get(email)
            if user_id:
                return self._users.get(user_id)
            return None
    
    def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """Authenticate user with email and password"""
        user = self.get_user_by_email(email)
        if user and user.verify_password(password) and user.is_active:
            user.update_last_login()
            return user
        return None
    
    def get_all_users(self) -> List[User]:
        """Get all users"""
        with self._lock:
            return list(self._users.values())
    
    def update_user(self, user_id: str, **kwargs) -> Optional[User]:
        """Update user data"""
        with self._lock:
            user = self._users.get(user_id)
            if not user:
                return None
            
            # Update allowed fields
            allowed_fields = ['first_name', 'last_name', 'company', 'phone', 'role', 'is_active']
            for field in allowed_fields:
                if field in kwargs:
                    setattr(user, field, kwargs[field])
            
            # Handle password update
            if 'password' in kwargs:
                user.set_password(kwargs['password'])
            
            return user
    
    def delete_user(self, user_id: str) -> bool:
        """Delete user"""
        with self._lock:
            user = self._users.get(user_id)
            if not user:
                return False
            
            del self._users[user_id]
            del self._email_index[user.email]
            return True

