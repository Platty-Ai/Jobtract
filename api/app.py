import os
import jwt
import datetime
import bcrypt
import requests
import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import base64
import json
import re
from functools import wraps
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-here')
# Configure upload folder in backend directory
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Database connection
DATABASE_URL = os.getenv('DATABASE_URL')

def get_db_connection():
    """Get a database connection"""
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

# Database helper functions for users
def get_user_by_email(email):
    """Get user from database by email"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return dict(user) if user else None
        
    except Exception as e:
        print(f"ERROR getting user by email: {e}")
        return None

def create_user(email, password_hash, name=''):
    """Create a new user in the database"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO users (id, email, password_hash, name, created_at)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING *
        """, (email, email, password_hash, name, datetime.datetime.utcnow()))
        
        user = cursor.fetchone()
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return dict(user) if user else None
        
    except Exception as e:
        print(f"ERROR creating user: {e}")
        return None

# Helper functions
def generate_token(user_id):
    payload = {
        'user_id': user_id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

def verify_token(token):
    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        return payload['user_id']
    except:
        return None

def format_date_for_display(date_value):
    """Format date for display in frontend"""
    if not date_value:
        return ''
    
    try:
        if isinstance(date_value, str):
            # Try to parse the date string
            if 'T' in date_value:
                # ISO format with time
                dt = datetime.datetime.fromisoformat(date_value.replace('Z', '+00:00'))
            else:
                # Date only
                dt = datetime.datetime.strptime(date_value, '%Y-%m-%d')
        elif isinstance(date_value, datetime.datetime):
            dt = date_value
        elif isinstance(date_value, datetime.date):
            dt = datetime.datetime.combine(date_value, datetime.time())
        else:
            return str(date_value)
        
        # Return in YYYY-MM-DD format for frontend
        return dt.strftime('%Y-%m-%d')
    except:
        return str(date_value) if date_value else ''

# Authentication decorator
def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        
        # Check for Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]  # Bearer <token>
            except IndexError:
                return jsonify({'error': 'Invalid token format'}), 401
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        user_id = verify_token(token)
        if not user_id:
            return jsonify({'error': 'Token is invalid'}), 401
        
        request.current_user = user_id
        return f(*args, **kwargs)
    
    return decorated_function

# Authentication routes
@app.route('/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password required'}), 400
    
    email = data['email'].lower()
    password = data['password']
    
    # Check if user already exists
    existing_user = get_user_by_email(email)
    if existing_user:
        return jsonify({'error': 'User already exists'}), 400
    
    # Hash password
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    
    # Create user in database
    user = create_user(email, password_hash, data.get('name', ''))
    
    if not user:
        return jsonify({'error': 'Failed to create user'}), 500
    
    token = generate_token(email)
    
    return jsonify({
        'token': token,
        'user': {
            'id': user['id'],
            'email': user['email'],
            'name': user.get('name', '')
        }
    })

@app.route('/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password required'}), 400
    
    email = data['email'].lower()
    password = data['password']
    
    print(f"DEBUG: Login attempt for: {email}")
    
    # Get user from database
    user = get_user_by_email(email)
    if not user:
        print("DEBUG: User not found in database")
        return jsonify({'error': 'Invalid credentials'}), 401
    
    print("DEBUG: User found in database, checking password")
    
    # Verify password
    password_check = bcrypt.checkpw(password.encode('utf-8'), bytes(user['password_hash']))
    
    if not password_check:
        print("DEBUG: Password check failed")
        return jsonify({'error': 'Invalid credentials'}), 401
    
    token = generate_token(email)
    print(f"DEBUG: Login successful, token generated")
    
    return jsonify({
        'token': token,
        'user': {
            'id': user['id'],
            'email': user['email'],
            'name': user.get('name', '')
        }
    })

@app.route('/auth/verify-token', methods=['POST'])
def verify_token_route():
    print("DEBUG: verify-token endpoint called")
    
    token = None
    
    # Check for Authorization header
    if 'Authorization' in request.headers:
        auth_header = request.headers['Authorization']
        print(f"DEBUG: Authorization header found: {auth_header}")
        try:
            token = auth_header.split(" ")[1]  # Bearer <token>
            print(f"DEBUG: Extracted token from header: {token[:20]}...")
        except IndexError:
            print("DEBUG: Invalid Authorization header format")
            return jsonify({'valid': False}), 400
    
    # Fallback: Check for JSON body
    if not token:
        try:
            data = request.get_json()
            if data and data.get('token'):
                token = data.get('token')
                print(f"DEBUG: Token from JSON body: {token[:20]}...")
        except:
            pass
    
    if not token:
        print("DEBUG: No token found in request")
        return jsonify({'valid': False}), 400
    
    user_id = verify_token(token)
    print(f"DEBUG: Token verification result: {user_id}")
    
    if user_id:
        # Get user from database
        user = get_user_by_email(user_id)
        if user:
            print(f"DEBUG: User found in database: {user['email']}")
            return jsonify({
                'valid': True,
                'user': {
                    'id': user['id'],
                    'email': user['email'],
                    'name': user.get('name', '')
                }
            })
        else:
            print(f"DEBUG: User not found in database for ID: {user_id}")
    
    print("DEBUG: Token verification failed")
    return jsonify({'valid': False})

# Contractor routes (MIGRATED TO POSTGRESQL)
@app.route('/contractors', methods=['GET'])
@require_auth
def get_contractors():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM contractors WHERE user_id = %s ORDER BY created_at DESC", (request.current_user,))
        contractors = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify([dict(contractor) for contractor in contractors])
        
    except Exception as e:
        print(f"ERROR getting contractors: {e}")
        return jsonify({'error': 'Failed to get contractors'}), 500

@app.route('/contractors', methods=['POST'])
@require_auth
def create_contractor():
    data = request.get_json()
    
    if not data or not data.get('name'):
        return jsonify({'error': 'Contractor name required'}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        contractor_id = f"{request.current_user}_{datetime.datetime.utcnow().timestamp()}"
        
        cursor.execute("""
            INSERT INTO contractors (id, user_id, name, email, phone, address, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (
            contractor_id,
            request.current_user,
            data['name'],
            data.get('email', ''),
            data.get('phone', ''),
            data.get('address', ''),
            datetime.datetime.utcnow()
        ))
        
        contractor = cursor.fetchone()
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify(dict(contractor))
        
    except Exception as e:
        print(f"ERROR creating contractor: {e}")
        return jsonify({'error': 'Failed to create contractor'}), 500

