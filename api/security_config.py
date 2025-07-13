"""
Enterprise-Grade Security Configuration for Jobtract
Built for scale, compliance, and production environments
"""

import os
import hashlib
import secrets
import jwt
import datetime
import time
import threading
import logging
import json
import ipaddress
import re
from typing import Dict, Any, Optional, List, Set
from functools import wraps
from dataclasses import dataclass
from enum import Enum
import redis
from flask import request, jsonify, current_app

# Configure security logger
security_logger = logging.getLogger('jobtract.security')
security_logger.setLevel(logging.INFO)

class SecurityLevel(Enum):
    """Security levels for different environments"""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"

class EventType(Enum):
    """Security event types for audit logging"""
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    LOGIN_BLOCKED = "login_blocked"
    TOKEN_ISSUED = "token_issued"
    TOKEN_EXPIRED = "token_expired"
    TOKEN_INVALID = "token_invalid"
    PASSWORD_CHANGED = "password_changed"
    ACCOUNT_LOCKED = "account_locked"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    UNAUTHORIZED_ACCESS = "unauthorized_access"

@dataclass
class SecurityConfig:
    """Centralized security configuration with environment-based settings"""
    
    def __init__(self):
        self.environment = os.getenv('FLASK_ENV', 'development')
        self.security_level = SecurityLevel(self.environment)
        
        # Password requirements
        self.password_min_length = 12 if self.security_level == SecurityLevel.PRODUCTION else 8
        self.password_require_uppercase = True
        self.password_require_lowercase = True
        self.password_require_digits = True
        self.password_require_special = True
        self.password_max_age_days = 90 if self.security_level == SecurityLevel.PRODUCTION else 365
        
        # Rate limiting
        self.max_login_attempts = 3 if self.security_level == SecurityLevel.PRODUCTION else 5
        self.lockout_duration = 1800 if self.security_level == SecurityLevel.PRODUCTION else 900  # 30 min vs 15 min
        self.rate_limit_window = 3600  # 1 hour
        self.max_requests_per_hour = 1000
        
        # Token configuration
        self.token_expiry_hours = 8 if self.security_level == SecurityLevel.PRODUCTION else 24
        self.refresh_token_expiry_days = 7 if self.security_level == SecurityLevel.PRODUCTION else 30
        self.jwt_algorithm = 'HS256'
        self.token_issuer = 'jobtract-system'
        
        # Session configuration
        self.session_timeout_minutes = 30
        self.max_concurrent_sessions = 3
        self.session_regenerate_interval = 900  # 15 minutes
        
        # Security headers
        self.security_headers = {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
            'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
            'Referrer-Policy': 'strict-origin-when-cross-origin'
        }
        
        # Redis configuration for distributed caching
        self.redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
        self.use_redis = os.getenv('USE_REDIS', 'false').lower() == 'true'

class EnhancedHasher:
    """Enterprise-grade password hashing with multiple algorithms"""
    
    @staticmethod
    def generate_salt(length: int = 32) -> str:
        """Generate cryptographically secure salt"""
        return secrets.token_hex(length)
    
    @staticmethod
    def hash_password(password: str, salt: str = None, rounds: int = 100000) -> Dict[str, str]:
        """Hash password with PBKDF2 and configurable rounds"""
        if salt is None:
            salt = EnhancedHasher.generate_salt()
        
        # Use PBKDF2 with SHA-256
        hashed = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), rounds)
        
        return {
            'hash': hashed.hex(),
            'salt': salt,
            'rounds': rounds,
            'algorithm': 'pbkdf2_sha256'
        }
    
    @staticmethod
    def verify_password(password: str, stored_hash: str, salt: str, rounds: int = 100000) -> bool:
        """Verify password with timing attack protection"""
        computed_hash = EnhancedHasher.hash_password(password, salt, rounds)['hash']
        return secrets.compare_digest(computed_hash, stored_hash)
    
    @staticmethod
    def validate_password_strength(password: str, config: SecurityConfig) -> Dict[str, Any]:
        """Validate password against security requirements"""
        errors = []
        
        if len(password) < config.password_min_length:
            errors.append(f'Password must be at least {config.password_min_length} characters long')
        
        if config.password_require_uppercase and not re.search(r'[A-Z]', password):
            errors.append('Password must contain at least one uppercase letter')
        
        if config.password_require_lowercase and not re.search(r'[a-z]', password):
            errors.append('Password must contain at least one lowercase letter')
        
        if config.password_require_digits and not re.search(r'\d', password):
            errors.append('Password must contain at least one digit')
        
        if config.password_require_special and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            errors.append('Password must contain at least one special character')
        
        # Check for common patterns
        if re.search(r'(.)\1{2,}', password):
            errors.append('Password cannot contain repeated characters')
        
        if re.search(r'(012|123|234|345|456|567|678|789|890)', password):
            errors.append('Password cannot contain sequential numbers')
        
        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'strength_score': max(0, 100 - len(errors) * 20)
        }

