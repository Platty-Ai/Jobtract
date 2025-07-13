"""
Thread-Safe Data Manager for Jobtract Application

This module provides thread-safe access to all global data structures
to prevent data corruption when multiple users access the application simultaneously.

Features:
- Thread-safe read/write operations
- Atomic data modifications
- Deadlock prevention with timeout locks
- Data integrity guarantees
- Windows-compatible implementation
"""

import threading
import time
from typing import Dict, List, Any, Optional, Callable
import copy

class ThreadSafeDataStore:
    """
    Thread-safe data store that wraps global data lists with proper locking
    """
    
    def __init__(self, initial_data: List[Dict] = None):
        """
        Initialize thread-safe data store
        
        Args:
            initial_data: Initial data list (optional)
        """
        self._data = initial_data or []
        self._lock = threading.RLock()  # Reentrant lock to prevent deadlocks
        self._lock_timeout = 30  # 30 second timeout to prevent infinite blocking
    
    def read_all(self) -> List[Dict]:
        """
        Thread-safely read all data
        
        Returns:
            List[Dict]: Copy of all data
        """
        if self._lock.acquire(timeout=self._lock_timeout):
            try:
                return copy.deepcopy(self._data)
            finally:
                self._lock.release()
        else:
            raise RuntimeError("Failed to acquire lock for read operation")
    
    def read_by_id(self, item_id: str) -> Optional[Dict]:
        """
        Thread-safely read item by ID
        
        Args:
            item_id: ID of item to find
            
        Returns:
            Dict or None: Found item or None if not found
        """
        if self._lock.acquire(timeout=self._lock_timeout):
            try:
                # Handle both string and integer IDs for backward compatibility
                for item in self._data:
                    if str(item.get('id')) == str(item_id):
                        return copy.deepcopy(item)
                return None
            finally:
                self._lock.release()
        else:
            raise RuntimeError("Failed to acquire lock for read operation")
    
    def add_item(self, new_item: Dict) -> Dict:
        """
        Thread-safely add new item
        
        Args:
            new_item: Item to add
            
        Returns:
            Dict: Added item with any modifications
        """
        if self._lock.acquire(timeout=self._lock_timeout):
            try:
                # Create a copy to avoid external modifications
                item_copy = copy.deepcopy(new_item)
                self._data.append(item_copy)
                return item_copy
            finally:
                self._lock.release()
        else:
            raise RuntimeError("Failed to acquire lock for add operation")
    
    def update_item(self, item_id: str, update_data: Dict) -> Optional[Dict]:
        """
        Thread-safely update item by ID
        
        Args:
            item_id: ID of item to update
            update_data: Data to update
            
        Returns:
            Dict or None: Updated item or None if not found
        """
        if self._lock.acquire(timeout=self._lock_timeout):
            try:
                # Handle both string and integer IDs for backward compatibility
                for i, item in enumerate(self._data):
                    if str(item.get('id')) == str(item_id):
                        # Update existing item with new data
                        updated_item = copy.deepcopy(item)
                        updated_item.update(update_data)
                        self._data[i] = updated_item
                        return copy.deepcopy(updated_item)
                return None
            finally:
                self._lock.release()
        else:
            raise RuntimeError("Failed to acquire lock for update operation")
    
    def delete_item(self, item_id: str) -> bool:
        """
        Thread-safely delete item by ID
        
        Args:
            item_id: ID of item to delete
            
        Returns:
            bool: True if item was deleted, False if not found
        """
        if self._lock.acquire(timeout=self._lock_timeout):
            try:
                original_length = len(self._data)
                # Handle both string and integer IDs for backward compatibility
                self._data[:] = [item for item in self._data 
                               if str(item.get('id')) != str(item_id)]
                return len(self._data) < original_length
            finally:
                self._lock.release()
        else:
            raise RuntimeError("Failed to acquire lock for delete operation")
    
    def filter_items(self, filter_func: Callable[[Dict], bool]) -> List[Dict]:
        """
        Thread-safely filter items
        
        Args:
            filter_func: Function to filter items
            
        Returns:
            List[Dict]: Filtered items
        """
        if self._lock.acquire(timeout=self._lock_timeout):
            try:
                filtered = [copy.deepcopy(item) for item in self._data 
                          if filter_func(item)]
                return filtered
            finally:
                self._lock.release()
        else:
            raise RuntimeError("Failed to acquire lock for filter operation")
    
    def count(self) -> int:
        """
        Thread-safely get count of items
        
        Returns:
            int: Number of items
        """
        if self._lock.acquire(timeout=self._lock_timeout):
            try:
                return len(self._data)
            finally:
                self._lock.release()
        else:
            raise RuntimeError("Failed to acquire lock for count operation")
    
    def clear(self) -> None:
        """
        Thread-safely clear all data
        """
        if self._lock.acquire(timeout=self._lock_timeout):
            try:
                self._data.clear()
            finally:
                self._lock.release()
        else:
            raise RuntimeError("Failed to acquire lock for clear operation")
    
    def bulk_operation(self, operation_func: Callable[[List[Dict]], Any]) -> Any:
        """
        Thread-safely perform bulk operation on data
        
        Args:
            operation_func: Function that takes the data list and returns result
            
        Returns:
            Any: Result of the operation
        """
        if self._lock.acquire(timeout=self._lock_timeout):
            try:
                return operation_func(self._data)
            finally:
                self._lock.release()
        else:
            raise RuntimeError("Failed to acquire lock for bulk operation")

