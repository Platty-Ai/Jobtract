#!/usr/bin/env python3
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def fix_expenses_table():
    """Add missing columns to the expenses table"""
    try:
        database_url = os.getenv('DATABASE_URL')
        print(f"Connecting to database...")
        
        conn = psycopg2.connect(database_url, cursor_factory=RealDictCursor)
        cursor = conn.cursor()
        
        # Check current table structure
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'expenses'
            ORDER BY ordinal_position
        """)
        
        columns = cursor.fetchall()
        existing_columns = [col['column_name'] for col in columns]
        
        print(f"Current table structure:")
        for col in columns:
            print(f"  - {col['column_name']}: {col['data_type']} ({'NULL' if col['is_nullable'] == 'YES' else 'NOT NULL'})")
        
        # Add missing columns
        missing_columns = []
        
        if 'gst_amount' not in existing_columns:
            missing_columns.append(('gst_amount', 'DECIMAL(10,2) DEFAULT 0'))
            
        if 'gst_total' not in existing_columns:
            missing_columns.append(('gst_total', 'DECIMAL(10,2) DEFAULT 0'))
            
        if 'receipt_path' not in existing_columns:
            missing_columns.append(('receipt_path', 'TEXT'))
            
        if 'notes' not in existing_columns:
            missing_columns.append(('notes', 'TEXT'))
        
        # Add missing columns
        for column_name, column_def in missing_columns:
            print(f"Adding column: {column_name}")
            cursor.execute(f"ALTER TABLE expenses ADD COLUMN {column_name} {column_def}")
        
        if missing_columns:
            conn.commit()
            print(f"Added {len(missing_columns)} missing columns.")
        else:
            print("All required columns already exist.")
        
        # Test the expenses functionality
        print("\nTesting expenses functionality...")
        
        # Insert a test expense with all fields
        test_expense_id = "test_expense_debug_123"
        cursor.execute("""
            INSERT INTO expenses (
                id, user_id, expense_date, description, amount, 
                category, gst_amount, gst_total, receipt_path, notes
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                description = EXCLUDED.description,
                amount = EXCLUDED.amount,
                gst_amount = EXCLUDED.gst_amount,
                gst_total = EXCLUDED.gst_total
            RETURNING *
        """, (
            test_expense_id,
            "test_user",
            "2025-01-05",
            "Test expense for debugging",
            100.50,
            "Testing",
            10.05,
            110.55,
            "/path/to/receipt.jpg",
            "Test notes"
        ))
        
        test_expense = cursor.fetchone()
        print(f"Test expense created: {dict(test_expense)}")
        
        # Test the GET query that the API uses
        cursor.execute("SELECT * FROM expenses WHERE user_id = %s ORDER BY expense_date DESC", ("test_user",))
        expenses = cursor.fetchall()
        print(f"Retrieved {len(expenses)} expenses for test user")
        
        if expenses:
            print(f"Sample expense data: {dict(expenses[0])}")
        
        # Clean up test data
        cursor.execute("DELETE FROM expenses WHERE id = %s", (test_expense_id,))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print("Database fix completed successfully!")
        
    except Exception as e:
        print(f"Database error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    fix_expenses_table()