class EnhancedTokenManager:
    """Enterprise token management with blacklisting and session tracking"""
    
    def __init__(self, secret_key: str, config: SecurityConfig):
        self.secret_key = secret_key
        self.config = config
        self.algorithm = config.jwt_algorithm
        self.blacklisted_tokens: Set[str] = set()
        self.active_sessions: Dict[str, Dict] = {}
        self._lock = threading.RLock()
        
        # Initialize Redis if available
        self.redis_client = None
        if config.use_redis:
            try:
                import redis
                self.redis_client = redis.from_url(config.redis_url)
                self.redis_client.ping()  # Test connection
            except Exception as e:
                security_logger.warning(f"Redis connection failed: {e}")
    
    def generate_access_token(self, user_data: Dict[str, Any], session_id: str = None) -> str:
        """Generate secure access token with session tracking"""
        if session_id is None:
            session_id = secrets.token_urlsafe(32)
        
        payload = {
            'user_id': user_data['id'],
            'email': user_data['email'],
            'role': user_data.get('role', 'user'),
            'session_id': session_id,
            'iat': datetime.datetime.utcnow(),
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=self.config.token_expiry_hours),
            'iss': self.config.token_issuer,
            'type': 'access',
            'jti': secrets.token_urlsafe(16)  # JWT ID for blacklisting
        }
        
        token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
        
        # Track active session
        self._track_session(session_id, user_data['id'], token)
        
        return token
    
    def generate_refresh_token(self, user_data: Dict[str, Any], session_id: str) -> str:
        """Generate secure refresh token"""
        payload = {
            'user_id': user_data['id'],
            'email': user_data['email'],
            'session_id': session_id,
            'iat': datetime.datetime.utcnow(),
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=self.config.refresh_token_expiry_days),
            'iss': self.config.token_issuer,
            'type': 'refresh',
            'jti': secrets.token_urlsafe(16)
        }
        
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def verify_token(self, token: str) -> Dict[str, Any]:
        """Verify token with blacklist checking"""
        try:
            # Check if token is blacklisted
            if self._is_token_blacklisted(token):
                return {'valid': False, 'payload': None, 'expired': False, 'error': 'Token has been revoked'}
            
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            
            # Verify session is still active
            if not self._is_session_active(payload.get('session_id')):
                return {'valid': False, 'payload': None, 'expired': False, 'error': 'Session has expired'}
            
            return {'valid': True, 'payload': payload, 'expired': False}
            
        except jwt.ExpiredSignatureError:
            return {'valid': False, 'payload': None, 'expired': True, 'error': 'Token has expired'}
        except jwt.InvalidTokenError as e:
            return {'valid': False, 'payload': None, 'expired': False, 'error': str(e)}
    
    def blacklist_token(self, token: str) -> bool:
        """Add token to blacklist"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm], options={"verify_exp": False})
            jti = payload.get('jti')
            
            if jti:
                with self._lock:
                    self.blacklisted_tokens.add(jti)
                
                # Store in Redis if available
                if self.redis_client:
                    try:
                        exp = payload.get('exp', 0)
                        ttl = max(0, exp - int(time.time()))
                        self.redis_client.setex(f"blacklist:{jti}", ttl, "1")
                    except Exception as e:
                        security_logger.warning(f"Redis blacklist storage failed: {e}")
                
                return True
        except Exception as e:
            security_logger.error(f"Token blacklisting failed: {e}")
        
        return False
    
    def _is_token_blacklisted(self, token: str) -> bool:
        """Check if token is blacklisted"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm], options={"verify_exp": False})
            jti = payload.get('jti')
            
            if not jti:
                return False
            
            # Check Redis first
            if self.redis_client:
                try:
                    return bool(self.redis_client.exists(f"blacklist:{jti}"))
                except Exception:
                    pass
            
            # Fallback to in-memory
            with self._lock:
                return jti in self.blacklisted_tokens
                
        except Exception:
            return False
    
    def _track_session(self, session_id: str, user_id: int, token: str):
        """Track active session"""
        with self._lock:
            self.active_sessions[session_id] = {
                'user_id': user_id,
                'created_at': time.time(),
                'last_activity': time.time(),
                'token_hash': hashlib.sha256(token.encode()).hexdigest()[:16]
            }
    
    def _is_session_active(self, session_id: str) -> bool:
        """Check if session is active"""
        if not session_id:
            return False
        
        with self._lock:
            session = self.active_sessions.get(session_id)
            if not session:
                return False
            
            # Check session timeout
            if time.time() - session['last_activity'] > self.config.session_timeout_minutes * 60:
                del self.active_sessions[session_id]
                return False
            
            # Update last activity
            session['last_activity'] = time.time()
            return True

