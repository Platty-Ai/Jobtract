"""
Expense routes for Jobtract application
"""
from flask import Blueprint, request, jsonify, current_app
from functools import wraps

def create_expense_routes(expense_manager, security_manager, ocr_service):
    """Create expense routes blueprint"""
    expenses_bp = Blueprint('expenses', __name__)
    
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
    
    @expenses_bp.route('', methods=['GET'])
    @require_auth
    def get_expenses():
        """Get all expenses for the authenticated user"""
        try:
            user_id = request.current_user['user_id']
            user_role = request.current_user['role']
            
            # Admin can see all expenses, users see only their own
            if user_role == 'admin':
                expenses = expense_manager.get_all_expenses()
            else:
                expenses = expense_manager.get_expenses_by_user(user_id)
            
            return jsonify({
                'success': True,
                'expenses': [expense.to_dict() for expense in expenses],
                'total': len(expenses)
            })
            
        except Exception as e:
            current_app.logger.error(f'Get expenses error: {str(e)}')
            return jsonify({'error': 'Internal server error'}), 500

    @expenses_bp.route('', methods=['POST'])
    @require_auth
    def create_expense():
        """Create a new expense"""
        try:
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No data provided'}), 400
            
            user_id = request.current_user['user_id']
            
            # Validate input using SecurityManager
            validation = security_manager.validator.validate_and_sanitize(data, {
                'description': {'required': True, 'type': str, 'min_length': 1, 'max_length': 500},
                'amount': {'required': True, 'type': (int, float), 'min_value': 0},
                'category': {'required': False, 'type': str, 'max_length': 100},
                'date': {'required': False, 'type': str},
                'vendor': {'required': False, 'type': str, 'max_length': 200},
                'receipt_path': {'required': False, 'type': str, 'max_length': 500},
                'notes': {'required': False, 'type': str, 'max_length': 1000}
            })
            
            if not validation['valid']:
                return jsonify({'error': 'Validation failed', 'details': validation['errors']}), 400
            
            validated_data = validation['data']
            validated_data['user_id'] = user_id
            
            # Create expense
            expense = expense_manager.create_expense(**validated_data)
            
            return jsonify({
                'success': True,
                'message': 'Expense created successfully',
                'expense': expense.to_dict()
            }), 201
            
        except Exception as e:
            current_app.logger.error(f'Create expense error: {str(e)}')
            return jsonify({'error': 'Internal server error'}), 500

    @expenses_bp.route('/<expense_id>', methods=['GET'])
    @require_auth
    def get_expense(expense_id):
        """Get a specific expense"""
        try:
            user_id = request.current_user['user_id']
            user_role = request.current_user['role']
            
            expense = expense_manager.get_expense_by_id(expense_id)
            
            if not expense:
                return jsonify({'error': 'Expense not found'}), 404
            
            # Check if user can access this expense
            if user_role != 'admin' and expense.user_id != user_id:
                return jsonify({'error': 'Access denied'}), 403
            
            return jsonify({
                'success': True,
                'expense': expense.to_dict()
            })
            
        except Exception as e:
            current_app.logger.error(f'Get expense error: {str(e)}')
            return jsonify({'error': 'Internal server error'}), 500

    @expenses_bp.route('/<expense_id>', methods=['PUT'])
    @require_auth
    def update_expense(expense_id):
        """Update a specific expense"""
        try:
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No data provided'}), 400
            
            user_id = request.current_user['user_id']
            user_role = request.current_user['role']
            
            expense = expense_manager.get_expense_by_id(expense_id)
            
            if not expense:
                return jsonify({'error': 'Expense not found'}), 404
            
            # Check if user can update this expense
            if user_role != 'admin' and expense.user_id != user_id:
                return jsonify({'error': 'Access denied'}), 403
            
            # Validate input using SecurityManager
            validation = security_manager.validator.validate_and_sanitize(data, {
                'description': {'required': False, 'type': str, 'min_length': 1, 'max_length': 500},
                'amount': {'required': False, 'type': (int, float), 'min_value': 0},
                'category': {'required': False, 'type': str, 'max_length': 100},
                'date': {'required': False, 'type': str},
                'vendor': {'required': False, 'type': str, 'max_length': 200},
                'receipt_path': {'required': False, 'type': str, 'max_length': 500},
                'notes': {'required': False, 'type': str, 'max_length': 1000}
            })
            
            if not validation['valid']:
                return jsonify({'error': 'Validation failed', 'details': validation['errors']}), 400
            
            # Update expense
            updated_expense = expense_manager.update_expense(expense_id, **validation['data'])
            
            return jsonify({
                'success': True,
                'message': 'Expense updated successfully',
                'expense': updated_expense.to_dict()
            })
            
        except Exception as e:
            current_app.logger.error(f'Update expense error: {str(e)}')
            return jsonify({'error': 'Internal server error'}), 500

    @expenses_bp.route('/<expense_id>', methods=['DELETE'])
    @require_auth
    def delete_expense(expense_id):
        """Delete a specific expense"""
        try:
            user_id = request.current_user['user_id']
            user_role = request.current_user['role']
            
            expense = expense_manager.get_expense_by_id(expense_id)
            
            if not expense:
                return jsonify({'error': 'Expense not found'}), 404
            
            # Check if user can delete this expense
            if user_role != 'admin' and expense.user_id != user_id:
                return jsonify({'error': 'Access denied'}), 403
            
            # Delete expense
            success = expense_manager.delete_expense(expense_id)
            
            if success:
                return jsonify({
                    'success': True,
                    'message': 'Expense deleted successfully'
                })
            else:
                return jsonify({'error': 'Failed to delete expense'}), 500
            
        except Exception as e:
            current_app.logger.error(f'Delete expense error: {str(e)}')
            return jsonify({'error': 'Internal server error'}), 500

    @expenses_bp.route('/process-receipt', methods=['POST'])
    @require_auth
    def process_receipt():
        """Process receipt using OCR"""
        try:
            if 'receipt' not in request.files:
                return jsonify({'error': 'No receipt file provided'}), 400
            
            file = request.files['receipt']
            if file.filename == '':
                return jsonify({'error': 'No file selected'}), 400
            
            # Process receipt with OCR
            result = ocr_service.process_receipt(file)
            
            if result['success']:
                return jsonify({
                    'success': True,
                    'message': 'Receipt processed successfully',
                    'data': result['data']
                })
            else:
                return jsonify({
                    'success': False,
                    'error': result['error']
                }), 400
            
        except Exception as e:
            current_app.logger.error(f'Process receipt error: {str(e)}')
            return jsonify({'error': 'Internal server error'}), 500

    @expenses_bp.route('/categories', methods=['GET'])
    @require_auth
    def get_expense_categories():
        """Get available expense categories"""
        try:
            categories = [
                'Materials',
                'Labor',
                'Equipment',
                'Transportation',
                'Office',
                'Fuel',
                'Ferries',
                'Mileage',
                'LOA',
                'Utilities',
                'Shop',
                'Wages',
                'WCB',
                'Phone',
                'Advertising/Subscriptions',
                'Other'
            ]
            
            return jsonify({
                'success': True,
                'categories': categories
            })
            
        except Exception as e:
            current_app.logger.error(f'Get categories error: {str(e)}')
            return jsonify({'error': 'Internal server error'}), 500

    @expenses_bp.route('/summary', methods=['GET'])
    @require_auth
    def get_expense_summary():
        """Get expense summary for the authenticated user"""
        try:
            user_id = request.current_user['user_id']
            user_role = request.current_user['role']
            
            # Get date range from query parameters
            start_date = request.args.get('start_date')
            end_date = request.args.get('end_date')
            
            # Get expenses
            if user_role == 'admin':
                expenses = expense_manager.get_all_expenses()
            else:
                expenses = expense_manager.get_expenses_by_user(user_id)
            
            # Calculate summary
            total_amount = sum(expense.amount for expense in expenses)
            total_count = len(expenses)
            
            # Group by category
            category_summary = {}
            for expense in expenses:
                category = expense.category or 'Other'
                if category not in category_summary:
                    category_summary[category] = {'count': 0, 'amount': 0}
                category_summary[category]['count'] += 1
                category_summary[category]['amount'] += expense.amount
            
            return jsonify({
                'success': True,
                'summary': {
                    'total_amount': total_amount,
                    'total_count': total_count,
                    'category_breakdown': category_summary
                }
            })
            
        except Exception as e:
            current_app.logger.error(f'Get expense summary error: {str(e)}')
            return jsonify({'error': 'Internal server error'}), 500
    
    return expenses_bp

