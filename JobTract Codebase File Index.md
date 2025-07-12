# JobTract Codebase File Index

## Main Application Files

### Backend (Flask/Python)
- [app.py](backend/app.py) - Main Flask application with all API endpoints
- [requirements.txt](backend/requirements.txt) - Python dependencies
- [.env](backend/.env) - Environment configuration (sensitive data redacted)

### Authentication & Security
- [auth_routes.py](backend/auth_routes.py) - Authentication routes and JWT handling
- [security_config.py](backend/security_config.py) - Security configuration and middleware
- [user_model.py](backend/user_model.py) - User data models and database operations

### Business Logic Modules
- [expense_model.py](backend/expense_model.py) - Expense management data models
- [expense_routes.py](backend/expense_routes.py) - Expense API endpoints
- [ocr_service.py](backend/ocr_service.py) - OCR receipt processing service
- [receipt_ocr.py](backend/receipt_ocr.py) - Receipt OCR implementation

### Configuration & Utilities
- [config_settings.py](backend/config_settings.py) - Application configuration
- [cors_config.py](backend/cors_config.py) - CORS configuration
- [thread_safe_data_manager.py](backend/thread_safe_data_manager.py) - Thread-safe data management

### Development & Testing
- [debug_backend.py](backend/debug_backend.py) - Backend debugging utilities
- [test_vision_api.py](backend/test_vision_api.py) - Google Vision API testing
- [generate_secret_key.py](backend/generate_secret_key.py) - Security key generation

### Frontend (React)
- [src/App.js](frontend/src/App.js) - Main React application component
- [src/index.js](frontend/src/index.js) - React application entry point
- [package.json](frontend/package.json) - Node.js dependencies and scripts
- [index.html](frontend/index.html) - HTML template

### Frontend Components
- [src/components/](frontend/src/components/) - React components directory
- [src/pages/](frontend/src/pages/) - Page components
- [src/services/](frontend/src/services/) - API service modules
- [src/utils/](frontend/src/utils/) - Utility functions

### Frontend Styling
- [src/styles/](frontend/src/styles/) - CSS and styling files
- [src/assets/](frontend/src/assets/) - Static assets and images

## Key Features Implemented

### Equipment Management
- Equipment tracking and maintenance scheduling
- Equipment categories and specifications
- User-specific equipment isolation

### Expense Management
- OCR receipt processing with Google Vision API
- Expense categorization and tracking
- Photo attachment support
- GST/PST tax handling

### Project Management
- Project creation and tracking
- Project-specific data organization
- Timeline and milestone management

### Quote Management
- Line item quote generation
- Quote templates and customization
- Client communication integration

### Permit Intelligence
- Vancouver permit search and filtering
- Building permit lead generation
- Permit data analysis and insights

### User Management
- JWT-based authentication
- User registration and login
- Password security with bcrypt
- Session management

### Database Integration
- Neon PostgreSQL integration
- User data isolation
- Secure database operations
- Migration and schema management

## Architecture Overview

### Backend Architecture
- **Flask Framework:** RESTful API design
- **Database:** Neon PostgreSQL with connection pooling
- **Authentication:** JWT tokens with secure secret keys
- **File Upload:** Secure file handling with validation
- **OCR Processing:** Google Vision API integration
- **Security:** CORS, input validation, SQL injection prevention

### Frontend Architecture
- **React Framework:** Component-based UI architecture
- **State Management:** React hooks and context API
- **API Integration:** Axios for backend communication
- **Responsive Design:** Mobile-first responsive layouts
- **Build System:** Create React App with custom configuration

### Security Features
- Password hashing with bcrypt
- JWT token authentication
- Environment variable configuration
- Secure file upload validation
- SQL injection prevention
- CORS policy enforcement

## Development Notes

### Environment Setup
- Backend requires Python 3.8+ and pip dependencies
- Frontend requires Node.js 14+ and npm packages
- Database requires Neon PostgreSQL connection
- Google Cloud credentials needed for OCR functionality

### Configuration Requirements
- JWT secret keys for authentication
- Database connection strings
- Google Cloud service account credentials
- CORS origin configuration
- File upload directory permissions

### API Documentation
- RESTful endpoints following standard conventions
- JSON request/response format
- Error handling with appropriate HTTP status codes
- Authentication required for protected endpoints
- User data isolation enforced at database level

This file index provides a comprehensive overview of the JobTract codebase structure and key components for analysis and development purposes.