class AdvancedRateLimiter:
    """Advanced rate limiting with IP tracking and distributed support"""
    
    def __init__(self, config: SecurityConfig):
        self.config = config
        self._attempts = {}
        self._ip_attempts = {}
        self._lock = threading.RLock()
        
        # Initialize Redis if available
        self.redis_client = None
        if config.use_redis:
            try:
                import redis
                self.redis_client = redis.from_url(config.redis_url)
                self.redis_client.ping()
            except Exception as e:
                security_logger.warning(f"Redis connection failed for rate limiter: {e}")
    
    def is_rate_limited(self, identifier: str, ip_address: str = None) -> Dict[str, Any]:
        """Check if identifier or IP is rate limited"""
        current_time = time.time()
        
        # Check user-specific rate limiting
        user_limited = self._check_user_rate_limit(identifier, current_time)
        
        # Check IP-based rate limiting
        ip_limited = self._check_ip_rate_limit(ip_address, current_time) if ip_address else {'limited': False}
        
        if user_limited['limited'] or ip_limited['limited']:
            return {
                'limited': True,
                'reason': 'user_limit' if user_limited['limited'] else 'ip_limit',
                'attempts': user_limited.get('attempts', ip_limited.get('attempts', 0)),
                'reset_time': max(user_limited.get('reset_time', 0), ip_limited.get('reset_time', 0))
            }
        
        return {'limited': False, 'attempts': user_limited.get('attempts', 0)}
    
    def record_attempt(self, identifier: str, ip_address: str = None, success: bool = False):
        """Record login attempt"""
        current_time = time.time()
        
        # Record user attempt
        self._record_user_attempt(identifier, current_time, success)
        
        # Record IP attempt
        if ip_address:
            self._record_ip_attempt(ip_address, current_time, success)
    
    def _check_user_rate_limit(self, identifier: str, current_time: float) -> Dict[str, Any]:
        """Check user-specific rate limiting"""
        key = f"user_attempts:{identifier}"
        
        if self.redis_client:
            try:
                attempts = self.redis_client.lrange(key, 0, -1)
                attempts = [float(ts) for ts in attempts if current_time - float(ts) < self.config.lockout_duration]
                
                if len(attempts) >= self.config.max_login_attempts:
                    return {
                        'limited': True,
                        'attempts': len(attempts),
                        'reset_time': min(attempts) + self.config.lockout_duration
                    }
                
                return {'limited': False, 'attempts': len(attempts)}
            except Exception:
                pass
        
        # Fallback to in-memory
        with self._lock:
            if identifier not in self._attempts:
                return {'limited': False, 'attempts': 0}
            
            attempts = self._attempts[identifier]
            attempts['timestamps'] = [ts for ts in attempts['timestamps'] if current_time - ts < self.config.lockout_duration]
            
            if len(attempts['timestamps']) >= self.config.max_login_attempts:
                return {
                    'limited': True,
                    'attempts': len(attempts['timestamps']),
                    'reset_time': min(attempts['timestamps']) + self.config.lockout_duration
                }
            
            return {'limited': False, 'attempts': len(attempts['timestamps'])}
    
    def _check_ip_rate_limit(self, ip_address: str, current_time: float) -> Dict[str, Any]:
        """Check IP-based rate limiting"""
        key = f"ip_attempts:{ip_address}"
        max_ip_attempts = self.config.max_login_attempts * 3  # More lenient for IP
        
        if self.redis_client:
            try:
                attempts = self.redis_client.lrange(key, 0, -1)
                attempts = [float(ts) for ts in attempts if current_time - float(ts) < self.config.lockout_duration]
                
                if len(attempts) >= max_ip_attempts:
                    return {
                        'limited': True,
                        'attempts': len(attempts),
                        'reset_time': min(attempts) + self.config.lockout_duration
                    }
                
                return {'limited': False, 'attempts': len(attempts)}
            except Exception:
                pass
        
        # Fallback to in-memory
        with self._lock:
            if ip_address not in self._ip_attempts:
                return {'limited': False, 'attempts': 0}
            
            attempts = self._ip_attempts[ip_address]
            attempts['timestamps'] = [ts for ts in attempts['timestamps'] if current_time - ts < self.config.lockout_duration]
            
            if len(attempts['timestamps']) >= max_ip_attempts:
                return {
                    'limited': True,
                    'attempts': len(attempts['timestamps']),
                    'reset_time': min(attempts['timestamps']) + self.config.lockout_duration
                }
            
            return {'limited': False, 'attempts': len(attempts['timestamps'])}
    
    def _record_user_attempt(self, identifier: str, current_time: float, success: bool):
        """Record user attempt"""
        key = f"user_attempts:{identifier}"
        
        if self.redis_client:
            try:
                if success:
                    self.redis_client.delete(key)
                else:
                    self.redis_client.lpush(key, current_time)
                    self.redis_client.expire(key, self.config.lockout_duration)
                return
            except Exception:
                pass
        
        # Fallback to in-memory
        with self._lock:
            if identifier not in self._attempts:
                self._attempts[identifier] = {'timestamps': [], 'last_success': None}
            
            if success:
                self._attempts[identifier]['timestamps'] = []
                self._attempts[identifier]['last_success'] = current_time
            else:
                self._attempts[identifier]['timestamps'].append(current_time)
    
    def _record_ip_attempt(self, ip_address: str, current_time: float, success: bool):
        """Record IP attempt"""
        key = f"ip_attempts:{ip_address}"
        
        if self.redis_client:
            try:
                if success:
                    # Don't clear IP attempts on success, just reduce frequency
                    pass
                else:
                    self.redis_client.lpush(key, current_time)
                    self.redis_client.expire(key, self.config.lockout_duration)
                return
            except Exception:
                pass
        
        # Fallback to in-memory
        with self._lock:
            if ip_address not in self._ip_attempts:
                self._ip_attempts[ip_address] = {'timestamps': [], 'last_success': None}
            
            if not success:
                self._ip_attempts[ip_address]['timestamps'].append(current_time)

