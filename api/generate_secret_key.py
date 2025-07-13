#!/usr/bin/env python3
"""
Generate a secure secret key for JobTract Flask application
Run this script to generate a cryptographically secure secret key
"""

import secrets

def generate_secret_key():
    """Generate a cryptographically secure secret key"""
    # Generate a 32-byte (256-bit) random key and encode as URL-safe base64
    secret_key = secrets.token_urlsafe(32)
    return secret_key

if __name__ == "__main__":
    print("JobTract Secret Key Generator")
    print("=" * 40)
    
    # Generate a new secret key
    new_key = generate_secret_key()
    
    print(f"Your new secret key is:")
    print(f"{new_key}")
    print()
    print("IMPORTANT:")
    print("1. Copy this key to your .env file as: SECRET_KEY={new_key}")
    print("2. Keep this key secure and never share it publicly")
    print("3. Use a different key for production vs development")
    print("4. If this key is compromised, generate a new one immediately")
    print()
    print("Example .env file entry:")
    print(f"SECRET_KEY={new_key}")

