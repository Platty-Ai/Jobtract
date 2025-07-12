from flask import Flask, request, jsonify
from flask_cors import CORS
import hashlib
import jwt
import datetime
import time
import requests
from fpdf import FPDF
from fpdf.enums import XPos, YPos
import os
import base64
# OCR import will be done at function level

# Bulletproof ID generation system
import uuid
import threading
from typing import Dict, Any

# Bulletproof Input Validation System
import re
import datetime
from decimal import Decimal, InvalidOperation
import html

class ValidationError(Exception):
    """Custom exception for validation errors"""
    def __init__(self, message: str, field: str = None, errors: Dict = None):
        self.message = message
        self.field = field
        self.errors = errors or {}
        super().__init__(self.message)

class InputValidator:
    """Bulletproof input validator with comprehensive checks"""
    
    @staticmethod
    def sanitize_string(value: Any, max_length: int = 1000) -> str:
        """Sanitize string input to prevent XSS and injection attacks"""
        if value is None:
            return ""
        
        if not isinstance(value, (str, int, float)):
            raise ValidationError(f"Expected string, got {type(value).__name__}")
        
        sanitized = str(value).strip()
        
        if len(sanitized) > max_length:
            raise ValidationError(f"String too long. Maximum {max_length} characters allowed")
        
        sanitized = html.escape(sanitized)
        sanitized = re.sub(r'[<>"\']', '', sanitized)
        
        return sanitized
    
    @staticmethod
    def validate_required_string(value: Any, field_name: str, max_length: int = 1000) -> str:
        """Validate required string field"""
        if value is None or value == "":
            raise ValidationError(f"{field_name} is required")
        
        return InputValidator.sanitize_string(value, max_length)
    
    @staticmethod
    def validate_optional_string(value: Any, max_length: int = 1000) -> str:
        """Validate optional string field"""
        if value is None:
            return ""
        
        return InputValidator.sanitize_string(value, max_length)
    
    @staticmethod
    def validate_amount(value: Any, field_name: str = "amount") -> float:
        """Validate monetary amount"""
        if value is None:
            raise ValidationError(f"{field_name} is required")
        
        try:
            if isinstance(value, str):
                cleaned = re.sub(r'[$,\s]', '', value)
                amount = float(cleaned)
            else:
                amount = float(value)
            
            if amount < 0:
                raise ValidationError(f"{field_name} cannot be negative")
            
            if amount > 1000000:
                raise ValidationError(f"{field_name} exceeds maximum allowed ($1,000,000)")
            
            return round(amount, 2)
            
        except (ValueError, TypeError, InvalidOperation):
            raise ValidationError(f"{field_name} must be a valid number")
    
    @staticmethod
    def validate_date(value: Any, field_name: str = "date") -> str:
        """Validate date string"""
        if value is None:
            raise ValidationError(f"{field_name} is required")
        
        if not isinstance(value, str):
            raise ValidationError(f"{field_name} must be a string in YYYY-MM-DD format")
        
        if not re.match(r'^\d{4}-\d{2}-\d{2}$', value):
            raise ValidationError(f"{field_name} must be in YYYY-MM-DD format")
        
        try:
            parsed_date = datetime.datetime.strptime(value, '%Y-%m-%d')
            
            min_date = datetime.datetime(1900, 1, 1)
            max_date = datetime.datetime(2100, 12, 31)
            
            if parsed_date < min_date or parsed_date > max_date:
                raise ValidationError(f"{field_name} must be between 1900-01-01 and 2100-12-31")
            
            return value
            
        except ValueError:
            raise ValidationError(f"{field_name} is not a valid date")

class ExpenseValidator:
    """Specific validator for expense data"""
    
    @staticmethod
    def validate_expense_data(data: Dict) -> Dict:
        """Validate complete expense data"""
        if not isinstance(data, dict):
            raise ValidationError("Request body must be a JSON object")
        
        try:
            validated = {
                'description': InputValidator.validate_required_string(
                    data.get('description'), 'Description', 500
                ),
                'amount': InputValidator.validate_amount(data.get('amount')),
                'date': InputValidator.validate_date(data.get('date')),
                'category': InputValidator.validate_optional_string(
                    data.get('category'), 50
                ) or 'Other',
                'vendor': InputValidator.validate_optional_string(
                    data.get('vendor'), 200
                ),
                'project': InputValidator.validate_optional_string(
                    data.get('project'), 200
                ),
                'project_id': InputValidator.validate_optional_string(
                    data.get('project_id'), 100
                ),
                'receipt_number': InputValidator.validate_optional_string(
                    data.get('receipt_number'), 100
                ),
                'payment_method': InputValidator.validate_optional_string(
                    data.get('payment_method'), 50
                ),
                'status': InputValidator.validate_optional_string(
                    data.get('status'), 50
                ) or 'Pending',
                'notes': InputValidator.validate_optional_string(
                    data.get('notes'), 1000
                ),
                'photo_path': InputValidator.validate_optional_string(
                    data.get('photo_path'), 500
                ),
                'line_items': data.get('line_items', []),
                'subtotal': InputValidator.validate_amount(
                    data.get('subtotal', 0), 'Subtotal'
                ) if data.get('subtotal') is not None else 0,
                'taxes': data.get('taxes', [])
            }
            
            return validated
            
        except ValidationError:
            raise
        except Exception as e:
            raise ValidationError(f"Validation error: {str(e)}")

def validate_expense_request(func):
    """Decorator to validate expense requests"""
    def wrapper(*args, **kwargs):
        try:
            if not request.is_json:
                return jsonify({
                    'error': 'Content-Type must be application/json'
                }), 400
            
            data = request.get_json()
            
            if data is None:
                return jsonify({
                    'error': 'Invalid JSON in request body'
                }), 400
            
            validated_data = ExpenseValidator.validate_expense_data(data)
            request.validated_data = validated_data
            
            return func(*args, **kwargs)
            
        except ValidationError as e:
            return jsonify({
                'error': 'Validation failed',
                'message': e.message,
                'field': e.field
            }), 400
        except Exception as e:
            return jsonify({
                'error': 'Server error during validation',
                'details': str(e)
            }), 500
    
    wrapper.__name__ = func.__name__
    return wrapper

# Thread-safe ID generator
class ThreadSafeIDGenerator:
    """Thread-safe ID generator that prevents race conditions."""
    
    def __init__(self):
        self._lock = threading.RLock()
        
    def generate_uuid(self) -> str:
        """Generate a unique UUID4 string."""
        return str(uuid.uuid4())
    
    def add_item_with_id(self, data_list: list, new_item: dict) -> dict:
        """Thread-safely add an item with UUID."""
        with self._lock:
            new_item['id'] = self.generate_uuid()
            data_list.append(new_item)
            return new_item

# Thread-safe data manager
class ThreadSafeDataManager:
    """Thread-safe manager for all data operations."""
    
    def __init__(self):
        self._lock = threading.RLock()
    
    def safe_delete(self, data_list: list, item_id: str) -> bool:
        """Thread-safely delete an item by ID."""
        with self._lock:
            original_length = len(data_list)
            data_list[:] = [item for item in data_list if item.get('id') != item_id]
            return len(data_list) < original_length
    
    def safe_update(self, data_list: list, item_id: str, update_data: dict) -> dict:
        """Thread-safely update an item by ID."""
        with self._lock:
            for item in data_list:
                if item.get('id') == item_id:
                    item.update(update_data)
                    return item
            return None

# Global instances
id_generator = ThreadSafeIDGenerator()
data_manager = ThreadSafeDataManager()

app = Flask(__name__)
CORS(app)

# JWT configuration
JWT_SECRET = 'your-secret-key-change-in-production'
JWT_ALGORITHM = 'HS256'