class SecurityAuditor:
    """Security event auditing and logging"""
    
    def __init__(self, config: SecurityConfig):
        self.config = config
        self.audit_log = []
        self._lock = threading.RLock()
        
        # Initialize Redis if available
        self.redis_client = None
        if config.use_redis:
            try:
                import redis
                self.redis_client = redis.from_url(config.redis_url)
                self.redis_client.ping()
            except Exception as e:
                security_logger.warning(f"Redis connection failed for auditor: {e}")
    
    def log_security_event(self, event_type: EventType, user_id: int = None, 
                          ip_address: str = None, details: Dict[str, Any] = None):
        """Log security event"""
        event = {
            'timestamp': datetime.datetime.utcnow().isoformat(),
            'event_type': event_type.value,
            'user_id': user_id,
            'ip_address': ip_address,
            'details': details or {},
            'severity': self._get_event_severity(event_type)
        }
        
        # Log to application logger
        security_logger.info(f"Security Event: {event_type.value}", extra=event)
        
        # Store in memory
        with self._lock:
            self.audit_log.append(event)
            # Keep only last 1000 events in memory
            if len(self.audit_log) > 1000:
                self.audit_log = self.audit_log[-1000:]
        
        # Store in Redis if available
        if self.redis_client:
            try:
                key = f"security_events:{datetime.date.today().isoformat()}"
                self.redis_client.lpush(key, json.dumps(event))
                self.redis_client.expire(key, 86400 * 30)  # Keep for 30 days
            except Exception as e:
                security_logger.warning(f"Failed to store security event in Redis: {e}")
    
    def _get_event_severity(self, event_type: EventType) -> str:
        """Get severity level for event type"""
        high_severity = {
            EventType.LOGIN_BLOCKED,
            EventType.ACCOUNT_LOCKED,
            EventType.SUSPICIOUS_ACTIVITY,
            EventType.UNAUTHORIZED_ACCESS
        }
        
        if event_type in high_severity:
            return "HIGH"
        elif event_type in {EventType.LOGIN_FAILED, EventType.TOKEN_INVALID}:
            return "MEDIUM"
        else:
            return "LOW"

