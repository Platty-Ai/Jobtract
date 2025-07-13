#!/usr/bin/env python3
"""
Standalone test script for Google Cloud Vision API
This will help isolate whether the issue is with credentials or Flask app
"""

import os
import sys

def test_google_vision_api():
    print("=" * 50)
    print("GOOGLE CLOUD VISION API TEST")
    print("=" * 50)
    
    # Check environment variable
    credentials_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
    print(f"1. Environment Variable Check:")
    print(f"   GOOGLE_APPLICATION_CREDENTIALS = {credentials_path}")
    
    if not credentials_path:
        print("   ❌ ERROR: Environment variable not set!")
        return False
    
    # Check if credentials file exists
    print(f"\n2. Credentials File Check:")
    if os.path.exists(credentials_path):
        print(f"   ✅ File exists: {credentials_path}")
        print(f"   File size: {os.path.getsize(credentials_path)} bytes")
    else:
        print(f"   ❌ ERROR: File does not exist: {credentials_path}")
        return False
    
    # Try to import Google Cloud Vision
    print(f"\n3. Import Test:")
    try:
        from google.cloud import vision
        print("   ✅ Successfully imported google.cloud.vision")
    except ImportError as e:
        print(f"   ❌ ERROR: Failed to import google.cloud.vision: {e}")
        print("   Try: pip install google-cloud-vision")
        return False
    except Exception as e:
        print(f"   ❌ ERROR: Unexpected import error: {e}")
        return False
    
    # Try to create Vision client
    print(f"\n4. Client Creation Test:")
    try:
        client = vision.ImageAnnotatorClient()
        print("   ✅ Successfully created ImageAnnotatorClient")
    except Exception as e:
        print(f"   ❌ ERROR: Failed to create client: {e}")
        print(f"   Error type: {type(e).__name__}")
        import traceback
        print(f"   Full traceback:\n{traceback.format_exc()}")
        return False
    
    # Try a simple API call (this will test actual authentication)
    print(f"\n5. API Authentication Test:")
    try:
        # Create a simple test image (1x1 pixel)
        from PIL import Image
        import io
        
        # Create a tiny test image
        test_image = Image.new('RGB', (1, 1), color='white')
        img_byte_arr = io.BytesIO()
        test_image.save(img_byte_arr, format='PNG')
        img_byte_arr = img_byte_arr.getvalue()
        
        # Test the API
        image = vision.Image(content=img_byte_arr)
        response = client.text_detection(image=image)
        
        print("   ✅ Successfully called Vision API!")
        print(f"   Response received (no text expected from 1x1 white pixel)")
        
        if response.error.message:
            print(f"   ⚠️  API returned error: {response.error.message}")
        else:
            print("   ✅ No API errors")
            
    except Exception as e:
        print(f"   ❌ ERROR: API call failed: {e}")
        print(f"   Error type: {type(e).__name__}")
        import traceback
        print(f"   Full traceback:\n{traceback.format_exc()}")
        return False
    
    print(f"\n" + "=" * 50)
    print("🎉 ALL TESTS PASSED! Google Vision API is working correctly.")
    print("The issue is likely in your Flask application, not the credentials.")
    print("=" * 50)
    return True

if __name__ == "__main__":
    print("Starting Google Cloud Vision API test...")
    print("Make sure you have set GOOGLE_APPLICATION_CREDENTIALS before running this script.")
    print()
    
    success = test_google_vision_api()
    
    if not success:
        print("\n❌ Test failed. Please fix the issues above before proceeding.")
        sys.exit(1)
    else:
        print("\n✅ Test completed successfully!")
        sys.exit(0)