# Vancouver API Configuration
VANCOUVER_API_BASE_URL = 'https://vancouver.aws-ec2-ca-central-1.opendatasoft.com/api/explore/v2.1/catalog/datasets/issued-building-permits'

# Simple caching mechanism for API responses
api_cache = {}
CACHE_DURATION = 300  # 5 minutes

def cache_response(key, data, duration=CACHE_DURATION):
    """Cache API response with expiration"""
    api_cache[key] = {
        'data': data,
        'timestamp': time.time(),
        'expires_at': time.time() + duration
    }

def get_cached_response(key):
    """Get cached response if still valid"""
    if key in api_cache:
        cached = api_cache[key]
        if time.time() < cached['expires_at']:
            return cached['data']
        else:
            # Remove expired cache
            del api_cache[key]
    return None

def make_vancouver_api_request_with_pagination(endpoint, params=None, max_records=1000):
    """
    Make paginated requests to Vancouver API to get more than 100 records
    """
    all_results = []
    offset = 0
    batch_size = 100
    
    while len(all_results) < max_records:
        # Prepare parameters for this batch
        batch_params = params.copy() if params else {}
        batch_params['rows'] = min(batch_size, max_records - len(all_results))
        batch_params['start'] = offset
        
        try:
            # Make API request for this batch
            data = make_vancouver_api_request(endpoint, batch_params)
            
            if not data or 'results' not in data:
                break
                
            batch_results = data.get('results', [])
            
            # If no more results, we've reached the end
            if not batch_results:
                break
                
            all_results.extend(batch_results)
            
            # If we got fewer results than requested, we've reached the end
            if len(batch_results) < batch_size:
                break
                
            offset += batch_size
            
        except Exception as e:
            print(f"Error in pagination batch at offset {offset}: {str(e)}")
            break
    
    return {
        'results': all_results,
        'total_count': len(all_results)
    }

def make_vancouver_api_request(endpoint, params=None):
    """
    Make a robust request to Vancouver API with error handling and caching
    """
    try:
        # Create cache key
        cache_key = f"{endpoint}_{str(params)}"
        
        # Check cache first
        cached_response = get_cached_response(cache_key)
        if cached_response:
            return cached_response
        
        # Make API request
        url = f"{VANCOUVER_API_BASE_URL}/{endpoint}"
        
        # Set default parameters
        if params is None:
            params = {}
        
        # Add default rows if not specified (Vancouver API uses 'rows' not 'limit')
        # Vancouver now limits to maximum 100 records per request
        if 'rows' not in params and 'limit' not in params:
            params['rows'] = 100
        elif 'rows' in params:
            # Ensure rows doesn't exceed 100
            params['rows'] = min(int(params['rows']), 100)
        elif 'limit' in params:
            # Convert limit to rows and ensure it doesn't exceed 100
            params['rows'] = min(int(params['limit']), 100)
            del params['limit']
        
        print(f"Making Vancouver API request to: {url}")
        print(f"With parameters: {params}")
            
        response = requests.get(url, params=params, timeout=30)
        
        print(f"Vancouver API response status: {response.status_code}")
        print(f"Vancouver API response headers: {dict(response.headers)}")
        
        if not response.ok:
            print(f"Vancouver API error response: {response.text}")
        
        response.raise_for_status()
        
        data = response.json()
        
        # Cache successful response
        cache_response(cache_key, data)
        
        return data
        
    except requests.exceptions.Timeout:
        print("Vancouver API request timed out")
        raise Exception("Vancouver API request timed out")
    except requests.exceptions.ConnectionError as e:
        print(f"Failed to connect to Vancouver API: {str(e)}")
        raise Exception("Failed to connect to Vancouver API")
    except requests.exceptions.HTTPError as e:
        print(f"Vancouver API HTTP error: {e.response.status_code} - {e.response.text}")
        if e.response.status_code == 400:
            raise Exception("Invalid request parameters for Vancouver API")
        elif e.response.status_code == 404:
            raise Exception("Vancouver API endpoint not found")
        elif e.response.status_code >= 500:
            raise Exception("Vancouver API server error")
        else:
            raise Exception(f"Vancouver API error: {e.response.status_code}")
    except Exception as e:
        print(f"Unexpected error in Vancouver API request: {str(e)}")
        raise Exception(f"Vancouver API request failed: {str(e)}")

# Simple password hashing function
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

# Sample users database
users = {
    'test@contractor.com': {
        'id': 1,
        'email': 'test@contractor.com',
        'username': 'Test Contractor',
        'password': hash_password('NewTestPass456'),
        'company_name': 'ABC Construction',
        'business_type': 'General Contractor'
    }
}

# Sample equipment data - Updated with all required fields
equipment_data = [
    {
        'id': 1,
        'name': 'CAT 320 Excavator',
        'type': 'Heavy Equipment',
        'model': 'CAT 320DL',
        'serial_number': 'CAT123456789',
        'purchase_date': '2023-01-15',
        'purchase_price': '250000',
        'status': 'Available',
        'location': 'Yard A',
        'last_maintenance': '2024-01-15',
        'next_maintenance': '2024-07-15',
        'maintenance_notes': 'Regular service completed',
        'operator': 'John Smith',
        'fuel_type': 'Diesel',
        'hours_operated': '1250',
        'insurance_expiry': '2024-12-31',
        'registration': 'BC-EQ-001',
        'condition': 'Good',
        'warranty_expiry': '2025-01-15',
        'supplier': 'CAT Dealer Vancouver',
        'notes': 'Primary excavator for large projects'
    },
    {
        'id': 2,
        'name': 'Ford F-350 Truck',
        'type': 'Vehicle',
        'model': 'Ford F-350 Super Duty',
        'serial_number': 'FORD987654321',
        'purchase_date': '2023-03-20',
        'purchase_price': '75000',
        'status': 'In Use',
        'location': 'Site B',
        'last_maintenance': '2024-02-10',
        'next_maintenance': '2024-08-10',
        'maintenance_notes': 'Oil change and tire rotation',
        'operator': 'Mike Johnson',
        'fuel_type': 'Diesel',
        'hours_operated': '850',
        'insurance_expiry': '2024-11-30',
        'registration': 'BC-TR-002',
        'condition': 'Excellent',
        'warranty_expiry': '2026-03-20',
        'supplier': 'Ford Dealer Richmond',
        'notes': 'Company truck for site visits'
    }
]

# Sample expenses data
expenses_data = [
    {
        'id': 1,
        'date': '2024-01-15',
        'category': 'Fuel',
        'amount': 250.50,
        'description': 'Diesel fuel for excavator',
        'project': 'Downtown Office Building',
        'receipt_number': 'REC-001',
        'vendor': 'Shell Gas Station',
        'payment_method': 'Company Credit Card',
        'status': 'Approved',
        'notes': 'Regular fuel purchase'
    },
    {
        'id': 2,
        'date': '2024-01-20',
        'category': 'Materials',
        'amount': 1500.00,
        'description': 'Concrete supplies',
        'project': 'Residential Complex',
        'receipt_number': 'REC-002',
        'vendor': 'ABC Concrete Supply',
        'payment_method': 'Check',
        'status': 'Pending',
        'notes': 'Foundation materials'
    }
]

# Sample tank deposits data
tank_deposits_data = [
    {
        'id': 1,
        'date': '2024-01-10',
        'amount': 500.00,
        'gas_type': 'Regular',
        'customer_name': 'City Construction',
        'tank_size': '100L',
        'po_number': 'PO-2024-001',
        'photo_path': '/uploads/tank1.jpg',
        'notes': 'Initial deposit for project'
    }
]