class InputValidator:
    """Advanced input validation and sanitization"""
    
    @staticmethod
    def validate_and_sanitize(data: Dict[str, Any], schema: Dict[str, Dict]) -> Dict[str, Any]:
        """Validate and sanitize input data against schema"""
        errors = []
        sanitized_data = {}
        
        for field, rules in schema.items():
            value = data.get(field)
            
            # Check required fields
            if rules.get('required', False) and (value is None or value == ''):
                errors.append(f'{field} is required')
                continue
            
            # Skip validation for optional empty fields
            if value is None or value == '':
                sanitized_data[field] = value
                continue
            
            # Type validation
            expected_type = rules.get('type', str)
            if not isinstance(value, expected_type):
                try:
                    value = expected_type(value)
                except (ValueError, TypeError):
                    errors.append(f'{field} must be of type {expected_type.__name__}')
                    continue
            
            # String validation
            if isinstance(value, str):
                # Length validation
                min_length = rules.get('min_length', 0)
                max_length = rules.get('max_length', 1000)
                
                if len(value) < min_length:
                    errors.append(f'{field} must be at least {min_length} characters long')
                    continue
                
                if len(value) > max_length:
                    errors.append(f'{field} must be no more than {max_length} characters long')
                    continue
                
                # Pattern validation
                pattern = rules.get('pattern')
                if pattern and not re.match(pattern, value):
                    errors.append(f'{field} format is invalid')
                    continue
                
                # XSS prevention
                sanitized_value = InputValidator._sanitize_string(value)
                
                # SQL injection prevention
                if InputValidator._contains_sql_injection(sanitized_value):
                    errors.append(f'{field} contains potentially dangerous content')
                    continue
                
                sanitized_data[field] = sanitized_value
            
            # Numeric validation
            elif isinstance(value, (int, float)):
                min_val = rules.get('min_value')
                max_val = rules.get('max_value')
                
                if min_val is not None and value < min_val:
                    errors.append(f'{field} must be at least {min_val}')
                    continue
                
                if max_val is not None and value > max_val:
                    errors.append(f'{field} must be no more than {max_val}')
                    continue
                
                sanitized_data[field] = value
            
            else:
                sanitized_data[field] = value
        
        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'data': sanitized_data
        }
    
    @staticmethod
    def _sanitize_string(value: str) -> str:
        """Sanitize string input"""
        import html
        
        # HTML escape
        sanitized = html.escape(value.strip())
        
        # Remove null bytes
        sanitized = sanitized.replace('\x00', '')
        
        # Normalize whitespace
        sanitized = re.sub(r'\s+', ' ', sanitized)
        
        return sanitized
    
    @staticmethod
    def _contains_sql_injection(value: str) -> bool:
        """Check for SQL injection patterns"""
        sql_patterns = [
            r'(\bunion\b.*\bselect\b)',
            r'(\bselect\b.*\bfrom\b)',
            r'(\binsert\b.*\binto\b)',
            r'(\bupdate\b.*\bset\b)',
            r'(\bdelete\b.*\bfrom\b)',
            r'(\bdrop\b.*\btable\b)',
            r'(\balter\b.*\btable\b)',
            r'(\bexec\b.*\b)',
            r'(\bscript\b.*\b)',
            r'(--|\#|/\*|\*/)',
            r'(\bor\b.*=.*\bor\b)',
            r'(\band\b.*=.*\band\b)'
        ]
        
        value_lower = value.lower()
        return any(re.search(pattern, value_lower) for pattern in sql_patterns)

