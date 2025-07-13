"""
OCR service for receipt processing using Google Vision API
"""
import os
import json
import base64
from typing import Dict, Any, List
from google.cloud import vision
import re

class OCRService:
    """Google Vision OCR service for receipt processing"""
    
    def __init__(self, credentials_path: str = None):
        self.credentials_path = credentials_path or os.environ.get('GOOGLE_CREDENTIALS_PATH')
        self.client = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize Google Vision client"""
        try:
            if self.credentials_path and os.path.exists(self.credentials_path):
                os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = self.credentials_path
                self.client = vision.ImageAnnotatorClient()
                print(f"✅ Google Vision client initialized with credentials: {self.credentials_path}")
            else:
                print(f"⚠️ Google Vision credentials not found at: {self.credentials_path}")
                self.client = None
        except Exception as e:
            print(f"❌ Failed to initialize Google Vision client: {str(e)}")
            self.client = None
    
    def process_receipt(self, file) -> Dict[str, Any]:
        """Process receipt image and extract data"""
        if not self.client:
            return {
                'error': 'OCR service not available',
                'raw_text': '',
                'line_items': [],
                'total': 0.0,
                'vendor': '',
                'date': ''
            }
        
        try:
            # Read file content
            file_content = file.read()
            
            # Create Vision API image object
            image = vision.Image(content=file_content)
            
            # Perform text detection
            response = self.client.text_detection(image=image)
            texts = response.text_annotations
            
            if response.error.message:
                raise Exception(f'Google Vision API error: {response.error.message}')
            
            if not texts:
                return {
                    'error': 'No text detected in image',
                    'raw_text': '',
                    'line_items': [],
                    'total': 0.0,
                    'vendor': '',
                    'date': ''
                }
            
            # Extract raw text
            raw_text = texts[0].description if texts else ''
            
            # Parse receipt data
            parsed_data = self._parse_receipt_text(raw_text)
            
            return {
                'success': True,
                'raw_text': raw_text,
                'line_items': parsed_data['line_items'],
                'total': parsed_data['total'],
                'subtotal': parsed_data['subtotal'],
                'tax': parsed_data['tax'],
                'vendor': parsed_data['vendor'],
                'date': parsed_data['date'],
                'receipt_number': parsed_data['receipt_number']
            }
            
        except Exception as e:
            return {
                'error': f'Failed to process receipt: {str(e)}',
                'raw_text': '',
                'line_items': [],
                'total': 0.0,
                'vendor': '',
                'date': ''
            }
    
    def _parse_receipt_text(self, text: str) -> Dict[str, Any]:
        """Parse receipt text and extract structured data"""
        lines = text.split('\n')
        
        # Initialize result
        result = {
            'line_items': [],
            'total': 0.0,
            'subtotal': 0.0,
            'tax': 0.0,
            'vendor': '',
            'date': '',
            'receipt_number': ''
        }
        
        # Extract vendor (usually first few lines)
        vendor_candidates = []
        for i, line in enumerate(lines[:5]):
            line = line.strip()
            if line and not re.match(r'^[\d\s\-\/]+$', line):  # Not just numbers/dates
                vendor_candidates.append(line)
        
        if vendor_candidates:
            result['vendor'] = vendor_candidates[0]
        
        # Extract date patterns
        date_patterns = [
            r'\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b',
            r'\b(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b',
            r'\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}\b'
        ]
        
        for line in lines:
            for pattern in date_patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    result['date'] = match.group(1)
                    break
            if result['date']:
                break
        
        # Extract receipt number
        receipt_patterns = [
            r'(?:receipt|ref|transaction|order)[\s#:]*([a-zA-Z0-9\-]+)',
            r'#\s*([a-zA-Z0-9\-]+)'
        ]
        
        for line in lines:
            for pattern in receipt_patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    result['receipt_number'] = match.group(1)
                    break
            if result['receipt_number']:
                break
        
        # Extract monetary amounts
        amounts = []
        total_keywords = ['total', 'amount due', 'balance', 'grand total']
        subtotal_keywords = ['subtotal', 'sub total', 'sub-total']
        tax_keywords = ['tax', 'gst', 'hst', 'pst', 'vat']
        
        for line in lines:
            # Find all monetary amounts in the line
            money_matches = re.findall(r'\$?(\d+\.?\d*)', line)
            
            for match in money_matches:
                try:
                    amount = float(match)
                    if amount > 0:
                        line_lower = line.lower()
                        
                        # Check if it's a total
                        if any(keyword in line_lower for keyword in total_keywords):
                            result['total'] = max(result['total'], amount)
                        
                        # Check if it's a subtotal
                        elif any(keyword in line_lower for keyword in subtotal_keywords):
                            result['subtotal'] = max(result['subtotal'], amount)
                        
                        # Check if it's tax
                        elif any(keyword in line_lower for keyword in tax_keywords):
                            result['tax'] = max(result['tax'], amount)
                        
                        # Otherwise, it might be a line item
                        else:
                            amounts.append((line.strip(), amount))
                
                except ValueError:
                    continue
        
        # Extract line items (heuristic approach)
        for line_text, amount in amounts:
            # Skip if this looks like a total/subtotal/tax line
            line_lower = line_text.lower()
            if any(keyword in line_lower for keyword in total_keywords + subtotal_keywords + tax_keywords):
                continue
            
            # Skip very small amounts (likely not main items)
            if amount < 0.50:
                continue
            
            # Extract item description (remove price and quantity info)
            description = re.sub(r'\$?\d+\.?\d*', '', line_text).strip()
            description = re.sub(r'\s+', ' ', description)  # Clean whitespace
            
            if description and len(description) > 2:
                result['line_items'].append({
                    'description': description,
                    'amount': amount,
                    'quantity': 1  # Default quantity
                })
        
        # If no total found, use the largest amount
        if result['total'] == 0.0 and amounts:
            result['total'] = max(amount for _, amount in amounts)
        
        # If no subtotal, calculate from line items or use total minus tax
        if result['subtotal'] == 0.0:
            if result['line_items']:
                result['subtotal'] = sum(item['amount'] for item in result['line_items'])
            elif result['tax'] > 0:
                result['subtotal'] = result['total'] - result['tax']
            else:
                result['subtotal'] = result['total']
        
        return result
    
    def is_available(self) -> bool:
        """Check if OCR service is available"""
        return self.client is not None