# Sample quotes data
quotes_data = [
    {
        'id': 1,
        'client': 'Vancouver Housing Corp',
        'project': 'Apartment Complex Renovation',
        'amount': 150000.00,
        'status': 'Pending',
        'date': '2024-01-25',
        'valid_until': '2024-02-25'
    }
]

# Sample purchase orders data
purchase_orders_data = [
    {
        'id': 1,
        'supplier': 'Steel Supply Co',
        'description': 'Structural steel beams',
        'amount': 25000.00,
        'status': 'Ordered',
        'order_date': '2024-01-30',
        'delivery_date': '2024-02-15'
    }
]

# Sample projects data
projects_data = [
    {
        'id': 1,
        'name': 'Downtown Office Building',
        'client': 'Metro Development',
        'status': 'In Progress',
        'start_date': '2024-01-01',
        'end_date': '2024-06-30',
        'budget': 500000.00,
        'spent': 125000.00,
        'progress': 25,
        'description': 'Construction of 5-story office building',
        'location': '123 Main St, Vancouver',
        'project_manager': 'John Smith',
        'notes': 'On schedule and within budget'
    },
    {
        'id': 2,
        'name': 'Residential Complex',
        'client': 'Family Homes Ltd',
        'status': 'Planning',
        'start_date': '2024-03-01',
        'end_date': '2024-12-31',
        'budget': 750000.00,
        'spent': 0.00,
        'progress': 0,
        'description': 'Multi-unit residential development',
        'location': '456 Oak Ave, Burnaby',
        'project_manager': 'Sarah Johnson',
        'notes': 'Awaiting permits'
    }
]

# Sample invoices data with comprehensive fields
invoices_data = [
    {
        'id': 1,
        'invoice_number': 'INV-2024-001',
        'customer_name': 'Metro Development',
        'customer_email': 'billing@metrodev.com',
        'customer_address': '123 Business St\nVancouver, BC V6B 1A1',
        'invoice_date': '2024-01-15',
        'due_date': '2024-02-14',
        'status': 'Sent',
        'subtotal': 10000.00,
        'gst_rate': 5.0,
        'gst_amount': 500.00,
        'pst_rate': 7.0,
        'pst_amount': 700.00,
        'total_amount': 11200.00,
        'tax_exempt': False,
        'band_name': '',
        'band_number': '',
        'project': 'Downtown Office Building',
        'notes': 'Monthly progress billing',
        'line_items': [
            {
                'description': 'Excavation work',
                'quantity': 40,
                'unit_price': 150.00,
                'total': 6000.00,
                'delivery_address': ''
            },
            {
                'description': 'Foundation preparation',
                'quantity': 20,
                'unit_price': 200.00,
                'total': 4000.00,
                'delivery_address': '123 Main St, Vancouver'
            }
        ]
    },
    {
        'id': 2,
        'invoice_number': 'INV-2024-002',
        'customer_name': 'First Nations Construction Ltd',
        'customer_email': 'accounts@fnconstruction.ca',
        'customer_address': '789 Reserve Rd\nNorth Vancouver, BC V7M 2K5',
        'invoice_date': '2024-01-20',
        'due_date': '2024-02-19',
        'status': 'Paid',
        'subtotal': 15000.00,
        'gst_rate': 0.0,
        'gst_amount': 0.00,
        'pst_rate': 0.0,
        'pst_amount': 0.00,
        'total_amount': 15000.00,
        'tax_exempt': True,
        'band_name': 'Squamish Nation',
        'band_number': 'SN-2024-789',
        'project': 'Community Center',
        'notes': 'Tax exempt - First Nations project',
        'line_items': [
            {
                'description': 'Site preparation',
                'quantity': 50,
                'unit_price': 180.00,
                'total': 9000.00,
                'delivery_address': '789 Reserve Rd, North Vancouver'
            },
            {
                'description': 'Equipment rental',
                'quantity': 30,
                'unit_price': 200.00,
                'total': 6000.00,
                'delivery_address': ''
            }
        ]
    }
]

# Authentication middleware
def token_required(f):
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            
            data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            current_user_id = data['user_id']
            
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is invalid'}), 401
        
        return f(current_user_id, *args, **kwargs)
    
    decorated.__name__ = f.__name__
    return decorated

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'message': 'Jobtract API is running',
        'timestamp': datetime.datetime.now().isoformat(),
        'environment': 'production'
    })

# Authentication endpoints
@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        user = users.get(email)
        if not user or user['password'] != hash_password(password):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Generate JWT token
        token_payload = {
            'user_id': user['id'],
            'email': user['email'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }
        
        token = jwt.encode(token_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        
        return jsonify({
            'token': token,
            'user': {
                'id': user['id'],
                'email': user['email'],
                'username': user['username'],
                'company_name': user['company_name'],
                'business_type': user['business_type']
            }
        })
        
    except Exception as e:
        return jsonify({'error': 'Login failed', 'details': str(e)}), 500

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    return jsonify({'message': 'Logged out successfully'})

@app.route('/api/auth/profile', methods=['GET'])
@token_required
def get_profile(current_user_id):
    try:
        user = next((u for u in users.values() if u['id'] == current_user_id), None)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'id': user['id'],
            'email': user['email'],
            'username': user['username'],
            'company_name': user['company_name'],
            'business_type': user['business_type']
        })
    except Exception as e:
        return jsonify({'error': 'Failed to get profile', 'details': str(e)}), 500

# Vancouver Permits API endpoints
@app.route('/api/vancouver/permits/filters', methods=['GET'])
def get_vancouver_permit_filters():
    """
    Get filter options for Vancouver permits from the real API
    """
    try:
        # Fetch a larger sample of permits using pagination to extract filter options
        data = make_vancouver_api_request_with_pagination('records', {}, max_records=1000)
        
        permits = data.get('results', [])
        
        if not permits:
            return jsonify({'error': 'No permit data available'}), 404
        
        # Extract unique values for filters with safe handling
        geographic_areas = set()
        work_types = set()
        property_uses = set()
        specific_uses = set()
        years = set()
        
        # Always include years 2021-2025 regardless of data availability
        years = {2025, 2024, 2023, 2022, 2021}
        
        # Extract filter options from permit data
        for permit in permits:
            # Geographic areas - correct field name is 'geolocalarea'
            if permit.get('geolocalarea'):
                geographic_areas.add(permit['geolocalarea'])
            
            # Work types - correct field name is 'typeofwork'
            if permit.get('typeofwork'):
                work_types.add(permit['typeofwork'])
            
            # Property uses - handle both string and array
            property_use = permit.get('propertyuse', [])
            if isinstance(property_use, list):
                property_uses.update(property_use)
            elif property_use:
                property_uses.add(property_use)
            
            # Specific uses - handle both string and array
            specific_use = permit.get('specificusecategory', [])
            if isinstance(specific_use, list):
                specific_uses.update(specific_use)
            elif specific_use:
                specific_uses.add(specific_use)
            
            # Years from issue date - already set above, but add any additional years found in data
            if permit.get('issuedate'):
                try:
                    year = permit['issuedate'][:4]
                    if year.isdigit():
                        year_int = int(year)
                        # Only include years 2021-2025
                        if 2021 <= year_int <= 2025:
                            years.add(year_int)
                except:
                    pass
        
        return jsonify({
            'geographic_areas': sorted(list(geographic_areas)),
            'work_types': sorted(list(work_types)),
            'property_uses': sorted(list(property_uses)),
            'specific_uses': sorted(list(specific_uses)),
            'years': sorted(list(years), reverse=True)
        })
        
    except Exception as e:
        app.logger.error(f"Error in get_vancouver_permit_filters: {str(e)}")
        
        # Return fallback filter options when API is unavailable
        return jsonify({
            'geographic_areas': [
                'Downtown', 'West End', 'Kitsilano', 'Mount Pleasant', 'Fairview',
                'Grandview-Woodland', 'Hastings-Sunrise', 'Kensington-Cedar Cottage',
                'Renfrew-Collingwood', 'Riley Park', 'South Cambie', 'Victoria-Fraserview',
                'West Point Grey', 'Arbutus Ridge', 'Dunbar-Southlands', 'Kerrisdale',
                'Marpole', 'Oakridge', 'Shaughnessy', 'Sunset'
            ],
            'work_types': [
                'New Building', 'Addition / Alteration', 'Demolition', 'Change of Occupancy',
                'Repair', 'Foundation Only', 'Temporary Building', 'Sign'
            ],
            'property_uses': [
                'Dwelling Uses', 'Commercial Uses', 'Industrial Uses', 'Institutional Uses',
                'Assembly Uses', 'Mercantile Uses', 'Office Uses', 'Parking Uses'
            ],
            'specific_uses': [
                'One-Family Dwelling', 'Two-Family Dwelling', 'Multiple Dwelling',
                'Retail Store', 'Office', 'Restaurant', 'Warehouse', 'Manufacturing'
            ],
            'years': [2025, 2024, 2023, 2022, 2021],
            'note': 'Vancouver API temporarily unavailable - showing cached filter options'
        })

