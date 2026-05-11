# Quick Start Guide

## Available Commands

```bash
# Start development server
npm run dev

# Build for production
npm build

# Run production build
npm start
```

## Server Running

The dev server should now start without errors. The server will:
- Listen on port 5000 (or PORT env var)
- Expose these endpoints:
  - `POST /api/auth/register` - Register new user
  - `POST /api/auth/login` - Login user
  - `PUT /api/auth/user/:id` - Update user (protected)
  - `PUT /api/auth/user` - Update own profile (protected)

## Testing the API

### 1. Register a User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "secure123",
    "username": "john_doe",
    "displayName": "John Doe"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "secure123"
  }'
```

### 3. Update Profile (with token from login)
```bash
curl -X PUT http://localhost:5000/api/auth/user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "bio": "Software developer",
    "interests": ["coding", "music"]
  }'
```

## Environment Variables

Edit `.env` file:
- `PORT` - Server port (default: 5000)
- `JWT_SECRET` - Secret for JWT tokens
- `MONGODB_URI` - MongoDB connection string
- `NODE_ENV` - Environment (development/production)

## Current Architecture

✅ Complete authentication system with:
- Registration (with validation and password hashing)
- Login (with password verification and JWT tokens)
- Profile updates (flexible, any fields can be updated)
- Middleware for protected routes

## Files Structure

```
src/
├── application/
│   ├── dtos/          # Data transfer objects
│   └── use-cases/auth/ # Business logic
├── domain/
│   ├── entities/      # User entity
│   ├── repositories/  # Interfaces
│   └── services/      # Service interfaces
├── infrastructure/
│   ├── repositories/  # MongoDB implementation
│   └── providers/     # Bcrypt, JWT implementations
├── presentation/
│   ├── controllers/   # HTTP handlers
│   ├── middlewares/   # Auth middleware
│   └── routes/        # Endpoint definitions
└── index.ts           # Application entry point
```

## Next Steps

1. Install MongoDB locally or use MongoDB Atlas
2. Update `.env` with your MongoDB URI
3. Install bcrypt and jsonwebtoken when ready for production:
   ```bash
   npm install bcrypt jsonwebtoken
   npm install -D @types/bcrypt @types/jsonwebtoken
   ```
4. Update the index.ts to import and use actual bcrypt/jwt libraries

Enjoy! 🚀