class GlobalDataManager:
    """
    Manager for all global data stores in the application
    """
    
    def __init__(self):
        """Initialize all data stores"""
        # Initialize all data stores as empty - they'll be populated from existing data
        self.expenses = ThreadSafeDataStore()
        self.equipment = ThreadSafeDataStore()
        self.tank_deposits = ThreadSafeDataStore()
        self.quotes = ThreadSafeDataStore()
        self.purchase_orders = ThreadSafeDataStore()
        self.projects = ThreadSafeDataStore()
        self.invoices = ThreadSafeDataStore()
        
        # Global lock for operations that span multiple data stores
        self._global_lock = threading.RLock()
        self._lock_timeout = 30
    
    def migrate_from_global_lists(self, expenses_data: List[Dict], 
                                 equipment_data: List[Dict],
                                 tank_deposits_data: List[Dict],
                                 quotes_data: List[Dict],
                                 purchase_orders_data: List[Dict],
                                 projects_data: List[Dict],
                                 invoices_data: List[Dict]) -> None:
        """
        Migrate data from existing global lists to thread-safe stores
        
        Args:
            expenses_data: Existing expenses data
            equipment_data: Existing equipment data
            tank_deposits_data: Existing tank deposits data
            quotes_data: Existing quotes data
            purchase_orders_data: Existing purchase orders data
            projects_data: Existing projects data
            invoices_data: Existing invoices data
        """
        if self._global_lock.acquire(timeout=self._lock_timeout):
            try:
                # Migrate all data to thread-safe stores
                self.expenses._data = copy.deepcopy(expenses_data)
                self.equipment._data = copy.deepcopy(equipment_data)
                self.tank_deposits._data = copy.deepcopy(tank_deposits_data)
                self.quotes._data = copy.deepcopy(quotes_data)
                self.purchase_orders._data = copy.deepcopy(purchase_orders_data)
                self.projects._data = copy.deepcopy(projects_data)
                self.invoices._data = copy.deepcopy(invoices_data)
            finally:
                self._global_lock.release()
        else:
            raise RuntimeError("Failed to acquire global lock for migration")
    
    def get_all_data_summary(self) -> Dict[str, int]:
        """
        Get summary of all data stores
        
        Returns:
            Dict[str, int]: Count of items in each store
        """
        if self._global_lock.acquire(timeout=self._lock_timeout):
            try:
                return {
                    'expenses': self.expenses.count(),
                    'equipment': self.equipment.count(),
                    'tank_deposits': self.tank_deposits.count(),
                    'quotes': self.quotes.count(),
                    'purchase_orders': self.purchase_orders.count(),
                    'projects': self.projects.count(),
                    'invoices': self.invoices.count()
                }
            finally:
                self._global_lock.release()
        else:
            raise RuntimeError("Failed to acquire global lock for summary")
    
    def cross_store_operation(self, operation_func: Callable[['GlobalDataManager'], Any]) -> Any:
        """
        Perform operation that spans multiple data stores
        
        Args:
            operation_func: Function that takes this manager and returns result
            
        Returns:
            Any: Result of the operation
        """
        if self._global_lock.acquire(timeout=self._lock_timeout):
            try:
                return operation_func(self)
            finally:
                self._global_lock.release()
        else:
            raise RuntimeError("Failed to acquire global lock for cross-store operation")

# Global instance of the data manager
global_data_manager = GlobalDataManager()

def get_data_manager() -> GlobalDataManager:
    """
    Get the global data manager instance
    
    Returns:
        GlobalDataManager: The global data manager
    """
    return global_data_manager