@app.route('/api/vancouver/permits/search', methods=['GET'])
def search_vancouver_permits():
    """
    Search Vancouver permits using the real API with filters
    """
    try:
        # Get query parameters
        search_term = request.args.get('search', '')
        geographic_area = request.args.get('geographic_area', '')
        work_type = request.args.get('work_type', '')
        property_use = request.args.get('property_use', '')
        specific_use = request.args.get('specific_use', '')
        year = request.args.get('year', '')
        limit = request.args.get('limit', '1000')
        
        # Build API parameters for pagination
        params = {}
        
        # Build where clause for filters
        where_conditions = []
        
        if geographic_area:
            where_conditions.append(f'geolocalarea="{geographic_area}"')
        
        if work_type:
            where_conditions.append(f'typeofwork="{work_type}"')
        
        if year:
            where_conditions.append(f'issueyear="{year}"')
        else:
            # Default to recent years (2021-2025) to limit results and improve performance
            where_conditions.append('issueyear IN ("2021", "2022", "2023", "2024", "2025")')
        
        # Add search term if provided
        if search_term:
            params['q'] = search_term
        
        # Add where clause if we have conditions
        if where_conditions:
            params['where'] = ' AND '.join(where_conditions)
        
        # Add sorting by issue date (newest first)
        params['order_by'] = 'issuedate DESC'
        
        # Make API request
        data = make_vancouver_api_request('records', params)
        
        permits = data.get('results', [])
        total_count = data.get('total_count', 0)
        
        # Transform the data to match frontend expectations
        transformed_permits = []
        for permit in permits:
            # Handle property_use and specific_use arrays safely
            property_use_list = permit.get('propertyuse', [])
            if not isinstance(property_use_list, list):
                property_use_list = [property_use_list] if property_use_list else []
            
            specific_use_list = permit.get('specificusecategory', [])
            if not isinstance(specific_use_list, list):
                specific_use_list = [specific_use_list] if specific_use_list else []
            
            transformed_permit = {
                'permit_number': permit.get('permitnumber', ''),
                'issue_date': permit.get('issuedate', ''),
                'geographic_area': permit.get('geolocalarea', ''),
                'type_of_work': permit.get('typeofwork', ''),
                'property_use': property_use_list,
                'specific_use': specific_use_list,
                'address': permit.get('address', ''),
                'applicant': permit.get('applicant', ''),
                'project_value': permit.get('projectvalue', 0),
                'description': permit.get('projectdescription', ''),
                'year': permit.get('issueyear', '')
            }
            transformed_permits.append(transformed_permit)
        
        return jsonify({
            'permits': transformed_permits,
            'total_count': total_count
        })
        
    except Exception as e:
        app.logger.error(f"Error in search_vancouver_permits: {str(e)}")
        return jsonify({
            'error': 'Failed to search Vancouver permits',
            'details': str(e)
        }), 500

# Equipment endpoints
@app.route('/api/equipment', methods=['GET'])
def get_equipment():
    return jsonify(equipment_data)

@app.route('/api/equipment', methods=['POST'])
def add_equipment():
    try:
        data = request.get_json()
        new_equipment = {
            'name': data.get('name'),
            'type': data.get('type'),
            'model': data.get('model'),
            'serial_number': data.get('serial_number'),
            'purchase_date': data.get('purchase_date'),
            'purchase_price': data.get('purchase_price'),
            'status': data.get('status', 'Available'),
            'location': data.get('location'),
            'last_maintenance': data.get('last_maintenance'),
            'next_maintenance': data.get('next_maintenance'),
            'maintenance_notes': data.get('maintenance_notes'),
            'operator': data.get('operator'),
            'fuel_type': data.get('fuel_type'),
            'hours_operated': data.get('hours_operated'),
            'insurance_expiry': data.get('insurance_expiry'),
            'registration': data.get('registration'),
            'condition': data.get('condition'),
            'warranty_expiry': data.get('warranty_expiry'),
            'supplier': data.get('supplier'),
            'notes': data.get('notes')
        }
        # Use bulletproof thread-safe ID generation
        created_equipment = id_generator.add_item_with_id(equipment_data, new_equipment)
        return jsonify(created_equipment), 201
    except Exception as e:
        return jsonify({'error': 'Failed to add equipment', 'details': str(e)}), 500

@app.route('/api/equipment/<int:equipment_id>', methods=['PUT'])
def update_equipment(equipment_id):
    try:
        data = request.get_json()
        for equipment in equipment_data:
            if equipment['id'] == equipment_id:
                equipment.update(data)
                return jsonify(equipment)
        return jsonify({'error': 'Equipment not found'}), 404
    except Exception as e:
        return jsonify({'error': 'Failed to update equipment', 'details': str(e)}), 500

@app.route('/api/equipment/<int:equipment_id>', methods=['DELETE'])
def delete_equipment(equipment_id):
    try:
        global equipment_data
        equipment_data = [eq for eq in equipment_data if eq['id'] != equipment_id]
        return jsonify({'message': 'Equipment deleted successfully'})
    except Exception as e:
        return jsonify({'error': 'Failed to delete equipment', 'details': str(e)}), 500

# Expenses endpoints
@app.route('/api/expenses', methods=['GET'])
def get_expenses():
    return jsonify(expenses_data)

@app.route('/api/expenses', methods=['POST'])
@validate_expense_request
def add_expense():
    try:
        # Use validated data from the decorator
        validated_data = request.validated_data
        
        # Use bulletproof thread-safe ID generation
        created_expense = id_generator.add_item_with_id(expenses_data, validated_data)
        return jsonify(created_expense), 201
    except Exception as e:
        return jsonify({'error': 'Failed to add expense', 'details': str(e)}), 500

