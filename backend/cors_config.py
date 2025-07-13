"""
CORS Configuration Module
Handles Cross-Origin Resource Sharing for the Jobtract application
"""

import os
from flask_cors import CORS

def configure_cors(app):
    """
    Configure CORS for the Flask application with comprehensive origin support
    """
    
    # Development origins - covers all common development ports
    development_origins = [
        "http://localhost:3000",
        "http://localhost:3001", 
        "http://localhost:5000",
        "http://localhost:5001",
        "http://localhost:8000",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:5000", 
        "http://127.0.0.1:5001",
        "http://127.0.0.1:8000",
        "http://127.0.0.1:8080"
    ]
    
    # Production origins from environment
    production_origins = []
    if os.getenv('FRONTEND_URL'):
        production_origins.append(os.getenv('FRONTEND_URL'))
    if os.getenv('PRODUCTION_DOMAIN'):
        production_origins.extend([
            f"https://{os.getenv('PRODUCTION_DOMAIN')}",
            f"http://{os.getenv('PRODUCTION_DOMAIN')}"
        ])
    
    # Combine all allowed origins
    allowed_origins = development_origins + production_origins
    
    # Configure CORS with comprehensive settings
    CORS(app, 
         origins=allowed_origins,
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
         allow_headers=[
             'Content-Type', 
             'Authorization', 
             'Access-Control-Allow-Credentials',
             'Access-Control-Allow-Origin',
             'Access-Control-Allow-Headers',
             'Access-Control-Allow-Methods',
             'X-Requested-With',
             'Accept',
             'Origin'
         ],
         supports_credentials=True,
         expose_headers=['Content-Range', 'X-Content-Range']
    )
    
    # Add preflight handling for all routes
    @app.before_request
    def handle_preflight():
        from flask import request
        if request.method == "OPTIONS":
            from flask import make_response
            response = make_response()
            response.headers.add("Access-Control-Allow-Origin", "*")
            response.headers.add('Access-Control-Allow-Headers', "*")
            response.headers.add('Access-Control-Allow-Methods', "*")
            return response

    print(f"🔧 CORS configured for origins: {allowed_origins}")
    return app

