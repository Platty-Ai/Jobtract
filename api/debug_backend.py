import os
import jwt
import datetime
import hashlib
import bcrypt
import requests  # NEW: For real Vancouver API calls
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Validate required environment variables
SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable must be set! Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(32))\"")

app = Flask(__name__)
app.config['SECRET_KEY'] = SECRET_KEY

# Enable CORS for all routes
CORS(app, origins=["http://localhost:3000"])

# NEW: Secure password hashing with bcrypt
def hash_password(password):
    """Hash password using bcrypt with salt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password, hashed_password):
    """Verify password against bcrypt hash"""
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception as e:
        print(f"Password verification error: {e}")
        return False

# In-memory storage (will be replaced with database)
users = [
    {
        'id': 1,
        'email': 'test@contractor.com',
        'password': hash_password('NewTestPass456'),  # Now this will work
        'company_name': 'Test Construction Co.'
    }
]

print("DEBUG: Demo user initialized: test@contractor.com")

# Storage for application data
projects = []
equipment = []
expenses = []
quotes = []
purchase_orders = []
invoices = []
tank_deposits = []

# JWT token decorator with COMPREHENSIVE DEBUGGING
def token_required(f):
    def decorated(*args, **kwargs):
        print("\n" + "="*50)
        print("DEBUG: TOKEN VERIFICATION STARTED")
        print("="*50)
        
        # Debug all request headers
        print("DEBUG: ALL REQUEST HEADERS:")
        for header_name, header_value in request.headers:
            print(f"  {header_name}: {header_value}")
        
        # Debug request method and content type
        print(f"DEBUG: Request method: {request.method}")
        print(f"DEBUG: Request content type: {request.content_type}")
        
        # Debug request body
        try:
            if request.data:
                print(f"DEBUG: Request body: {request.data}")
            else:
                print("DEBUG: Request body: EMPTY")
        except Exception as e:
            print(f"DEBUG: Error reading request body: {e}")
        
        token = None
        
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            print(f"DEBUG: Authorization header found: {auth_header}")
            try:
                token = auth_header.split(" ")[1]  # Bearer <token>
                print(f"DEBUG: Extracted token: {token[:20]}...")
            except IndexError:
                print("DEBUG: Token format invalid - IndexError")
                return jsonify({'message': 'Token format invalid'}), 401
        else:
            print("DEBUG: No Authorization header found")
        
        if not token:
            print("DEBUG: Token is missing")
            return jsonify({'message': 'Token is missing'}), 401
        
        try:
            print("DEBUG: Attempting to decode JWT token...")
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            print(f"DEBUG: JWT decoded successfully: {data}")
            current_user_id = data['user_id']
            print(f"DEBUG: Current user ID from token: {current_user_id}")
            print(f"DEBUG: Current user ID type: {type(current_user_id)}")
        except jwt.ExpiredSignatureError:
            print("DEBUG: Token has expired")
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError as e:
            print(f"DEBUG: Token is invalid: {e}")
            return jsonify({'message': 'Token is invalid'}), 401
        
        print("DEBUG: Token verification successful, calling endpoint...")
        print("="*50)
        return f(current_user_id, *args, **kwargs)
    
    decorated.__name__ = f.__name__
    return decorated

# Authentication routes
@app.route('/api/auth/login', methods=['POST'])
def login():
    print("\n" + "="*50)
    print("DEBUG: LOGIN ATTEMPT")
    print("="*50)
    
    data = request.get_json()
    print(f"DEBUG: Login attempt with data: {data}")
    
    if not data or not data.get('email') or not data.get('password'):
        print("DEBUG: Missing email or password")
        return jsonify({'message': 'Email and password required'}), 400
    
    email = data.get('email')
    password = data.get('password')
    
    print(f"DEBUG: Looking for user: {email}")
    user = next((u for u in users if u['email'] == email), None)
    
    if user:
        print("DEBUG: User found: True")
        print(f"DEBUG: User data: {user}")
        password_check = verify_password(password, user['password'])
        print(f"DEBUG: Password check result: {password_check}")
        
        if password_check:
            # FIXED: Generate JWT token with actual user ID (integer), not email
            token_payload = {
                'user_id': user['id'],  # FIXED: Use user['id'] (1) instead of email
                'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
            }
            print(f"DEBUG: Token payload: {token_payload}")
            
            token = jwt.encode(token_payload, app.config['SECRET_KEY'], algorithm='HS256')
            
            print("DEBUG: Login successful, token generated")
            print(f"DEBUG: Generated token preview: {token[:20]}...")
            print("="*50)
            
            return jsonify({
                'token': token,
                'user': {
                    'id': user['id'],
                    'email': user['email'],
                    'company_name': user['company_name']
                }
            }), 200
    
    print("DEBUG: Login failed - invalid credentials")
    print("="*50)
    return jsonify({'message': 'Invalid credentials'}), 401

@app.route('/api/auth/verify-token', methods=['POST'])
@token_required
def verify_token(current_user_id):
    print("\n" + "="*50)
    print("DEBUG: VERIFY TOKEN ENDPOINT REACHED")
    print("="*50)
    
    print(f"DEBUG: Current user ID from token: {current_user_id}")
    print(f"DEBUG: Current user ID type: {type(current_user_id)}")
    
    # FIXED: Look for user by ID (integer), not email
    print("DEBUG: Looking for user in users list...")
    for i, u in enumerate(users):
        print(f"DEBUG: User {i}: id={u['id']} (type: {type(u['id'])}), email={u['email']}")
    
    user = next((u for u in users if u['id'] == current_user_id), None)
    
    if user:
        print(f"DEBUG: User found for verification: {user['email']}")
        response_data = {
            'valid': True,
            'user': {
                'id': user['id'],
                'email': user['email'],
                'company_name': user['company_name']
            }
        }
        print(f"DEBUG: Returning response: {response_data}")
        print("="*50)
        return jsonify(response_data), 200
    
    print("DEBUG: User not found for verification")
    print(f"DEBUG: Searched for user_id: {current_user_id}")
    print("="*50)
    return jsonify({'valid': False}), 401

# Add a simple test endpoint
@app.route('/api/test', methods=['GET'])
def test():
    return jsonify({'message': 'Backend is working!'}), 200

if __name__ == '__main__':
    print("Starting FIXED debug backend server...")
    print("Demo user: test@contractor.com / NewTestPass456")
    app.run(debug=True, host='0.0.0.0', port=5000)

