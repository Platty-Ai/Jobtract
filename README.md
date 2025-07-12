# JobTract - Construction Management Platform

**Tagline:** All the tools you need, off the jobsite.

## Overview

JobTract is a revolutionary AI-powered construction management platform designed specifically for contractors and construction professionals. It provides comprehensive business management tools, intelligent automation, and seamless integration of all construction-related workflows.

## Features

### Core Business Management
- **Equipment Management:** Track tools, machinery, and equipment with maintenance scheduling
- **Expense Management:** OCR receipt processing and automated expense tracking
- **Project Management:** Comprehensive project tracking and management
- **Quote Management:** Intelligent quoting system with line item management

### AI-Powered Intelligence
- **Permit Intelligence:** Vancouver permit search and lead generation
- **Building Code Database:** Comprehensive building code reference system
- **AI Agents:** Specialized trade experts for HVAC, electrical, plumbing, and general construction

### Workforce & Compliance
- **User Management:** Multi-user support with role-based permissions
- **Safety Management:** WCB and safety compliance tracking
- **Payroll Integration:** Workforce management and payroll systems

## Technology Stack

### Backend
- **Framework:** Flask (Python)
- **Database:** Neon PostgreSQL
- **Authentication:** JWT-based authentication
- **File Storage:** Secure file upload and management
- **APIs:** RESTful API design

### Frontend
- **Framework:** React
- **Styling:** Modern responsive design
- **State Management:** React hooks and context
- **API Integration:** Axios for backend communication

## Architecture

JobTract follows a modern microservice-inspired architecture with:
- Secure authentication and authorization
- Scalable database design with user isolation
- RESTful API endpoints
- Responsive frontend design
- Cloud-native deployment ready

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- SQL injection prevention
- CORS configuration
- Secure file upload handling
- Environment-based configuration

## Getting Started

### Prerequisites
- Python 3.8+
- Node.js 14+
- PostgreSQL database (Neon recommended)

### Backend Setup
1. Install dependencies: `pip install -r requirements.txt`
2. Configure environment variables in `.env`
3. Run the application: `python app.py`

### Frontend Setup
1. Install dependencies: `npm install`
2. Configure environment variables
3. Start development server: `npm start`

## Environment Configuration

### Backend (.env)
```
JWT_SECRET_KEY=your-jwt-secret
FLASK_SECRET_KEY=your-flask-secret
DATABASE_URL=your-database-url
GOOGLE_APPLICATION_CREDENTIALS=path-to-credentials
```

### Frontend
```
REACT_APP_API_URL=your-backend-url
```

## API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `POST /api/logout` - User logout

### Equipment Management
- `GET /api/equipment` - Get user equipment
- `POST /api/equipment` - Add new equipment
- `PUT /api/equipment/<id>` - Update equipment
- `DELETE /api/equipment/<id>` - Delete equipment

### Expense Management
- `GET /api/expenses` - Get user expenses
- `POST /api/expenses` - Add new expense
- `PUT /api/expenses/<id>` - Update expense
- `DELETE /api/expenses/<id>` - Delete expense

### Project Management
- `GET /api/projects` - Get user projects
- `POST /api/projects` - Create new project
- `PUT /api/projects/<id>` - Update project
- `DELETE /api/projects/<id>` - Delete project

### Quote Management
- `GET /api/quotes` - Get user quotes
- `POST /api/quotes` - Create new quote
- `PUT /api/quotes/<id>` - Update quote
- `DELETE /api/quotes/<id>` - Delete quote

### Permit Intelligence
- `GET /api/vancouver-permits` - Search Vancouver permits
- `GET /api/building-codes` - Access building code database

## Database Schema

The application uses a PostgreSQL database with the following main tables:
- `users` - User authentication and profiles
- `equipment` - Equipment tracking and management
- `expenses` - Expense records and receipts
- `projects` - Project information and tracking
- `quotes` - Quote generation and management

## Contributing

This codebase represents a production-ready construction management platform. All sensitive information has been redacted for security purposes.

## License

Proprietary - JobTract Construction Management Platform

## Contact

For more information about JobTract, please visit our website or contact our development team.

---

**Note:** This repository contains the complete JobTract codebase with sensitive information redacted for security purposes. To run the application, you'll need to configure your own environment variables and credentials.

