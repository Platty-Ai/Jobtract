"""
Expense model for Jobtract application
"""
import uuid
import datetime
import threading
from typing import Dict, Any, Optional, List

class Expense:
    """Expense model"""
    
    def __init__(self, **kwargs):
        self.id = str(uuid.uuid4())
        self.user_id = kwargs.get('user_id', '')
        self.description = kwargs.get('description', '')
        self.amount = float(kwargs.get('amount', 0.0))
        self.date = kwargs.get('date', datetime.date.today().isoformat())
        self.category = kwargs.get('category', '')
        self.vendor = kwargs.get('vendor', '')
        self.project_id = kwargs.get('project_id', '')
        self.receipt_number = kwargs.get('receipt_number', '')
        self.photo_path = kwargs.get('photo_path', '')
        self.notes = kwargs.get('notes', '')
        self.created_at = datetime.datetime.utcnow()
        self.updated_at = datetime.datetime.utcnow()
        
        # Line items for detailed expenses
        self.line_items = kwargs.get('line_items', [])
        self.subtotal = float(kwargs.get('subtotal', 0.0))
        self.taxes = kwargs.get('taxes', [])
        
        # Status tracking
        self.status = kwargs.get('status', 'pending')  # pending, approved, rejected
        self.approved_by = kwargs.get('approved_by', '')
        self.approved_at = None
    
    def update(self, **kwargs):
        """Update expense data"""
        allowed_fields = [
            'description', 'amount', 'date', 'category', 'vendor', 
            'project_id', 'receipt_number', 'photo_path', 'notes',
            'line_items', 'subtotal', 'taxes', 'status'
        ]
        
        for field in allowed_fields:
            if field in kwargs:
                if field == 'amount' or field == 'subtotal':
                    setattr(self, field, float(kwargs[field]))
                else:
                    setattr(self, field, kwargs[field])
        
        self.updated_at = datetime.datetime.utcnow()
    
    def approve(self, approved_by: str):
        """Approve expense"""
        self.status = 'approved'
        self.approved_by = approved_by
        self.approved_at = datetime.datetime.utcnow()
        self.updated_at = datetime.datetime.utcnow()
    
    def reject(self):
        """Reject expense"""
        self.status = 'rejected'
        self.updated_at = datetime.datetime.utcnow()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert expense to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'description': self.description,
            'amount': self.amount,
            'date': self.date,
            'category': self.category,
            'vendor': self.vendor,
            'project_id': self.project_id,
            'receipt_number': self.receipt_number,
            'photo_path': self.photo_path,
            'notes': self.notes,
            'line_items': self.line_items,
            'subtotal': self.subtotal,
            'taxes': self.taxes,
            'status': self.status,
            'approved_by': self.approved_by,
            'approved_at': self.approved_at.isoformat() if self.approved_at else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Expense':
        """Create expense from dictionary"""
        expense = cls(**data)
        
        # Set existing data
        expense.id = data.get('id', expense.id)
        
        # Parse timestamps
        if data.get('created_at'):
            expense.created_at = datetime.datetime.fromisoformat(data['created_at'])
        if data.get('updated_at'):
            expense.updated_at = datetime.datetime.fromisoformat(data['updated_at'])
        if data.get('approved_at'):
            expense.approved_at = datetime.datetime.fromisoformat(data['approved_at'])
        
        return expense

class ExpenseManager:
    """Thread-safe expense management"""
    
    def __init__(self):
        self._expenses: Dict[str, Expense] = {}
        self._user_index: Dict[str, List[str]] = {}  # user_id -> [expense_ids]
        self._project_index: Dict[str, List[str]] = {}  # project_id -> [expense_ids]
        self._lock = threading.RLock()
    
    def create_expense(self, user_id: str, **kwargs) -> Expense:
        """Create a new expense"""
        with self._lock:
            kwargs['user_id'] = user_id
            expense = Expense(**kwargs)
            
            self._expenses[expense.id] = expense
            
            # Update indexes
            if user_id not in self._user_index:
                self._user_index[user_id] = []
            self._user_index[user_id].append(expense.id)
            
            if expense.project_id:
                if expense.project_id not in self._project_index:
                    self._project_index[expense.project_id] = []
                self._project_index[expense.project_id].append(expense.id)
            
            return expense
    
    def get_expense_by_id(self, expense_id: str) -> Optional[Expense]:
        """Get expense by ID"""
        with self._lock:
            return self._expenses.get(expense_id)
    
    def get_expenses_by_user(self, user_id: str) -> List[Expense]:
        """Get all expenses for a user"""
        with self._lock:
            expense_ids = self._user_index.get(user_id, [])
            return [self._expenses[eid] for eid in expense_ids if eid in self._expenses]
    
    def get_expenses_by_project(self, project_id: str) -> List[Expense]:
        """Get all expenses for a project"""
        with self._lock:
            expense_ids = self._project_index.get(project_id, [])
            return [self._expenses[eid] for eid in expense_ids if eid in self._expenses]
    
    def get_all_expenses(self) -> List[Expense]:
        """Get all expenses"""
        with self._lock:
            return list(self._expenses.values())
    
    def update_expense(self, expense_id: str, **kwargs) -> Optional[Expense]:
        """Update expense"""
        with self._lock:
            expense = self._expenses.get(expense_id)
            if not expense:
                return None
            
            # Handle project change for indexing
            old_project_id = expense.project_id
            expense.update(**kwargs)
            new_project_id = expense.project_id
            
            # Update project index if project changed
            if old_project_id != new_project_id:
                # Remove from old project index
                if old_project_id and old_project_id in self._project_index:
                    if expense_id in self._project_index[old_project_id]:
                        self._project_index[old_project_id].remove(expense_id)
                
                # Add to new project index
                if new_project_id:
                    if new_project_id not in self._project_index:
                        self._project_index[new_project_id] = []
                    if expense_id not in self._project_index[new_project_id]:
                        self._project_index[new_project_id].append(expense_id)
            
            return expense
    
    def delete_expense(self, expense_id: str) -> bool:
        """Delete expense"""
        with self._lock:
            expense = self._expenses.get(expense_id)
            if not expense:
                return False
            
            # Remove from indexes
            if expense.user_id in self._user_index:
                if expense_id in self._user_index[expense.user_id]:
                    self._user_index[expense.user_id].remove(expense_id)
            
            if expense.project_id and expense.project_id in self._project_index:
                if expense_id in self._project_index[expense.project_id]:
                    self._project_index[expense.project_id].remove(expense_id)
            
            del self._expenses[expense_id]
            return True
    
    def get_expenses_by_status(self, status: str) -> List[Expense]:
        """Get expenses by status"""
        with self._lock:
            return [expense for expense in self._expenses.values() if expense.status == status]
    
    def get_expenses_by_date_range(self, start_date: str, end_date: str) -> List[Expense]:
        """Get expenses within date range"""
        with self._lock:
            return [
                expense for expense in self._expenses.values()
                if start_date <= expense.date <= end_date
            ]
    
    def get_total_expenses_by_user(self, user_id: str) -> float:
        """Get total expense amount for a user"""
        expenses = self.get_expenses_by_user(user_id)
        return sum(expense.amount for expense in expenses)
    
    def get_total_expenses_by_project(self, project_id: str) -> float:
        """Get total expense amount for a project"""
        expenses = self.get_expenses_by_project(project_id)
        return sum(expense.amount for expense in expenses)

