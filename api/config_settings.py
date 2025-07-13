"""
Configuration settings for Jobtract application
"""
import os
import secrets
from datetime import timedelta

class Config:
    """Base configuration"""
    
    # Flask settings
    SECRET_KEY = os.environ.get('SECRET_KEY') or secrets.token_hex(32)
    DEBUG = False
    TESTING = False
    
    # Security settings
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or secrets.token_hex(32)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    
    # CORS settings
    CORS_ORIGINS = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3001',
        'http://localhost:5001',
        'http://127.0.0.1:5001'
    ]
    
    # Rate limiting
    RATE_LIMIT_ENABLED = True
    RATE_LIMIT_MAX_ATTEMPTS = 5
    RATE_LIMIT_WINDOW_MINUTES = 15
    
    # Google Cloud settings
    GOOGLE_CREDENTIALS_PATH = os.environ.get('GOOGLE_CREDENTIALS_PATH', 'E:\\JSON\\jobtract-b4ccb825e63d.json')
    
    # Database settings (for future use)
    DATABASE_URL = os.environ.get('DATABASE_URL')
    
    # Logging
    LOG_LEVEL = 'INFO'
    
    @staticmethod
    def get_config():
        """Get configuration dictionary for API responses"""
        return {
            'cors_origins': Config.CORS_ORIGINS,
            'database_configured': bool(Config.DATABASE_URL),
            'debug_mode': Config.DEBUG,
            'environment_configured': bool(os.environ.get('FLASK_ENV')),
            'google_credentials_configured': bool(Config.GOOGLE_CREDENTIALS_PATH and os.path.exists(Config.GOOGLE_CREDENTIALS_PATH)),
            'host': '0.0.0.0',
            'is_production': not Config.DEBUG,
            'jwt_secret_configured': bool(Config.JWT_SECRET_KEY),
            'log_level': Config.LOG_LEVEL,
            'port': 5000,
            'rate_limit': f"{Config.RATE_LIMIT_MAX_ATTEMPTS} per {Config.RATE_LIMIT_WINDOW_MINUTES} minutes",
            'redis_configured': False,
            'session_timeout': 3600
        }

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    LOG_LEVEL = 'DEBUG'

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DEBUG = True
    
    # Use in-memory or test database
    DATABASE_URL = 'sqlite:///:memory:'
    
    # Disable rate limiting for tests
    RATE_LIMIT_ENABLED = False

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    LOG_LEVEL = 'WARNING'
    
    # In production, these should be set via environment variables
    # We'll only validate them when actually using ProductionConfig
    @property
    def SECRET_KEY(self):
        key = os.environ.get('SECRET_KEY')
        if not key:
            raise ValueError("SECRET_KEY environment variable must be set in production")
        return key
    
    @property
    def JWT_SECRET_KEY(self):
        key = os.environ.get('JWT_SECRET_KEY')
        if not key:
            raise ValueError("JWT_SECRET_KEY environment variable must be set in production")
        return key

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