# Project routes (COMPLETE WITH PROPER CRUD AND IMAGE HANDLING)
@app.route('/projects', methods=['GET'])
@require_auth
def get_projects():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM projects WHERE user_id = %s ORDER BY created_at DESC", (request.current_user,))
        projects = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify([dict(project) for project in projects])
        
    except Exception as e:
        print(f"ERROR getting projects: {e}")
        return jsonify({'error': 'Failed to get projects'}), 500

@app.route('/projects', methods=['POST'])
@require_auth
def create_project():
    data = request.get_json()
    
    if not data or not data.get('name'):
        return jsonify({'error': 'Project name required'}), 400
    
    try:
        # Handle budget properly to prevent None errors
        budget = data.get('budget', 0)
        try:
            budget = float(budget) if budget is not None else 0.0
        except (ValueError, TypeError):
            budget = 0.0
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        project_id = f"{request.current_user}_{datetime.datetime.utcnow().timestamp()}"
        
        cursor.execute("""
            INSERT INTO projects (
                id, user_id, name, client, description, start_date, end_date, 
                budget, status, priority, photo_path, notes, created_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (
            project_id,
            request.current_user,
            data.get('name', ''),
            data.get('client', ''),
            data.get('description', ''),
            data.get('start_date'),
            data.get('end_date'),
            budget,
            data.get('status', 'Planning'),
            data.get('priority', 'Medium'),
            data.get('photo_path', ''),
            data.get('notes', ''),
            datetime.datetime.utcnow()
        ))
        
        project = cursor.fetchone()
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify(dict(project))
        
    except Exception as e:
        print(f"ERROR creating project: {e}")
        return jsonify({'error': 'Failed to create project'}), 500

@app.route('/projects/<project_id>', methods=['PUT'])
@require_auth
def update_project(project_id):
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    try:
        # Handle budget properly to prevent None errors
        budget = data.get('budget', 0)
        try:
            budget = float(budget) if budget is not None else 0.0
        except (ValueError, TypeError):
            budget = 0.0
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE projects 
            SET name = %s, client = %s, description = %s, start_date = %s, end_date = %s, 
                budget = %s, status = %s, priority = %s, photo_path = %s, notes = %s
            WHERE id = %s AND user_id = %s
            RETURNING *
        """, (
            data.get('name', ''),
            data.get('client', ''),
            data.get('description', ''),
            data.get('start_date'),
            data.get('end_date'),
            budget,
            data.get('status', 'Planning'),
            data.get('priority', 'Medium'),
            data.get('photo_path', ''),
            data.get('notes', ''),
            project_id,
            request.current_user
        ))
        
        project = cursor.fetchone()
        
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify(dict(project))
        
    except Exception as e:
        print(f"ERROR updating project: {e}")
        return jsonify({'error': 'Failed to update project'}), 500

