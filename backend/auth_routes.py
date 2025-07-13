"""
Authentication routes for Jobtract application
"""
from flask import Blueprint, request, jsonify, current_app
from functools import wraps
import datetime
import secrets

def create_auth_routes(user_manager, security_manager):
    """Create authentication routes blueprint"""
    auth_bp = Blueprint('auth', __name__)
    
    def require_auth(f):
        """Decorator to require authentication"""
        @wraps(f)
        def decorated_function(*args, **kwargs):
            auth_header = request.headers.get('Authorization')
            
            if not auth_header or not auth_header.startswith('Bearer '):
                return jsonify({'error': 'Authorization header required'}), 401
            
            token = auth_header.split(' ')[1]
            
            try:
                result = security_manager.token_manager.verify_token(token)
                if not result['valid']:
                    return jsonify({'error': 'Invalid token'}), 401
                
                request.current_user = result['payload']
                return f(*args, **kwargs)
                
            except Exception as e:
                return jsonify({'error': 'Token verification failed'}), 401
        
        return decorated_function
    
    @auth_bp.route('/login', methods=['POST'])
    def login():
        """User login endpoint"""
        try:
            # Get request data
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No data provided'}), 400
            
            # Validate input using SecurityManager
            validation = security_manager.validator.validate_and_sanitize(data, {
                'email': {'required': True, 'type': str, 'min_length': 1},
                'password': {'required': True, 'type': str, 'min_length': 1}
            })
            
            if not validation['valid']:
                return jsonify({'error': 'Validation failed', 'details': validation['errors']}), 400
            
            email = validation['data']['email']
            password = validation['data']['password']
            
            # Rate limiting check
            rate_check = security_manager.rate_limiter.is_rate_limited(email)
            
            if rate_check['limited']:
                return jsonify({
                    'error': 'Too many login attempts. Please try again later.',
                    'attempts': rate_check['attempts'],
                    'reset_time': rate_check['reset_time']
                }), 429
            
            # Authenticate user
            user = user_manager.authenticate_user(email, password)
            
            if not user:
                # Record failed attempt
                security_manager.rate_limiter.record_attempt(email, success=False)
                return jsonify({'error': 'Invalid credentials'}), 401
            
            # Record successful attempt
            security_manager.rate_limiter.record_attempt(email, success=True)
            
            # Generate session ID
            session_id = secrets.token_urlsafe(32)
            
            # Generate tokens with session ID
            user_dict = user.to_dict()
            access_token = security_manager.token_manager.generate_access_token(user_dict, session_id)
            refresh_token = security_manager.token_manager.generate_refresh_token(user_dict, session_id)
            
            return jsonify({
                'success': True,
                'message': 'Login successful',
                'access_token': access_token,
                'refresh_token': refresh_token,
                'user': user_dict,
                'expires_in': 24 * 3600  # 24 hours in seconds
            })
            
        except Exception as e:
            current_app.logger.error(f'Login error: {str(e)}')
            return jsonify({'error': 'Internal server error'}), 500

    @auth_bp.route('/verify-token', methods=['POST'])
    def verify_token():
        """Token verification endpoint"""
        try:
            # Try to get token from Authorization header first (standard approach)
            auth_header = request.headers.get('Authorization')
            token = None
            
            if auth_header and auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
            else:
                # Fallback to JSON body for backward compatibility
                data = request.get_json()
                if data and 'token' in data:
                    token = data['token']
            
            if not token:
                return jsonify({'error': 'Token is required in Authorization header or request body'}), 400
            
            result = security_manager.token_manager.verify_token(token)
            
            if result['valid']:
                return jsonify({
                    'valid': True,
                    'user_id': result['payload']['user_id'],
                    'email': result['payload']['email'],
                    'role': result['payload']['role'],
                    'expires_at': result['payload']['exp']
                })
            else:
                return jsonify({
                    'valid': False,
                    'error': result.get('error', 'Invalid token'),
                    'expired': result.get('expired', False)
                }), 401
                
        except Exception as e:
            current_app.logger.error(f'Token verification error: {str(e)}')
            return jsonify({'error': 'Internal server error'}), 500

    @auth_bp.route('/refresh', methods=['POST'])
    def refresh_token():
        """Token refresh endpoint"""
        try:
            data = request.get_json()
            if not data or 'refresh_token' not in data:
                return jsonify({'error': 'Refresh token is required'}), 400
            
            refresh_token = data['refresh_token']
            
            # Verify refresh token
            result = security_manager.token_manager.verify_token(refresh_token)
            
            if not result['valid']:
                return jsonify({'error': 'Invalid refresh token'}), 401
            
            if result['payload']['type'] != 'refresh':
                return jsonify({'error': 'Invalid token type'}), 401
            
            # Get user data
            user = user_manager.get_user_by_id(result['payload']['user_id'])
            
            if not user or not user.is_active:
                return jsonify({'error': 'User not found or inactive'}), 401
            
            # Generate new access token with same session ID
            session_id = result['payload']['session_id']
            access_token = security_manager.token_manager.generate_access_token(user.to_dict(), session_id)
            
            return jsonify({
                'success': True,
                'access_token': access_token,
                'expires_in': 24 * 3600  # 24 hours in seconds
            })
            
        except Exception as e:
            current_app.logger.error(f'Token refresh error: {str(e)}')
            return jsonify({'error': 'Internal server error'}), 500

    @auth_bp.route('/logout', methods=['POST'])
    @require_auth
    def logout():
        """User logout endpoint"""
        try:
            # Get token from header
            auth_header = request.headers.get('Authorization')
            if auth_header and auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
                # Blacklist the token
                security_manager.token_manager.blacklist_token(token)
            
            return jsonify({
                'success': True,
                'message': 'Logout successful'
            })
            
        except Exception as e:
            current_app.logger.error(f'Logout error: {str(e)}')
            return jsonify({'error': 'Internal server error'}), 500

    @auth_bp.route('/register', methods=['POST'])
    def register():
        """User registration endpoint"""
        try:
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No data provided'}), 400
            
            # Validate input using SecurityManager
            validation = security_manager.validator.validate_and_sanitize(data, {
                'email': {'required': True, 'type': str, 'min_length': 1},
                'password': {'required': True, 'type': str, 'min_length': 8},
                'first_name': {'required': True, 'type': str, 'min_length': 1},
                'last_name': {'required': True, 'type': str, 'min_length': 1},
                'company': {'required': False, 'type': str, 'max_length': 200},
                'phone': {'required': False, 'type': str, 'max_length': 20},
                'role': {'required': False, 'type': str, 'max_length': 20}
            })
            
            if not validation['valid']:
                return jsonify({'error': 'Validation failed', 'details': validation['errors']}), 400
            
            validated_data = validation['data']
            
            # Additional password validation
            password = validated_data['password']
            if len(password) < 8:
                return jsonify({'error': 'Password must be at least 8 characters long'}), 400
            
            # Create user
            try:
                user = user_manager.create_user(
                    email=validated_data['email'],
                    password=password,
                    first_name=validated_data['first_name'],
                    last_name=validated_data['last_name'],
                    company=validated_data.get('company', ''),
                    phone=validated_data.get('phone', ''),
                    role=validated_data.get('role', 'user')
                )
                
                return jsonify({
                    'success': True,
                    'message': 'User registered successfully',
                    'user': user.to_dict()
                }), 201
                
            except ValueError as e:
                return jsonify({'error': str(e)}), 409
            
        except Exception as e:
            current_app.logger.error(f'Registration error: {str(e)}')
            return jsonify({'error': 'Internal server error'}), 500

    @auth_bp.route('/profile', methods=['GET'])
    @require_auth
    def get_profile():
        """Get user profile"""
        try:
            user_id = request.current_user['user_id']
            user = user_manager.get_user_by_id(user_id)
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            return jsonify({
                'success': True,
                'user': user.to_dict()
            })
            
        except Exception as e:
            current_app.logger.error(f'Profile error: {str(e)}')
            return jsonify({'error': 'Internal server error'}), 500

    @auth_bp.route('/profile', methods=['PUT'])
    @require_auth
    def update_profile():
        """Update user profile"""
        try:
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No data provided'}), 400
            
            user_id = request.current_user['user_id']
            
            # Validate input using SecurityManager
            validation = security_manager.validator.validate_and_sanitize(data, {
                'first_name': {'required': False, 'type': str, 'max_length': 100},
                'last_name': {'required': False, 'type': str, 'max_length': 100},
                'company': {'required': False, 'type': str, 'max_length': 200},
                'phone': {'required': False, 'type': str, 'max_length': 20}
            })
            
            if not validation['valid']:
                return jsonify({'error': 'Validation failed', 'details': validation['errors']}), 400
            
            # Update user
            user = user_manager.update_user(user_id, **validation['data'])
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            return jsonify({
                'success': True,
                'message': 'Profile updated successfully',
                'user': user.to_dict()
            })
            
        except Exception as e:
            current_app.logger.error(f'Profile update error: {str(e)}')
            return jsonify({'error': 'Internal server error'}), 500

    @auth_bp.route('/test-token', methods=['POST'])
    def test_token():
        """Test token generation endpoint"""
        try:
            # Generate test token
            test_user = {
                'id': 'test-user-id',
                'email': 'test@example.com',
                'role': 'user'
            }
            
            session_id = secrets.token_urlsafe(32)
            token = security_manager.token_manager.generate_access_token(test_user, session_id)
            
            return jsonify({
                'success': True,
                'message': 'JWT token generation working',
                'algorithm': 'HS256',
                'token': token
            })
            
        except Exception as e:
            current_app.logger.error(f'Test token error: {str(e)}')
            return jsonify({'error': 'Internal server error'}), 500
    
    return auth_bp