@app.route('/api/@app.route('/api/expenses/<expense_id>', methods=['PUT'])
@validate_expense_request
def update_expense(expense_id):
    try:
        # Use validated data from the decorator
        validated_data = request.validated_data
        
        # Convert expense_id to string for UUID compatibility
        expense_id_str = str(expense_id)
        
        # Use thread-safe update
        updated_expense = data_manager.safe_update(expenses_data, expense_id_str, validated_data)
        
        if updated_expense:
            return jsonify(updated_expense), 200
        else:
            return jsonify({'error': 'Expense not found'}), 404
            
    except Exception as e:
        return jsonify({'error': 'Failed to update expense', 'details': str(e)}), 500d to update expense', 'details': str(e)}), 500

@app.route('/api/expenses/<expense_id>', methods=['DELETE'])
def delete_expense(expense_id):
    try:
        # Convert expense_id to string for UUID compatibility
        expense_id_str = str(expense_id)
        
        # Use thread-safe delete
        deleted = data_manager.safe_delete(expenses_data, expense_id_str)
        
        if deleted:
            return jsonify({'message': 'Expense deleted successfully'})
        else:
            return jsonify({'error': 'Expense not found'}), 404
    except Exception as e:
        return jsonify({'error': 'Failed to delete expense', 'details': str(e)}), 500

# Projects endpoints
@app.route('/api/projects', methods=['GET'])
def get_projects():
    return jsonify(projects_data)

@app.route('/api/projects', methods=['POST'])
def add_project():
    try:
        data = request.get_json()
        new_project = {
            'name': data.get('name'),
            'client': data.get('client'),
            'status': data.get('status', 'Planning'),
            'start_date': data.get('start_date'),
            'end_date': data.get('end_date'),
            'budget': data.get('budget'),
            'spent': data.get('spent', 0),
            'progress': data.get('progress', 0),
            'description': data.get('description'),
            'location': data.get('location'),
            'project_manager': data.get('project_manager'),
            'notes': data.get('notes')
        }
        # Use bulletproof thread-safe ID generation
        created_project = id_generator.add_item_with_id(projects_data, new_project)
        return jsonify(created_project), 201
    except Exception as e:
        return jsonify({'error': 'Failed to add project', 'details': str(e)}), 500

@app.route('/api/projects/<int:project_id>', methods=['PUT'])
def update_project(project_id):
    try:
        data = request.get_json()
        for project in projects_data:
            if project['id'] == project_id:
                project.update(data)
                return jsonify(project)
        return jsonify({'error': 'Project not found'}), 404
    except Exception as e:
        return jsonify({'error': 'Failed to update project', 'details': str(e)}), 500

@app.route('/api/projects/<int:project_id>', methods=['DELETE'])
def delete_project(project_id):
    try:
        global projects_data
        projects_data = [proj for proj in projects_data if proj['id'] != project_id]
        return jsonify({'message': 'Project deleted successfully'})
    except Exception as e:
        return jsonify({'error': 'Failed to delete project', 'details': str(e)}), 500

# Tank Deposits endpoints
@app.route('/api/tank-deposits', methods=['GET'])
def get_tank_deposits():
    return jsonify(tank_deposits_data)

@app.route('/api/tank-deposits', methods=['POST'])
def add_tank_deposit():
    try:
        data = request.get_json()
        new_deposit = {
            'date': data.get('date'),
            'amount': data.get('amount'),
            'gas_type': data.get('gas_type'),
            'customer_name': data.get('customer_name'),
            'tank_size': data.get('tank_size'),
            'po_number': data.get('po_number'),
            'photo_path': data.get('photo_path'),
            'notes': data.get('notes')
        }
        # Use bulletproof thread-safe ID generation
        created_deposit = id_generator.add_item_with_id(tank_deposits_data, new_deposit)
        return jsonify(created_deposit), 201
    except Exception as e:
        return jsonify({'error': 'Failed to add tank deposit', 'details': str(e)}), 500

@app.route('/api/tank-deposits/<int:deposit_id>', methods=['PUT'])
def update_tank_deposit(deposit_id):
    try:
        data = request.get_json()
        for deposit in tank_deposits_data:
            if deposit['id'] == deposit_id:
                deposit.update(data)
                return jsonify(deposit)
        return jsonify({'error': 'Tank deposit not found'}), 404
    except Exception as e:
        return jsonify({'error': 'Failed to update tank deposit', 'details': str(e)}), 500

@app.route('/api/tank-deposits/<int:deposit_id>', methods=['DELETE'])
def delete_tank_deposit(deposit_id):
    try:
        global tank_deposits_data
        tank_deposits_data = [dep for dep in tank_deposits_data if dep['id'] != deposit_id]
        return jsonify({'message': 'Tank deposit deleted successfully'})
    except Exception as e:
        return jsonify({'error': 'Failed to delete tank deposit', 'details': str(e)}), 500

# Tank Deposits OCR processing endpoint
@app.route('/api/tank-deposits/process-receipt', methods=['POST'])
def process_tank_deposit_receipt():
    """Process receipt image for tank deposits using OCR"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Save uploaded file temporarily
        import tempfile
        import os
        
        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, f"tank_deposit_receipt_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg")
        file.save(temp_path)
        
        print(f"DEBUG: Tank deposit file saved to temp path: {temp_path}")
        
        try:
            print("DEBUG: About to import ReceiptOCR for tank deposits")
            # Import and use the same OCR service as expenses
            from receipt_ocr import ReceiptOCR
            
            print("DEBUG: ReceiptOCR imported successfully, creating instance...")
            ocr = ReceiptOCR()
            
            print("DEBUG: ReceiptOCR instance created, calling process_receipt...")
            result = ocr.process_receipt(temp_path)
            
            print(f"DEBUG: Tank deposit OCR processing completed, result: {result}")
            
            # Clean up temp file
            if os.path.exists(temp_path):
                os.remove(temp_path)
                print(f"DEBUG: Cleaned up temp file: {temp_path}")
            
            if result and result.get('success'):
                # Adapt the extracted data for tank deposits
                extracted_data = result['extracted_data']
                
                # Map expense data to tank deposit fields
                tank_deposit_data = {
                    'customer_name': extracted_data.get('vendor', ''),
                    'date': extracted_data.get('date', ''),
                    'amount': extracted_data.get('total', 0),
                    'gas_type': '',  # Will need to be manually selected
                    'tank_size': '',  # May be extracted from line items if present
                    'po_number': '',  # May be extracted if present in receipt
                    'notes': f"Auto-extracted from receipt. Original vendor: {extracted_data.get('vendor', 'Unknown')}"
                }
                
                # Try to extract gas-related information from line items
                if extracted_data.get('line_items'):
                    gas_keywords = ['propane', 'oxygen', 'acetylene', 'nitrogen', 'argon', 'co2', 'helium', 'gas', 'tank']
                    tank_keywords = ['tank', 'cylinder', 'bottle', 'lb', 'cf', 'gallon', 'liter']
                    
                    for item in extracted_data['line_items']:
                        description = item.get('description', '').lower()
                        
                        # Look for gas type
                        for keyword in gas_keywords:
                            if keyword in description:
                                if keyword in ['propane', 'oxygen', 'acetylene', 'nitrogen', 'argon', 'co2', 'helium']:
                                    tank_deposit_data['gas_type'] = keyword.capitalize()
                                    break
                        
                        # Look for tank size
                        for keyword in tank_keywords:
                            if keyword in description:
                                # Extract potential tank size (e.g., "20 lb", "40 cf")
                                words = description.split()
                                for i, word in enumerate(words):
                                    if keyword in word and i > 0:
                                        try:
                                            size = words[i-1]
                                            if size.isdigit():
                                                tank_deposit_data['tank_size'] = f"{size} {keyword}"
                                                break
                                        except:
                                            pass
                
                return jsonify({
                    'success': True,
                    'extracted_data': tank_deposit_data,
                    'raw_ocr_data': extracted_data  # Include original data for debugging
                })
            else:
                return jsonify({
                    'success': False,
                    'error': result.get('error', 'OCR processing failed')
                }), 500
                
        except Exception as e:
            # Clean up temp file on error
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise e
            
    except Exception as e:
        print(f"Error in tank deposit OCR processing: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'OCR processing failed: {str(e)}'
        }), 500

# Quotes endpoints
@app.route('/api/quotes', methods=['GET'])
def get_quotes():
    return jsonify(quotes_data)

@app.route('/api/quotes', methods=['POST'])
def add_quote():
    try:
        data = request.get_json()
        new_quote = {
            'client': data.get('client'),
            'project': data.get('project'),
            'amount': data.get('amount'),
            'status': data.get('status', 'Pending'),
            'date': data.get('date'),
            'valid_until': data.get('valid_until')
        }
        # Use bulletproof thread-safe ID generation
        created_quote = id_generator.add_item_with_id(quotes_data, new_quote)
        return jsonify(created_quote), 201
    except Exception as e:
        return jsonify({'error': 'Failed to add quote', 'details': str(e)}), 500

@app.route('/api/quotes/<int:quote_id>', methods=['PUT'])
def update_quote(quote_id):
    try:
        data = request.get_json()
        for quote in quotes_data:
            if quote['id'] == quote_id:
                quote.update(data)
                return jsonify(quote)
        return jsonify({'error': 'Quote not found'}), 404
    except Exception as e:
        return jsonify({'error': 'Failed to update quote', 'details': str(e)}), 500

@app.route('/api/quotes/<int:quote_id>', methods=['DELETE'])
def delete_quote(quote_id):
    try:
        global quotes_data
        quotes_data = [quote for quote in quotes_data if quote['id'] != quote_id]
        return jsonify({'message': 'Quote deleted successfully'})
    except Exception as e:
        return jsonify({'error': 'Failed to delete quote', 'details': str(e)}), 500

# Purchase Orders endpoints
@app.route('/api/purchase-orders', methods=['GET'])
def get_purchase_orders():
    return jsonify(purchase_orders_data)

@app.route('/api/purchase-orders', methods=['POST'])
def add_purchase_order():
    try:
        data = request.get_json()
        new_po = {
            'vendor': data.get('vendor'),
            'amount': data.get('amount'),
            'status': data.get('status', 'Pending'),
            'date': data.get('date'),
            'expected_delivery': data.get('expected_delivery')
        }
        # Use bulletproof thread-safe ID generation
        created_po = id_generator.add_item_with_id(purchase_orders_data, new_po)
        return jsonify(created_po), 201
    except Exception as e:
        return jsonify({'error': 'Failed to add purchase order', 'details': str(e)}), 500

@app.route('/api/purchase-orders/<int:po_id>', methods=['PUT'])
def update_purchase_order(po_id):
    try:
        data = request.get_json()
        for po in purchase_orders_data:
            if po['id'] == po_id:
                po.update(data)
                return jsonify(po)
        return jsonify({'error': 'Purchase order not found'}), 404
    except Exception as e:
        return jsonify({'error': 'Failed to update purchase order', 'details': str(e)}), 500

@app.route('/api/purchase-orders/<int:po_id>', methods=['DELETE'])
def delete_purchase_order(po_id):
    try:
        global purchase_orders_data
        purchase_orders_data = [po for po in purchase_orders_data if po['id'] != po_id]
        return jsonify({'message': 'Purchase order deleted successfully'})
    except Exception as e:
        return jsonify({'error': 'Failed to delete purchase order', 'details': str(e)}), 500

# Invoices endpoints
@app.route('/api/invoices', methods=['GET'])
def get_invoices():
    return jsonify(invoices_data)

@app.route('/api/invoices', methods=['POST'])
def add_invoice():
    try:
        data = request.get_json()
        new_invoice = {
            'invoice_number': data.get('invoice_number'),
            'customer_name': data.get('customer_name'),
            'customer_email': data.get('customer_email'),
            'customer_address': data.get('customer_address'),
            'invoice_date': data.get('invoice_date'),
            'due_date': data.get('due_date'),
            'status': data.get('status', 'Draft'),
            'subtotal': data.get('subtotal', 0),
            'gst_rate': data.get('gst_rate', 5.0),
            'gst_amount': data.get('gst_amount', 0),
            'pst_rate': data.get('pst_rate', 7.0),
            'pst_amount': data.get('pst_amount', 0),
            'total_amount': data.get('total_amount', 0),
            'tax_exempt': data.get('tax_exempt', False),
            'band_name': data.get('band_name', ''),
            'band_number': data.get('band_number', ''),
            'project': data.get('project'),
            'notes': data.get('notes'),
            'line_items': data.get('line_items', [])
        }
        # Use bulletproof thread-safe ID generation
        created_invoice = id_generator.add_item_with_id(invoices_data, new_invoice)
        return jsonify(created_invoice), 201
    except Exception as e:
        return jsonify({'error': 'Failed to add invoice', 'details': str(e)}), 500

@app.route('/api/invoices/<int:invoice_id>', methods=['PUT'])
def update_invoice(invoice_id):
    try:
        data = request.get_json()
        for invoice in invoices_data:
            if invoice['id'] == invoice_id:
                invoice.update(data)
                return jsonify(invoice)
        return jsonify({'error': 'Invoice not found'}), 404
    except Exception as e:
        return jsonify({'error': 'Failed to update invoice', 'details': str(e)}), 500

@app.route('/api/invoices/<int:invoice_id>', methods=['DELETE'])
def delete_invoice(invoice_id):
    try:
        global invoices_data
        invoices_data = [inv for inv in invoices_data if inv['id'] != invoice_id]
        return jsonify({'message': 'Invoice deleted successfully'})
    except Exception as e:
        return jsonify({'error': 'Failed to delete invoice', 'details': str(e)}), 500

@app.route('/api/invoices/<int:invoice_id>/pdf', methods=['GET'])
def generate_invoice_pdf(invoice_id):
    try:
        # Find the invoice
        invoice = next((inv for inv in invoices_data if inv['id'] == invoice_id), None)
        if not invoice:
            return jsonify({'error': 'Invoice not found'}), 404
        
        # Create PDF
        pdf = FPDF()
        pdf.add_page()
        
        # Company Header
        pdf.set_font('Helvetica', 'B', 16)
        pdf.cell(0, 10, 'ABC Construction Ltd.', new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='C')
        pdf.set_font('Helvetica', '', 10)
        pdf.cell(0, 5, '123 Construction Ave, Vancouver, BC V6B 1A1', new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='C')
        pdf.cell(0, 5, 'Phone: (604) 555-0123 | Email: billing@abcconstruction.ca', new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='C')
        pdf.cell(0, 5, 'PST Number: PST-7654-3210', new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='C')
        
        pdf.ln(10)
        
        # Invoice Title
        pdf.set_font('Helvetica', 'B', 14)
        pdf.cell(0, 8, 'INVOICE', new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='C')
        
        pdf.ln(5)
        
        # Invoice Details (Two columns)
        pdf.set_font('Helvetica', '', 10)
        
        # Left column - Customer info
        pdf.cell(95, 6, f"Bill To:", new_x=XPos.RIGHT, new_y=YPos.TOP)
        pdf.cell(95, 6, f"Invoice #: {invoice.get('invoice_number', 'N/A')}", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        
        pdf.set_font('Helvetica', 'B', 10)
        pdf.cell(95, 6, f"{invoice.get('customer_name', 'N/A')}", new_x=XPos.RIGHT, new_y=YPos.TOP)
        pdf.set_font('Helvetica', '', 10)
        pdf.cell(95, 6, f"Date: {invoice.get('invoice_date', 'N/A')}", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        
        # Customer address (multi-line)
        if invoice.get('customer_address'):
            address_lines = invoice['customer_address'].split('\n')
            for line in address_lines:
                pdf.cell(95, 6, line, new_x=XPos.RIGHT, new_y=YPos.TOP)
                pdf.cell(95, 6, '', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        
        # Due date (if exists)
        if invoice.get('due_date'):
            pdf.cell(95, 6, '', new_x=XPos.RIGHT, new_y=YPos.TOP)
            pdf.cell(95, 6, f"Due Date: {invoice['due_date']}", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        
        # Tax exempt information
        if invoice.get('tax_exempt') and invoice.get('band_name'):
            pdf.ln(5)
            pdf.set_font('Helvetica', 'B', 10)
            pdf.cell(0, 6, f"TAX EXEMPT - First Nations", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
            pdf.set_font('Helvetica', '', 10)
            pdf.cell(0, 6, f"Band: {invoice.get('band_name', '')}", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
            if invoice.get('band_number'):
                pdf.cell(0, 6, f"Band Number: {invoice.get('band_number', '')}", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        
        pdf.ln(10)
        
        # Line Items Table
        pdf.set_font('Helvetica', 'B', 10)
        
        # Table headers
        pdf.cell(80, 8, 'Description', border=1, align='C')
        pdf.cell(20, 8, 'Qty', border=1, align='C')
        pdf.cell(25, 8, 'Unit Price', border=1, align='C')
        pdf.cell(25, 8, 'Total', border=1, align='C', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        
        # Line items
        pdf.set_font('Helvetica', '', 9)
        line_items = invoice.get('line_items', [])
        
        for item in line_items:
            # Description (may need wrapping)
            description = item.get('description', '')
            if len(description) > 40:
                description = description[:37] + '...'
            
            pdf.cell(80, 6, description, border=1)
            pdf.cell(20, 6, str(item.get('quantity', 0)), border=1, align='C')
            pdf.cell(25, 6, f"${item.get('unit_price', 0):.2f}", border=1, align='R')
            pdf.cell(25, 6, f"${item.get('total', 0):.2f}", border=1, align='R', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
            
            # Delivery address if specified
            if item.get('delivery_address'):
                pdf.set_font('Helvetica', '', 8)
                pdf.cell(80, 5, f"Deliver to: {item['delivery_address']}", border=1)
                pdf.cell(70, 5, '', border=1, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
                pdf.set_font('Helvetica', '', 9)
        
        pdf.ln(5)
        
        # Totals section
        pdf.set_font('Helvetica', '', 10)
        
        # Subtotal
        pdf.cell(130, 6, '')
        pdf.cell(30, 6, 'Subtotal:', align='R')
        pdf.cell(30, 6, f"${invoice.get('subtotal', 0):.2f}", new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='R')
        
        # GST
        if invoice.get('gst_rate', 0) > 0:
            pdf.cell(130, 6, '')
            pdf.cell(30, 6, f"GST ({invoice.get('gst_rate', 0)}%):", align='R')
            pdf.cell(30, 6, f"${invoice.get('gst_amount', 0):.2f}", new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='R')
        
        # PST
        if invoice.get('pst_rate', 0) > 0:
            pdf.cell(130, 6, '')
            pdf.cell(30, 6, f"PST ({invoice.get('pst_rate', 0)}%):", align='R')
            pdf.cell(30, 6, f"${invoice.get('pst_amount', 0):.2f}", new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='R')
        
        # Total
        pdf.set_font('Helvetica', 'B', 12)
        pdf.cell(130, 8, '')
        pdf.cell(30, 8, 'Total:', align='R')
        pdf.cell(30, 8, f"${invoice.get('total_amount', 0):.2f}", new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='R')
        
        # Notes
        if invoice.get('notes'):
            pdf.ln(10)
            pdf.set_font('Helvetica', 'B', 10)
            pdf.cell(0, 6, 'Notes:', new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='L')
            pdf.set_font('Helvetica', '', 9)
            pdf.multi_cell(0, 5, invoice.get('notes', ''))
        
        # Footer
        pdf.ln(10)
        pdf.set_font('Helvetica', '', 8)
        pdf.cell(0, 5, f"Generated on {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='L')
        
        # Generate PDF and ensure bytes output
        pdf_output = pdf.output()
        
        # Force conversion to bytes
        if isinstance(pdf_output, str):
            pdf_bytes = pdf_output.encode('latin-1')
        else:
            pdf_bytes = bytes(pdf_output)
        
        return Response(
            pdf_bytes,
            mimetype='application/pdf',
            headers={
                'Content-Disposition': f'attachment; filename=invoice_{invoice.get("invoice_number", "")}.pdf',
                'Content-Length': str(len(pdf_bytes))
            }
        )
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"PDF Generation Error: {str(e)}")
        print(f"Traceback: {error_details}")
        return jsonify({
            'error': 'Failed to generate PDF', 
            'details': str(e)
        }), 500

@app.route('/api/invoices/<int:invoice_id>/email', methods=['POST'])
def email_invoice(invoice_id):
    try:
        data = request.get_json()
        email_to = data.get('email_to')
        
        # Find the invoice
        invoice = next((inv for inv in invoices_data if inv['id'] == invoice_id), None)
        if not invoice:
            return jsonify({'error': 'Invoice not found'}), 404
        
        # For now, return a success message
        # In production, this would send an actual email
        return jsonify({'message': f'Invoice {invoice["invoice_number"]} emailed to {email_to}'})
    except Exception as e:
        return jsonify({'error': 'Failed to email invoice', 'details': str(e)}), 500

# ============================================================================
# REPORTING API ENDPOINTS
# ============================================================================

@app.route('/api/reports/financial-summary', methods=['GET'])
def get_financial_summary():
    """Get overall financial summary including revenue, expenses, and profit"""
    try:
        # Calculate invoice metrics
        total_revenue = sum(invoice.get('total_amount', 0) for invoice in invoices_data)
        paid_invoices = [inv for inv in invoices_data if inv.get('status') == 'Paid']
        paid_revenue = sum(invoice.get('total_amount', 0) for invoice in paid_invoices)
        outstanding_invoices = [inv for inv in invoices_data if inv.get('status') in ['Sent', 'Draft']]
        outstanding_amount = sum(invoice.get('total_amount', 0) for invoice in outstanding_invoices)
        overdue_invoices = [inv for inv in invoices_data if inv.get('status') == 'Overdue']
        overdue_amount = sum(invoice.get('total_amount', 0) for invoice in overdue_invoices)
        
        # Calculate expense metrics (from expenses_data if it exists)
        total_expenses = sum(expense.get('amount', 0) for expense in expenses_data) if 'expenses_data' in globals() else 0
        
        # Calculate profit
        net_profit = paid_revenue - total_expenses
        
        return jsonify({
            'revenue': {
                'total': total_revenue,
                'paid': paid_revenue,
                'outstanding': outstanding_amount,
                'overdue': overdue_amount
            },
            'expenses': {
                'total': total_expenses
            },
            'profit': {
                'net': net_profit,
                'margin': (net_profit / paid_revenue * 100) if paid_revenue > 0 else 0
            },
            'invoice_counts': {
                'total': len(invoices_data),
                'paid': len(paid_invoices),
                'outstanding': len(outstanding_invoices),
                'overdue': len(overdue_invoices)
            }
        })
    except Exception as e:
        return jsonify({'error': 'Failed to get financial summary', 'details': str(e)}), 500

@app.route('/api/reports/revenue-trends', methods=['GET'])
def get_revenue_trends():
    """Get revenue trends over time"""
    try:
        from datetime import datetime
        from collections import defaultdict
        
        # Group invoices by month
        monthly_revenue = defaultdict(float)
        monthly_counts = defaultdict(int)
        
        for invoice in invoices_data:
            if invoice.get('invoice_date') and invoice.get('status') == 'Paid':
                try:
                    date = datetime.strptime(invoice['invoice_date'], '%Y-%m-%d')
                    month_key = date.strftime('%Y-%m')
                    monthly_revenue[month_key] += invoice.get('total_amount', 0)
                    monthly_counts[month_key] += 1
                except:
                    continue
        
        # Convert to sorted list
        trends = []
        for month in sorted(monthly_revenue.keys()):
            trends.append({
                'month': month,
                'revenue': monthly_revenue[month],
                'invoice_count': monthly_counts[month]
            })
        
        return jsonify(trends)
    except Exception as e:
        return jsonify({'error': 'Failed to get revenue trends', 'details': str(e)}), 500

@app.route('/api/reports/customer-analysis', methods=['GET'])
def get_customer_analysis():
    """Get customer analysis including top customers by revenue"""
    try:
        from collections import defaultdict
        
        customer_data = defaultdict(lambda: {'revenue': 0, 'invoice_count': 0, 'last_invoice': None})
        
        for invoice in invoices_data:
            customer_name = invoice.get('customer_name', 'Unknown')
            customer_data[customer_name]['revenue'] += invoice.get('total_amount', 0)
            customer_data[customer_name]['invoice_count'] += 1
            
            # Track most recent invoice date
            if invoice.get('invoice_date'):
                if not customer_data[customer_name]['last_invoice'] or invoice['invoice_date'] > customer_data[customer_name]['last_invoice']:
                    customer_data[customer_name]['last_invoice'] = invoice['invoice_date']
        
        # Convert to sorted list (top customers by revenue)
        customers = []
        for name, data in customer_data.items():
            customers.append({
                'name': name,
                'revenue': data['revenue'],
                'invoice_count': data['invoice_count'],
                'last_invoice': data['last_invoice'],
                'average_invoice': data['revenue'] / data['invoice_count'] if data['invoice_count'] > 0 else 0
            })
        
        customers.sort(key=lambda x: x['revenue'], reverse=True)
        
        return jsonify(customers)
    except Exception as e:
        return jsonify({'error': 'Failed to get customer analysis', 'details': str(e)}), 500

@app.route('/api/reports/invoice-status-breakdown', methods=['GET'])
def get_invoice_status_breakdown():
    """Get breakdown of invoices by status"""
    try:
        from collections import defaultdict
        
        status_data = defaultdict(lambda: {'count': 0, 'total_amount': 0})
        
        for invoice in invoices_data:
            status = invoice.get('status', 'Unknown')
            status_data[status]['count'] += 1
            status_data[status]['total_amount'] += invoice.get('total_amount', 0)
        
        # Convert to list format
        breakdown = []
        for status, data in status_data.items():
            breakdown.append({
                'status': status,
                'count': data['count'],
                'total_amount': data['total_amount'],
                'percentage': (data['count'] / len(invoices_data) * 100) if invoices_data else 0
            })
        
        return jsonify(breakdown)
    except Exception as e:
        return jsonify({'error': 'Failed to get invoice status breakdown', 'details': str(e)}), 500

@app.route('/api/reports/tax-exempt-analysis', methods=['GET'])
def get_tax_exempt_analysis():
    """Get analysis of tax exempt vs regular customers"""
    try:
        tax_exempt_revenue = 0
        tax_exempt_count = 0
        regular_revenue = 0
        regular_count = 0
        
        for invoice in invoices_data:
            if invoice.get('tax_exempt'):
                tax_exempt_revenue += invoice.get('total_amount', 0)
                tax_exempt_count += 1
            else:
                regular_revenue += invoice.get('total_amount', 0)
                regular_count += 1
        
        total_revenue = tax_exempt_revenue + regular_revenue
        
        return jsonify({
            'tax_exempt': {
                'revenue': tax_exempt_revenue,
                'count': tax_exempt_count,
                'percentage': (tax_exempt_revenue / total_revenue * 100) if total_revenue > 0 else 0,
                'average_invoice': tax_exempt_revenue / tax_exempt_count if tax_exempt_count > 0 else 0
            },
            'regular': {
                'revenue': regular_revenue,
                'count': regular_count,
                'percentage': (regular_revenue / total_revenue * 100) if total_revenue > 0 else 0,
                'average_invoice': regular_revenue / regular_count if regular_count > 0 else 0
            },
            'total': {
                'revenue': total_revenue,
                'count': tax_exempt_count + regular_count
            }
        })
    except Exception as e:
        return jsonify({'error': 'Failed to get tax exempt analysis', 'details': str(e)}), 500

@app.route('/api/expenses/process-receipt', methods=['POST'])
def process_receipt():
    """Process receipt image using OCR and extract line items data"""
    try:
        print("DEBUG: process_receipt endpoint called")
        
        if 'file' not in request.files:
            print("ERROR: No file provided in request")
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            print("ERROR: No file selected")
            return jsonify({'error': 'No file selected'}), 400
        
        print(f"DEBUG: File received: {file.filename}")
        
        # Save the uploaded file temporarily
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
            file.save(temp_file.name)
            temp_path = temp_file.name
        
        print(f"DEBUG: File saved to temp path: {temp_path}")
        
        try:
            print("DEBUG: About to import ReceiptOCR")
            # Import and use the updated OCR service
            from receipt_ocr import ReceiptOCR
            
            print("DEBUG: ReceiptOCR imported successfully, creating instance...")
            ocr = ReceiptOCR()
            
            print("DEBUG: ReceiptOCR instance created, calling process_receipt...")
            result = ocr.process_receipt(temp_path)
            
            print(f"DEBUG: OCR processing completed, result: {result}")
            
            # Clean up temp file
            os.unlink(temp_path)
            
            if 'error' in result:
                print(f"ERROR: OCR returned error: {result['error']}")
                return jsonify({'error': result['error']}), 400
            
            # Format response for frontend
            response = {
                'success': True,
                'extracted_data': {
                    'vendor': result.get('vendor', ''),
                    'date': result.get('date', ''),
                    'total': result.get('total', 0),
                    'line_items': result.get('line_items', []),
                    'confidence': 'high' if len(result.get('line_items', [])) > 0 else 'medium'
                },
                'processing_info': {
                    'vendor_detected': bool(result.get('vendor')),
                    'date_detected': bool(result.get('date')),
                    'total_detected': result.get('total', 0) > 0,
                    'items_found': len(result.get('line_items', []))
                },
                'raw_text': result.get('raw_text', '')
            }
            
            print("DEBUG: Returning successful response")
            return jsonify(response)
            
        except Exception as processing_error:
            print(f"ERROR: Exception during OCR processing: {str(processing_error)}")
            print(f"ERROR: Exception type: {type(processing_error).__name__}")
            import traceback
            print(f"ERROR: Full traceback:\n{traceback.format_exc()}")
            
            # Clean up temp file on error
            if os.path.exists(temp_path):
                os.unlink(temp_path)
            raise processing_error
        
    except Exception as e:
        print(f"ERROR: Exception in process_receipt endpoint: {str(e)}")
        print(f"ERROR: Exception type: {type(e).__name__}")
        import traceback
        print(f"ERROR: Full traceback:\n{traceback.format_exc()}")
        return jsonify({'error': 'Failed to process receipt', 'details': str(e)}), 500

@app.route('/api/expenses/ocr-status', methods=['GET'])
def ocr_status():
    """Check if OCR service is available"""
    try:
        # Check if Google Cloud credentials are available
        credentials_available = bool(os.environ.get('GOOGLE_APPLICATION_CREDENTIALS'))
        
        return jsonify({
            'ocr_available': True,
            'credentials_configured': credentials_available,
            'service': 'Google Cloud Vision API'
        })
        
    except Exception as e:
        return jsonify({
            'ocr_available': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