class SecurityManager:
    """Unified security manager for enterprise-grade security"""
    
    def __init__(self):
        self.config = SecurityConfig()
        self.hasher = EnhancedHasher()
        self.token_manager = None  # Will be initialized with secret key
        self.rate_limiter = AdvancedRateLimiter(self.config)
        self.auditor = SecurityAuditor(self.config)
        self.validator = InputValidator()
    
    def initialize_token_manager(self, secret_key: str):
        """Initialize token manager with secret key"""
        self.token_manager = EnhancedTokenManager(secret_key, self.config)
    
    def authenticate_user(self, email: str, password: str, ip_address: str = None) -> Dict[str, Any]:
        """Authenticate user with comprehensive security checks"""
        # Rate limiting check
        rate_limit_result = self.rate_limiter.is_rate_limited(email, ip_address)
        if rate_limit_result['limited']:
            self.auditor.log_security_event(
                EventType.LOGIN_BLOCKED,
                details={'email': email, 'reason': 'rate_limited'}
            )
            return {
                'success': False,
                'error': 'Too many failed attempts. Please try again later.',
                'rate_limited': True,
                'reset_time': rate_limit_result.get('reset_time')
            }
        
        # Input validation
        validation_result = self.validator.validate_and_sanitize({
            'email': email,
            'password': password
        }, {
            'email': {'required': True, 'type': str, 'pattern': r'^[^@]+@[^@]+\.[^@]+$'},
            'password': {'required': True, 'type': str, 'min_length': 1}
        })
        
        if not validation_result['valid']:
            self.rate_limiter.record_attempt(email, ip_address, False)
            self.auditor.log_security_event(
                EventType.LOGIN_FAILED,
                details={'email': email, 'reason': 'invalid_input', 'errors': validation_result['errors']}
            )
            return {
                'success': False,
                'error': 'Invalid input provided',
                'validation_errors': validation_result['errors']
            }
        
        # This would integrate with your user model for actual authentication
        # For now, returning a placeholder response
        return {
            'success': True,
            'user': {'id': 1, 'email': email, 'role': 'user'},
            'message': 'Authentication successful'
        }
    
    def generate_tokens(self, user_data: Dict[str, Any]) -> Dict[str, str]:
        """Generate access and refresh tokens"""
        if not self.token_manager:
            raise RuntimeError("Token manager not initialized")
        
        session_id = secrets.token_urlsafe(32)
        access_token = self.token_manager.generate_access_token(user_data, session_id)
        refresh_token = self.token_manager.generate_refresh_token(user_data, session_id)
        
        self.auditor.log_security_event(
            EventType.TOKEN_ISSUED,
            user_id=user_data['id'],
            details={'session_id': session_id}
        )
        
        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'expires_in': self.config.token_expiry_hours * 3600,
            'token_type': 'Bearer'
        }
    
    def verify_token(self, token: str) -> Dict[str, Any]:
        """Verify token with comprehensive checks"""
        if not self.token_manager:
            raise RuntimeError("Token manager not initialized")
        
        result = self.token_manager.verify_token(token)
        
        if not result['valid']:
            event_type = EventType.TOKEN_EXPIRED if result['expired'] else EventType.TOKEN_INVALID
            self.auditor.log_security_event(
                event_type,
                details={'error': result['error']}
            )
        
        return result
    
    def logout_user(self, token: str) -> bool:
        """Logout user and blacklist token"""
        if not self.token_manager:
            return False
        
        success = self.token_manager.blacklist_token(token)
        
        if success:
            try:
                payload = jwt.decode(token, self.token_manager.secret_key, 
                                  algorithms=[self.token_manager.algorithm], 
                                  options={"verify_exp": False})
                self.auditor.log_security_event(
                    EventType.LOGIN_SUCCESS,  # Successful logout
                    user_id=payload.get('user_id'),
                    details={'action': 'logout'}
                )
            except Exception:
                pass
        
        return success
    
    def get_security_headers(self) -> Dict[str, str]:
        """Get security headers for responses"""
        return self.config.security_headers.copy()

# Decorators for route protection
def require_auth(f):
    """Decorator to require authentication for routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authentication token is missing'}), 401
        
        token = auth_header.split(' ')[1]
        security_manager = current_app.security_manager
        
        result = security_manager.verify_token(token)
        if not result['valid']:
            return jsonify({'error': result.get('error', 'Invalid token')}), 401
        
        # Add user info to request context
        request.current_user = result['payload']
        return f(*args, **kwargs)
    
    return decorated_function

def require_role(required_role: str):
    """Decorator to require specific role"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(request, 'current_user'):
                return jsonify({'error': 'Authentication required'}), 401
            
            user_role = request.current_user.get('role', 'user')
            if user_role != required_role and user_role != 'admin':
                return jsonify({'error': 'Insufficient permissions'}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def add_security_headers(response):
    """Add security headers to response"""
    if hasattr(current_app, 'security_manager'):
        headers = current_app.security_manager.get_security_headers()
        for header, value in headers.items():
            response.headers[header] = value
    return response