@app.route('/projects/<project_id>', methods=['DELETE'])
@require_auth
def delete_project(project_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM projects WHERE id = %s AND user_id = %s", (project_id, request.current_user))
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Project not found'}), 404
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Project deleted successfully'})
        
    except Exception as e:
        print(f"ERROR deleting project: {e}")
        return jsonify({'error': 'Failed to delete project'}), 500

# File upload route for project photos
@app.route('/projects/upload-photo', methods=['POST'])
@require_auth
def upload_project_photo():
    """Upload photo for project - SECURE FILE HANDLING"""
    try:
        if 'photo' not in request.files:
            return jsonify({'error': 'No photo file provided'}), 400
        
        file = request.files['photo']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Validate file type
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
        if not ('.' in file.filename and 
                file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
            return jsonify({'error': 'Invalid file type. Only images allowed.'}), 400
        
        if file:
            # Secure the filename
            filename = secure_filename(file.filename)
            timestamp = datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')
            user_prefix = request.current_user.replace('@', '_').replace('.', '_')
            filename = f"project_{user_prefix}_{timestamp}_{filename}"
            
            # Ensure upload directory exists
            os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
            
            # Save the file
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            
            return jsonify({
                'filename': filename,
                'path': file_path,
                'url': f'/uploads/{filename}'
            })
        
    except Exception as e:
        print(f"ERROR uploading project photo: {e}")
        return jsonify({'error': 'Failed to upload photo'}), 500

# Quote routes (COMPLETE WITH PROPER DATE FORMATTING)
@app.route('/quotes', methods=['GET'])
@require_auth
def get_quotes():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM quotes WHERE user_id = %s ORDER BY created_at DESC", (request.current_user,))
        quotes = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        # FIXED: Map all database fields to frontend expectations with proper date formatting
        mapped_quotes = []
        for quote in quotes:
            quote_dict = dict(quote)
            
            # DEBUG: Check amount values from database
            print(f"DEBUG: Quote {quote_dict.get('id')} - Raw amount from DB: {quote_dict.get('amount')} (type: {type(quote_dict.get('amount'))})")
            
            mapped_quote = {
                'id': quote_dict.get('id'),
                'client': quote_dict.get('client_name', ''),  # DB: client_name -> Frontend: client
                'client_address': quote_dict.get('client_address', ''),
                'phone': quote_dict.get('phone', ''),
                'email': quote_dict.get('client_email', ''),  # DB: client_email -> Frontend: email
                'description': quote_dict.get('project_description', ''),  # DB: project_description -> Frontend: description
                'amount': quote_dict.get('amount', 0),
                'status': quote_dict.get('status', 'Pending'),
                'quote_date': format_date_for_display(quote_dict.get('quote_date')),  # FIXED: Proper date formatting
                'created_date': format_date_for_display(quote_dict.get('created_at')),  # FIXED: Proper date formatting
                'valid_until': format_date_for_display(quote_dict.get('valid_until')),  # FIXED: Proper date formatting
                'line_items': quote_dict.get('line_items', []),
                'notes': quote_dict.get('notes', ''),
                'photos': quote_dict.get('photos', []),
                'user_id': quote_dict.get('user_id'),
                'project_id': quote_dict.get('project_id'),
                'created_at': quote_dict.get('created_at')
            }
            mapped_quotes.append(mapped_quote)
        
        print(f"DEBUG: Returning {len(mapped_quotes)} quotes with proper date formatting")
        return jsonify(mapped_quotes)
        
    except Exception as e:
        print(f"ERROR getting quotes: {e}")
        return jsonify({'error': 'Failed to get quotes'}), 500

@app.route('/quotes', methods=['POST'])
@require_auth
def create_quote():
    data = request.get_json()
    
    print(f"DEBUG: Quote creation data received: {data}")
    
    client_name = data.get('client') or data.get('client_name')
    client_address = data.get('client_address', '')
    phone = data.get('phone', '')
    client_email = data.get('email') or data.get('client_email', '')
    project_description = data.get('description') or data.get('project_description', '')
    quote_date = data.get('quote_date', '')
    line_items = data.get('line_items', [])
    notes = data.get('notes', '')
    photos = data.get('photos', [])
    
    # FIXED: Calculate total amount from line_items if amount is 0 or missing
    amount = data.get('amount') or data.get('total', 0)
    if amount == 0 and line_items:
        # Calculate subtotal from line items
        subtotal = sum(float(item.get('total', 0)) for item in line_items)
        # Calculate GST and PST
        gst_total = sum(float(item.get('total', 0)) * 0.05 for item in line_items if item.get('hasGST'))
        pst_total = sum(float(item.get('total', 0)) * 0.07 for item in line_items if item.get('hasPST'))
        amount = subtotal + gst_total + pst_total
        print(f"DEBUG: Calculated amount from line_items: subtotal={subtotal}, gst={gst_total}, pst={pst_total}, total={amount}")
    
    if not client_name:
        print("DEBUG: No client name provided")
        return jsonify({'error': 'Client name required'}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        quote_id = f"{request.current_user}_{datetime.datetime.utcnow().timestamp()}"
        
        # FIXED: Store ALL fields in database
        cursor.execute("""
            INSERT INTO quotes (
                id, user_id, project_id, client_name, client_address, phone, 
                client_email, project_description, amount, status, quote_date, 
                valid_until, line_items, notes, photos, created_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (
            quote_id,
            request.current_user,
            data.get('project_id'),
            client_name,
            client_address,
            phone,
            client_email,
            project_description,
            amount,  # Use calculated amount
            data.get('status', 'Pending'),  # Default to Pending instead of draft
            quote_date,
            data.get('valid_until'),
            json.dumps(line_items),
            notes,
            json.dumps(photos),
            datetime.datetime.utcnow()
        ))
        
        quote = cursor.fetchone()
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print(f"DEBUG: Quote created successfully with calculated amount {amount}: {quote['id']}")
        return jsonify(dict(quote))
        
    except Exception as e:
        print(f"ERROR creating quote: {e}")
        return jsonify({'error': 'Failed to create quote'}), 500

# PUT endpoint for updating quotes
@app.route('/quotes/<quote_id>', methods=['PUT'])
@require_auth
def update_quote(quote_id):
    data = request.get_json()
    
    print(f"DEBUG: Quote update data received for ID {quote_id}: {data}")
    
    # FIXED: Handle all frontend field names and map to database fields
    client_name = data.get('client') or data.get('client_name')
    client_address = data.get('client_address', '')
    phone = data.get('phone', '')
    client_email = data.get('email') or data.get('client_email', '')
    project_description = data.get('description') or data.get('project_description', '')
    quote_date = data.get('quote_date', '')
    line_items = data.get('line_items', [])
    notes = data.get('notes', '')
    photos = data.get('photos', [])
    
    # FIXED: Calculate total amount from line_items if amount is 0 or missing
    amount = data.get('amount') or data.get('total', 0)
    if amount == 0 and line_items:
        # Calculate subtotal from line items
        subtotal = sum(float(item.get('total', 0)) for item in line_items)
        # Calculate GST and PST
        gst_total = sum(float(item.get('total', 0)) * 0.05 for item in line_items if item.get('hasGST'))
        pst_total = sum(float(item.get('total', 0)) * 0.07 for item in line_items if item.get('hasPST'))
        amount = subtotal + gst_total + pst_total
        print(f"DEBUG: Calculated amount from line_items for update: subtotal={subtotal}, gst={gst_total}, pst={pst_total}, total={amount}")
    
    if not client_name:
        print("DEBUG: No client name provided")
        return jsonify({'error': 'Client name required'}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # First, verify the quote exists and belongs to the current user
        cursor.execute("SELECT id FROM quotes WHERE id = %s AND user_id = %s", (quote_id, request.current_user))
        existing_quote = cursor.fetchone()
        
        if not existing_quote:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Quote not found or access denied'}), 404
        
        # Update ALL fields in database
        cursor.execute("""
            UPDATE quotes SET 
                client_name = %s,
                client_address = %s,
                phone = %s,
                client_email = %s,
                project_description = %s,
                amount = %s,
                status = %s,
                quote_date = %s,
                valid_until = %s,
                line_items = %s,
                notes = %s,
                photos = %s,
                updated_at = %s
            WHERE id = %s AND user_id = %s
            RETURNING *
        """, (
            client_name,
            client_address,
            phone,
            client_email,
            project_description,
            amount,  # Use calculated amount
            data.get('status', 'Pending'),  # Default to Pending instead of draft
            quote_date,
            data.get('valid_until'),
            json.dumps(line_items),
            notes,
            json.dumps(photos),
            datetime.datetime.utcnow(),
            quote_id,
            request.current_user
        ))
        
        updated_quote = cursor.fetchone()
        
        conn.commit()
        cursor.close()
        conn.close()
        
        if updated_quote:
            print(f"DEBUG: Quote updated successfully with calculated amount {amount}: {quote_id}")
            return jsonify(dict(updated_quote))
        else:
            return jsonify({'error': 'Failed to update quote'}), 500
        
    except Exception as e:
        print(f"ERROR updating quote: {e}")
        return jsonify({'error': 'Failed to update quote'}), 500

# File upload route for quote photos (MATCHES OTHER MODULES PATTERN)
@app.route('/quotes/upload-photo', methods=['POST'])
@require_auth
def upload_quote_photo():
    try:
        if 'photo' not in request.files:
            return jsonify({'error': 'No photo file provided'}), 400
        
        file = request.files['photo']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if file:
            # Create URL-safe user directory name
            safe_user = request.current_user.replace('@', '_at_').replace('.', '_')
            user_dir = os.path.join(app.config['UPLOAD_FOLDER'], f"user_{safe_user}")
            os.makedirs(user_dir, exist_ok=True)
            
            # Generate unique filename
            timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"quote_{timestamp}_{secure_filename(file.filename)}"
            filepath = os.path.join(user_dir, filename)
            
            # Save file
            file.save(filepath)
            
            # Return the relative path for database storage
            relative_path = f"/uploads/user_{safe_user}/{filename}"
            
            return jsonify({
                'success': True,
                'filename': filename,
                'url': relative_path
            })
    
    except Exception as e:
        print(f"ERROR uploading quote photo: {e}")
        return jsonify({'error': 'Failed to upload photo'}), 500

# DELETE endpoint for quotes
@app.route('/quotes/<path:quote_id>', methods=['DELETE'])
@require_auth
def delete_quote(quote_id):
    """Delete a quote - HANDLES URL-ENCODED IDs"""
    try:
        # URL decode the quote_id to handle special characters
        from urllib.parse import unquote
        decoded_quote_id = unquote(quote_id)
        
        print(f"DEBUG: Attempting to delete quote with ID: {decoded_quote_id}")
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # First, verify the quote exists and belongs to the current user
        cursor.execute("SELECT id, client_name FROM quotes WHERE id = %s AND user_id = %s", (decoded_quote_id, request.current_user))
        existing_quote = cursor.fetchone()
        
        if not existing_quote:
            cursor.close()
            conn.close()
            print(f"DEBUG: Quote not found: {decoded_quote_id} for user {request.current_user}")
            return jsonify({'error': 'Quote not found or access denied'}), 404
        
        # Delete the quote
        cursor.execute("DELETE FROM quotes WHERE id = %s AND user_id = %s", (decoded_quote_id, request.current_user))
        
        if cursor.rowcount > 0:
            conn.commit()
            cursor.close()
            conn.close()
            print(f"DEBUG: Quote deleted successfully: {decoded_quote_id} for client {existing_quote['client_name']}")
            return jsonify({'success': True, 'message': 'Quote deleted successfully'})
        else:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Failed to delete quote'}), 500
        
    except Exception as e:
        print(f"ERROR deleting quote: {e}")
        return jsonify({'error': 'Failed to delete quote'}), 500

# EQUIPMENT ROUTES - MATCHING QUOTES PATTERN EXACTLY
@app.route('/equipment', methods=['GET'])
@require_auth
def get_equipment():
    """Get all equipment for the authenticated user - MATCHES QUOTES PATTERN"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM equipment WHERE user_id = %s ORDER BY created_at DESC", (request.current_user,))
        equipment = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        # Map all database fields to frontend expectations with proper date formatting
        mapped_equipment = []
        for item in equipment:
            equipment_dict = dict(item)
            
            # Parse JSON fields safely
            try:
                line_items = json.loads(equipment_dict.get('line_items', '[]')) if equipment_dict.get('line_items') else []
                
                # DEBUG: Check what's in the photos field from database
                photos_field = equipment_dict.get('photos')
                print(f"DEBUG: Raw photos field from DB for {equipment_dict.get('name')}: {photos_field}")
                print(f"DEBUG: Photos field type: {type(photos_field)}")
                
                # FIXED: Handle photos field that might already be a list or a JSON string
                if isinstance(photos_field, list):
                    # Photos field is already a list (parsed by psycopg2)
                    photos_raw = photos_field
                    print(f"DEBUG: Photos field is already a list: {photos_raw}")
                elif isinstance(photos_field, str):
                    # Photos field is a JSON string, parse it
                    photos_raw = json.loads(photos_field) if photos_field else []
                    print(f"DEBUG: Parsed photos from JSON string: {photos_raw}")
                else:
                    # Photos field is None or other type
                    photos_raw = []
                    print(f"DEBUG: Photos field is None/other, using empty list")
                
                print(f"DEBUG: Parsed photos_raw length: {len(photos_raw)}")
                
                # Ensure photo URLs are properly formatted for frontend display
                photos = []
                for photo in photos_raw:
                    if isinstance(photo, dict):
                        # Handle photo objects from database
                        if photo.get('url') and photo['url'].startswith('/uploads/'):
                            photo['url'] = f"http://localhost:5000{photo['url']}"
                        photos.append(photo)
                    elif isinstance(photo, str):
                        # Handle string URLs
                        if photo.startswith('/uploads/'):
                            photos.append({'url': f"http://localhost:5000{photo}"})
                        else:
                            photos.append({'url': photo})
                
                print(f"DEBUG: Final processed photos: {photos}")
                            
            except (json.JSONDecodeError, TypeError) as e:
                print(f"DEBUG: Error parsing photos: {e}")
                line_items = []
                photos = []
            
            mapped_item = {
                'id': equipment_dict.get('id'),
                'name': equipment_dict.get('name', ''),
                'type': equipment_dict.get('type', ''),
                'model': equipment_dict.get('model', ''),
                'serial_number': equipment_dict.get('serial_number', ''),
                'purchase_date': format_date_for_display(equipment_dict.get('purchase_date')),
                'purchase_price': equipment_dict.get('purchase_price', 0),
                'install_date': format_date_for_display(equipment_dict.get('install_date')),
                'warranty_expiry': format_date_for_display(equipment_dict.get('warranty_expiry')),
                'service_date': format_date_for_display(equipment_dict.get('service_date')),
                'service_notes': equipment_dict.get('service_notes', ''),
                'customer_name': equipment_dict.get('customer_name', ''),
                'status': equipment_dict.get('status', 'Available'),
                'location': equipment_dict.get('location', ''),
                'photos': photos,
                'line_items': line_items,
                'notes': equipment_dict.get('notes', ''),
                'user_id': equipment_dict.get('user_id'),
                'created_at': equipment_dict.get('created_at')
            }
            mapped_equipment.append(mapped_item)
        
        print(f"DEBUG: Returning {len(mapped_equipment)} equipment items with proper date formatting")
        return jsonify(mapped_equipment)
        
    except Exception as e:
        print(f"ERROR getting equipment: {e}")
        return jsonify({'error': 'Failed to get equipment'}), 500

@app.route('/equipment', methods=['POST'])
@require_auth
def create_equipment():
    """Create new equipment - MATCHES QUOTES PATTERN"""
    data = request.get_json()
    
    print(f"DEBUG: Equipment creation data received: {data}")
    
    # Handle all frontend field names
    name = data.get('name', '')
    equipment_type = data.get('type', '')
    model = data.get('model', '')
    serial_number = data.get('serial_number', '')
    purchase_date = data.get('purchase_date', '')
    purchase_price = data.get('purchase_price', 0)
    install_date = data.get('install_date', '')
    warranty_expiry = data.get('warranty_expiry', '')
    service_date = data.get('service_date', '')
    service_notes = data.get('service_notes', '')
    customer_name = data.get('customer_name', '')
    status = data.get('status', 'Available')
    location = data.get('location', '')
    line_items = data.get('line_items', [])
    notes = data.get('notes', '')
    photos = data.get('photos', [])
    
    if not name:
        print("DEBUG: No equipment name provided")
        return jsonify({'error': 'Equipment name required'}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        equipment_id = f"{request.current_user}_{datetime.datetime.utcnow().timestamp()}"
        
        # Store ALL fields in database (MATCHES QUOTES PATTERN)
        cursor.execute("""
            INSERT INTO equipment (
                id, user_id, name, type, model, serial_number, 
                purchase_date, purchase_price, install_date, warranty_expiry,
                service_date, service_notes, customer_name, status, location,
                photos, line_items, notes, created_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (
            equipment_id,
            request.current_user,
            name,
            equipment_type,
            model,
            serial_number,
            purchase_date if purchase_date else None,
            purchase_price,
            install_date if install_date else None,
            warranty_expiry if warranty_expiry else None,
            service_date if service_date else None,
            service_notes,
            customer_name,
            status,
            location,
            json.dumps(photos),
            json.dumps(line_items),
            notes,
            datetime.datetime.utcnow()
        ))
        
        equipment = cursor.fetchone()
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print(f"DEBUG: Equipment created successfully with all fields: {equipment['id']}")
        return jsonify(dict(equipment))
        
    except Exception as e:
        print(f"ERROR creating equipment: {e}")
        return jsonify({'error': 'Failed to create equipment'}), 500

# PUT endpoint for updating equipment (MATCHES QUOTES PATTERN)
@app.route('/equipment/<equipment_id>', methods=['PUT'])
@require_auth
def update_equipment(equipment_id):
    """Update existing equipment - MATCHES QUOTES PATTERN"""
    data = request.get_json()
    
    print(f"DEBUG: Equipment update data received for ID {equipment_id}: {data}")
    
    # Handle all frontend field names
    name = data.get('name', '')
    equipment_type = data.get('type', '')
    model = data.get('model', '')
    serial_number = data.get('serial_number', '')
    purchase_date = data.get('purchase_date', '')
    purchase_price = data.get('purchase_price', 0)
    install_date = data.get('install_date', '')
    warranty_expiry = data.get('warranty_expiry', '')
    service_date = data.get('service_date', '')
    service_notes = data.get('service_notes', '')
    customer_name = data.get('customer_name', '')
    status = data.get('status', 'Available')
    location = data.get('location', '')
    line_items = data.get('line_items', [])
    notes = data.get('notes', '')
    photos = data.get('photos', [])
    
    if not name:
        print("DEBUG: No equipment name provided")
        return jsonify({'error': 'Equipment name required'}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # First, verify the equipment exists and belongs to the current user
        cursor.execute("SELECT id FROM equipment WHERE id = %s AND user_id = %s", (equipment_id, request.current_user))
        existing_equipment = cursor.fetchone()
        
        if not existing_equipment:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Equipment not found or access denied'}), 404
        
        # Update ALL fields in database (MATCHES QUOTES PATTERN)
        cursor.execute("""
            UPDATE equipment SET 
                name = %s,
                type = %s,
                model = %s,
                serial_number = %s,
                purchase_date = %s,
                purchase_price = %s,
                install_date = %s,
                warranty_expiry = %s,
                service_date = %s,
                service_notes = %s,
                customer_name = %s,
                status = %s,
                location = %s,
                photos = %s,
                line_items = %s,
                notes = %s,
                updated_at = %s
            WHERE id = %s AND user_id = %s
            RETURNING *
        """, (
            name,
            equipment_type,
            model,
            serial_number,
            purchase_date if purchase_date else None,
            purchase_price,
            install_date if install_date else None,
            warranty_expiry if warranty_expiry else None,
            service_date if service_date else None,
            service_notes,
            customer_name,
            status,
            location,
            json.dumps(photos),
            json.dumps(line_items),
            notes,
            datetime.datetime.utcnow(),
            equipment_id,
            request.current_user
        ))
        
        updated_equipment = cursor.fetchone()
        
        conn.commit()
        cursor.close()
        conn.close()
        
        if updated_equipment:
            print(f"DEBUG: Equipment updated successfully: {equipment_id}")
            return jsonify(dict(updated_equipment))
        else:
            return jsonify({'error': 'Failed to update equipment'}), 500
        
    except Exception as e:
        print(f"ERROR updating equipment: {e}")
        return jsonify({'error': 'Failed to update equipment'}), 500

# DELETE endpoint for equipment (MATCHES QUOTES PATTERN)
@app.route('/equipment/<equipment_id>', methods=['DELETE'])
@require_auth
def delete_equipment(equipment_id):
    """Delete equipment - MATCHES QUOTES PATTERN"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verify the equipment exists and belongs to the current user before deleting
        cursor.execute("SELECT id FROM equipment WHERE id = %s AND user_id = %s", (equipment_id, request.current_user))
        existing_equipment = cursor.fetchone()
        
        if not existing_equipment:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Equipment not found or access denied'}), 404
        
        # Delete the equipment
        cursor.execute("DELETE FROM equipment WHERE id = %s AND user_id = %s", (equipment_id, request.current_user))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print(f"DEBUG: Equipment deleted successfully: {equipment_id}")
        return jsonify({'message': 'Equipment deleted successfully'})
        
    except Exception as e:
        print(f"ERROR deleting equipment: {e}")
        return jsonify({'error': 'Failed to delete equipment'}), 500

# File upload route for equipment photos (MATCHES QUOTES PATTERN)
@app.route('/equipment/upload-photo', methods=['POST'])
@require_auth
def upload_equipment_photo():
    """Upload photo for equipment - SECURE FILE HANDLING"""
    try:
        if 'photo' not in request.files:
            return jsonify({'error': 'No photo file provided'}), 400
        
        file = request.files['photo']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Validate file type
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
        if not ('.' in file.filename and 
                file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
            return jsonify({'error': 'Invalid file type. Only images allowed.'}), 400
        
        if file:
            # Secure the filename
            filename = secure_filename(file.filename)
            timestamp = datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')
            user_prefix = request.current_user.replace('@', '_').replace('.', '_')
            filename = f"{user_prefix}_{timestamp}_{filename}"
            
            # Ensure upload directory exists
            os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
            
            # Save the file
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            
            return jsonify({
                'filename': filename,
                'path': file_path,
                'url': f'/uploads/{filename}'
            })
        
    except Exception as e:
        print(f"ERROR uploading equipment photo: {e}")
        return jsonify({'error': 'Failed to upload photo'}), 500

# ===== COMPLETE EXPENSES ROUTES - BASED ON QUOTES MODULE PATTERNS =====
@app.route('/expenses', methods=['GET'])
@require_auth
def get_expenses():
    """Get all expenses for the authenticated user - MATCHES QUOTES PATTERN"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM expenses WHERE user_id = %s ORDER BY created_at DESC", (request.current_user,))
        expenses = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        # FIXED: Map all database fields to frontend expectations with proper date formatting
        mapped_expenses = []
        for expense in expenses:
            expense_dict = dict(expense)
            
            # Parse JSON fields safely
            try:
                line_items = json.loads(expense_dict.get('line_items', '[]')) if expense_dict.get('line_items') else []
                photos = json.loads(expense_dict.get('photos', '[]')) if expense_dict.get('photos') else []
            except (json.JSONDecodeError, TypeError):
                line_items = []
                photos = []
            
            mapped_expense = {
                'id': expense_dict.get('id'),
                'description': expense_dict.get('description', ''),
                'amount': expense_dict.get('amount', 0),
                'category': expense_dict.get('category', ''),
                'expense_date': format_date_for_display(expense_dict.get('expense_date')),  # FIXED: Proper date formatting
                'date': format_date_for_display(expense_dict.get('expense_date')),  # Frontend also expects 'date'
                'vendor': expense_dict.get('vendor', ''),
                'receipt_number': expense_dict.get('receipt_number', ''),
                'receiptNumber': expense_dict.get('receipt_number', ''),  # Frontend expects camelCase
                'subtotal': expense_dict.get('subtotal', 0),
                'gst_total': expense_dict.get('gst_total', 0),
                'gstTotal': expense_dict.get('gst_total', 0),  # Frontend expects camelCase
                'pst_total': expense_dict.get('pst_total', 0),
                'pstTotal': expense_dict.get('pst_total', 0),  # Frontend expects camelCase
                'line_items': line_items,
                'lineItems': line_items,  # Frontend expects camelCase
                'notes': expense_dict.get('notes', ''),
                'photos': photos,
                'user_id': expense_dict.get('user_id'),
                'project_id': expense_dict.get('project_id'),
                'created_at': expense_dict.get('created_at'),
                'updated_at': expense_dict.get('updated_at')
            }
            mapped_expenses.append(mapped_expense)
        
        print(f"DEBUG: Returning {len(mapped_expenses)} expenses with proper field mapping")
        return jsonify(mapped_expenses)
        
    except Exception as e:
        print(f"ERROR getting expenses: {e}")
        return jsonify({'error': 'Failed to get expenses'}), 500

@app.route('/expenses', methods=['POST'])
@require_auth
def create_expense():
    """Create new expense - MATCHES QUOTES PATTERN"""
    data = request.get_json()
    
    print(f"DEBUG: Expense creation data received: {data}")
    
    # FIXED: Handle all frontend field names and map to database fields
    description = data.get('description', '')
    amount = data.get('amount', 0)
    category = data.get('category', '')
    expense_date = data.get('expense_date') or data.get('date', '')
    vendor = data.get('vendor', '')
    receipt_number = data.get('receipt_number') or data.get('receiptNumber', '')
    subtotal = data.get('subtotal', 0)
    gst_total = data.get('gst_total') or data.get('gstTotal', 0)
    pst_total = data.get('pst_total') or data.get('pstTotal', 0)
    line_items = data.get('line_items') or data.get('lineItems', [])
    notes = data.get('notes', '')
    photos = data.get('photos', [])
    
    if not description:
        print("DEBUG: No description provided")
        return jsonify({'error': 'Description required'}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        expense_id = f"{request.current_user}_{datetime.datetime.utcnow().timestamp()}"
        
        # FIXED: Store ALL fields in database (MATCHES QUOTES PATTERN)
        cursor.execute("""
            INSERT INTO expenses (
                id, user_id, project_id, description, amount, category, 
                expense_date, vendor, receipt_number, subtotal, gst_total, 
                pst_total, line_items, notes, photos, created_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (
            expense_id,
            request.current_user,
            data.get('project_id'),
            description,
            amount,
            category,
            expense_date if expense_date else None,
            vendor,
            receipt_number,
            subtotal,
            gst_total,
            pst_total,
            json.dumps(line_items),
            notes,
            json.dumps(photos),
            datetime.datetime.utcnow()
        ))
        
        expense = cursor.fetchone()
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print(f"DEBUG: Expense created successfully with all fields: {expense['id']}")
        return jsonify(dict(expense))
        
    except Exception as e:
        print(f"ERROR creating expense: {e}")
        return jsonify({'error': 'Failed to create expense'}), 500

# PUT endpoint for updating expenses (MATCHES QUOTES PATTERN)
@app.route('/expenses/<expense_id>', methods=['PUT'])
@require_auth
def update_expense(expense_id):
    """Update existing expense - MATCHES QUOTES PATTERN"""
    data = request.get_json()
    
    print(f"DEBUG: Expense update data received for ID {expense_id}: {data}")
    
    # FIXED: Handle all frontend field names and map to database fields
    description = data.get('description', '')
    amount = data.get('amount', 0)
    category = data.get('category', '')
    expense_date = data.get('expense_date') or data.get('date', '')
    vendor = data.get('vendor', '')
    receipt_number = data.get('receipt_number') or data.get('receiptNumber', '')
    subtotal = data.get('subtotal', 0)
    gst_total = data.get('gst_total') or data.get('gstTotal', 0)
    pst_total = data.get('pst_total') or data.get('pstTotal', 0)
    line_items = data.get('line_items') or data.get('lineItems', [])
    notes = data.get('notes', '')
    photos = data.get('photos', [])
    
    if not description:
        print("DEBUG: No description provided")
        return jsonify({'error': 'Description required'}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # First, verify the expense exists and belongs to the current user
        cursor.execute("SELECT id FROM expenses WHERE id = %s AND user_id = %s", (expense_id, request.current_user))
        existing_expense = cursor.fetchone()
        
        if not existing_expense:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Expense not found or access denied'}), 404
        
        # Update ALL fields in database (MATCHES QUOTES PATTERN)
        cursor.execute("""
            UPDATE expenses SET 
                description = %s,
                amount = %s,
                category = %s,
                expense_date = %s,
                vendor = %s,
                receipt_number = %s,
                subtotal = %s,
                gst_total = %s,
                pst_total = %s,
                line_items = %s,
                notes = %s,
                photos = %s,
                updated_at = %s
            WHERE id = %s AND user_id = %s
            RETURNING *
        """, (
            description,
            amount,
            category,
            expense_date if expense_date else None,
            vendor,
            receipt_number,
            subtotal,
            gst_total,
            pst_total,
            json.dumps(line_items),
            notes,
            json.dumps(photos),
            datetime.datetime.utcnow(),
            expense_id,
            request.current_user
        ))
        
        updated_expense = cursor.fetchone()
        
        conn.commit()
        cursor.close()
        conn.close()
        
        if updated_expense:
            print(f"DEBUG: Expense updated successfully: {expense_id}")
            return jsonify(dict(updated_expense))
        else:
            return jsonify({'error': 'Failed to update expense'}), 500
        
    except Exception as e:
        print(f"ERROR updating expense: {e}")
        return jsonify({'error': 'Failed to update expense'}), 500

# DELETE endpoint for expenses (MATCHES QUOTES PATTERN)
@app.route('/expenses/<expense_id>', methods=['DELETE'])
@require_auth
def delete_expense(expense_id):
    """Delete expense - MATCHES QUOTES PATTERN"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verify the expense exists and belongs to the current user before deleting
        cursor.execute("SELECT id FROM expenses WHERE id = %s AND user_id = %s", (expense_id, request.current_user))
        existing_expense = cursor.fetchone()
        
        if not existing_expense:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Expense not found or access denied'}), 404
        
        # Delete the expense
        cursor.execute("DELETE FROM expenses WHERE id = %s AND user_id = %s", (expense_id, request.current_user))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print(f"DEBUG: Expense deleted successfully: {expense_id}")
        return jsonify({'message': 'Expense deleted successfully'})
        
    except Exception as e:
        print(f"ERROR deleting expense: {e}")
        return jsonify({'error': 'Failed to delete expense'}), 500

# File upload route for expense photos (MATCHES QUOTES PATTERN)
@app.route('/expenses/upload-photo', methods=['POST'])
@require_auth
def upload_expense_photo():
    """Upload photo for expense - SECURE FILE HANDLING"""
    try:
        if 'photo' not in request.files:
            return jsonify({'error': 'No photo file provided'}), 400
        
        file = request.files['photo']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Validate file type
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
        if not ('.' in file.filename and 
                file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
            return jsonify({'error': 'Invalid file type. Only images allowed.'}), 400
        
        if file:
            # Secure the filename
            filename = secure_filename(file.filename)
            timestamp = datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')
            user_prefix = request.current_user.replace('@', '_').replace('.', '_')
            filename = f"{user_prefix}_{timestamp}_{filename}"
            
            # Ensure upload directory exists
            os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
            
            # Save the file
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            
            return jsonify({
                'filename': filename,
                'path': file_path,
                'url': f'/uploads/{filename}'
            })
        
    except Exception as e:
        print(f"ERROR uploading expense photo: {e}")
        return jsonify({'error': 'Failed to upload photo'}), 500

# Tank deposit routes (UPDATED FOR FRONTEND INTEGRATION)
@app.route('/tank-deposits', methods=['GET'])
@require_auth
def get_tank_deposits():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM tank_deposits WHERE user_id = %s ORDER BY deposit_date DESC", (request.current_user,))
        deposits = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify([dict(deposit) for deposit in deposits])
        
    except Exception as e:
        print(f"ERROR getting tank deposits: {e}")
        return jsonify({'error': 'Failed to get tank deposits'}), 500

@app.route('/tank-deposits', methods=['POST'])
@require_auth
def create_tank_deposit():
    """Create new tank deposit - MATCHES EXPENSES PATTERN"""
    data = request.get_json()
    
    print(f"DEBUG: Tank deposit creation data received: {data}")
    
    # Handle all frontend field names and map to database fields
    client = data.get('client', '')
    project = data.get('project', '')
    tank_type = data.get('tank_type', '')
    deposit_amount = data.get('deposit_amount', 0)
    
    # Ensure deposit_amount is a valid number
    try:
        deposit_amount = float(deposit_amount) if deposit_amount is not None else 0.0
    except (ValueError, TypeError):
        deposit_amount = 0.0
    
    deposit_date = data.get('deposit_date', '')
    return_date = data.get('return_date', '')
    status = data.get('status', 'Active')
    notes = data.get('notes', '')
    image = data.get('image', '')
    
    if not client:
        print("DEBUG: No client provided")
        return jsonify({'error': 'Client required'}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        deposit_id = f"{request.current_user}_{datetime.datetime.utcnow().timestamp()}"
        
        # Store ALL fields in database (MATCHES EXPENSES PATTERN)
        cursor.execute("""
            INSERT INTO tank_deposits (
                id, user_id, project_id, client, project, tank_type, 
                amount, deposit_date, return_date, status, 
                image, notes, created_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (
            deposit_id,
            request.current_user,
            data.get('project_id'),
            client,
            project,
            tank_type,
            deposit_amount,  # This goes to 'amount' column
            deposit_date if deposit_date else None,
            return_date if return_date else None,
            status,
            image,
            notes,
            datetime.datetime.utcnow()
        ))
        
        deposit = cursor.fetchone()
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print(f"DEBUG: Tank deposit created successfully: {deposit['id']}")
        return jsonify(dict(deposit))
        
    except Exception as e:
        print(f"ERROR creating tank deposit: {e}")
        return jsonify({'error': 'Failed to create tank deposit'}), 500

@app.route('/tank-deposits/<deposit_id>', methods=['PUT'])
@require_auth
def update_tank_deposit(deposit_id):
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    try:
        # Handle deposit_amount properly to prevent None errors
        deposit_amount = data.get('deposit_amount', 0)
        try:
            deposit_amount = float(deposit_amount) if deposit_amount is not None else 0.0
        except (ValueError, TypeError):
            deposit_amount = 0.0
        
        # Handle project_id properly - set to NULL if empty
        project_id = data.get('project_id', '')
        if not project_id or project_id.strip() == '':
            project_id = None
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE tank_deposits 
            SET client = %s, project_id = %s, project = %s, tank_type = %s, amount = %s, 
                deposit_date = %s, return_date = %s, status = %s, image = %s
            WHERE id = %s AND user_id = %s
            RETURNING *
        """, (
            data.get('client', ''),
            project_id,  # Use the properly handled project_id
            data.get('project', ''),
            data.get('tank_type', ''),
            deposit_amount,  # Use the safely converted amount
            data.get('deposit_date'),
            data.get('return_date'),
            data.get('status', 'Active'),
            data.get('image', ''),
            deposit_id,
            request.current_user
        ))
        
        deposit = cursor.fetchone()
        
        if not deposit:
            return jsonify({'error': 'Tank deposit not found'}), 404
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify(dict(deposit))
        
    except Exception as e:
        print(f"ERROR updating tank deposit: {e}")
        return jsonify({'error': 'Failed to update tank deposit'}), 500

@app.route('/tank-deposits/<deposit_id>', methods=['DELETE'])
@require_auth
def delete_tank_deposit(deposit_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM tank_deposits WHERE id = %s AND user_id = %s", (deposit_id, request.current_user))
        
        if cursor.rowcount == 0:
            return jsonify({'error':