# E-Commerce PERN Stack Application

A full-stack e-commerce website built with PostgreSQL, Express.js, React, and Node.js (PERN stack).

## Features

- **User Authentication**: Secure registration and login with JWT tokens
- **Product Management**: Browse products with category filtering
- **Shopping Cart**: Add, remove, and update cart items
- **Responsive Design**: Mobile-friendly interface
- **Real-time Updates**: Dynamic cart and product management

## Tech Stack

- **Backend**: Node.js, Express.js, PostgreSQL
- **Frontend**: React.js
- **Authentication**: JWT (JSON Web Tokens)
- **Styling**: CSS3 with responsive design
- **Database**: PostgreSQL with sample data

## Project Structure

```
ecommerce/
├── schema.sql              # Database schema and sample data
├── server.js               # Backend Express server
├── package.json            # Backend dependencies
├── App.jsx                 # React frontend application
├── App.css                 # Frontend styling
├── frontend-package.json   # Frontend dependencies
└── README.md              # This file
```

## Local Development Setup

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### 1. Database Setup

1. **Install PostgreSQL** on your system
2. **Create a database**:
   ```sql
   CREATE DATABASE ecommerce_db;
   ```
3. **Run the schema**:
   ```bash
   psql -d ecommerce_db -f schema.sql
   ```

### 2. Backend Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Create environment file**:
   ```bash
   # Create .env file in the root directory
   touch .env
   ```

3. **Configure environment variables** in `.env`:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/ecommerce_db
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   NODE_ENV=development
   PORT=5000
   ```

4. **Start the backend server**:
   ```bash
   npm start
   # or for development with auto-restart:
   npm run dev
   ```

   The backend will be available at `http://localhost:5000`

### 3. Frontend Setup



1. **Create React app** (if not already created):
   ```bash
   npx create-react-app frontend
   cd frontend
   ```

2. **Replace the default files**:
   - Replace `src/App.js` with the provided `App.jsx`
   - Replace `src/App.css` with the provided `App.css`
   - Replace `package.json` with the provided `frontend-package.json`

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Create environment file**:
   ```bash
   # Create .env file in the frontend directory
   touch .env
   ```

5. **Configure environment variables** in `frontend/.env`:
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   ```

6. **Start the frontend**:
   ```bash
   npm start
   ```

   The frontend will be available at `http://localhost:3000`

   ### Google OAuth Setup
1. In Google Cloud Console, create OAuth 2.0 Client ID
2. Set **Authorized JavaScript origins** to:
   - http://localhost:3000 (for local dev)
   - https://your-frontend-url.com (for deployed app)
3. Add `REACT_APP_GOOGLE_CLIENT_ID` in frontend `.env`
4. Frontend sends Google token to backend `/api/auth/google` for verification


## Deployment Options

### Option 1: Deploy to Railway

Railway is a modern platform that makes it easy to deploy full-stack applications.

#### Backend Deployment

1. **Create Railway account** at [railway.app](https://railway.app)

2. **Connect your GitHub repository**:
   - Push your code to GitHub
   - Connect Railway to your repository

3. **Deploy the backend**:
   - Create a new project in Railway
   - Add a PostgreSQL service
   - Add a Node.js service for your backend
   - Set environment variables:
     ```
     DATABASE_URL=<railway-postgres-url>
     JWT_SECRET=<your-secret-key>
     NODE_ENV=production
     PORT=5000
     ```

4. **Run database migrations**:
   - Use Railway's console or connect to your database
   - Run the `schema.sql` file

#### Frontend Deployment

1. **Deploy to Vercel**:
   - Create account at [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Set build command: `npm run build`
   - Set output directory: `build`
   - Add environment variable:
     ```
     REACT_APP_API_URL=<your-railway-backend-url>/api
     ```

2. **Deploy to Netlify**:
   - Create account at [netlify.com](https://netlify.com)
   - Connect your GitHub repository
   - Set build command: `npm run build`
   - Set publish directory: `build`
   - Add environment variable:
     ```
     REACT_APP_API_URL=<your-railway-backend-url>/api
     ```

### Option 2: Deploy to Heroku

#### Backend Deployment

1. **Install Heroku CLI** and login:
   ```bash
   heroku login
   ```

2. **Create Heroku app**:
   ```bash
   heroku create your-app-name-backend
   ```

3. **Add PostgreSQL addon**:
   ```bash
   heroku addons:create heroku-postgresql:hobby-dev
   ```

4. **Set environment variables**:
   ```bash
   heroku config:set JWT_SECRET=your-super-secret-jwt-key
   heroku config:set NODE_ENV=production
   ```

5. **Deploy**:
   ```bash
   git add .
   git commit -m "Deploy backend"
   git push heroku main
   ```

6. **Run database migrations**:
   ```bash
   heroku run psql $DATABASE_URL -f schema.sql
   ```

#### Frontend Deployment

1. **Create separate Heroku app for frontend**:
   ```bash
   heroku create your-app-name-frontend
   ```

2. **Set buildpacks**:
   ```bash
   heroku buildpacks:set mars/create-react-app
   ```

3. **Set environment variable**:
   ```bash
   heroku config:set REACT_APP_API_URL=https://your-app-name-backend.herokuapp.com/api
   ```

4. **Deploy**:
   ```bash
   git subtree push --prefix=frontend heroku main
   ```

### Option 3: Deploy to DigitalOcean App Platform

1. **Create DigitalOcean account** at [digitalocean.com](https://digitalocean.com)

2. **Create a new app**:
   - Connect your GitHub repository
   - Add a PostgreSQL database
   - Add a Node.js service for backend
   - Add a static site for frontend

3. **Configure services**:
   - Backend: Set start command to `npm start`
   - Frontend: Set build command to `npm run build`
   - Set environment variables for both services

## Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://username:password@host:port/database
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=production
PORT=5000
```

### Frontend (.env)
```env
REACT_APP_API_URL=https://your-backend-url.com/api
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Products
- `GET /api/products` - Get all products
- `GET /api/products?category=Electronics` - Filter by category
- `GET /api/products/:id` - Get single product

### Cart
- `POST /api/cart` - Add item to cart (requires auth)
- `GET /api/cart/:userId` - Get user's cart (requires auth)
- `PUT /api/cart/:id` - Update cart item quantity (requires auth)
- `DELETE /api/cart/:id` - Remove item from cart (requires auth)

## Database Schema

### Users Table
- `id` (SERIAL PRIMARY KEY)
- `email` (VARCHAR UNIQUE)
- `password_hash` (VARCHAR)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Products Table
- `id` (SERIAL PRIMARY KEY)
- `name` (VARCHAR)
- `description` (TEXT)
- `price` (DECIMAL)
- `image_url` (VARCHAR)
- `category` (VARCHAR)
- `stock_quantity` (INTEGER)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Cart Table
- `id` (SERIAL PRIMARY KEY)
- `user_id` (INTEGER REFERENCES users)
- `product_id` (INTEGER REFERENCES products)
- `quantity` (INTEGER)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## Security Considerations

1. **JWT Secret**: Use a strong, random secret key in production
2. **HTTPS**: Always use HTTPS in production
3. **Environment Variables**: Never commit sensitive data to version control
4. **Database Security**: Use connection pooling and prepared statements
5. **Input Validation**: Validate all user inputs on both client and server
6. **CORS**: Configure CORS properly for production domains

## Troubleshooting

### Common Issues

1. **Database Connection Error**:
   - Check DATABASE_URL format
   - Ensure PostgreSQL is running
   - Verify database exists

2. **CORS Issues**:
   - Check if frontend URL is allowed in CORS settings
   - Verify API_URL environment variable

3. **JWT Token Issues**:
   - Check JWT_SECRET is set correctly
   - Verify token expiration settings

4. **Build Errors**:
   - Check Node.js version compatibility
   - Clear npm cache: `npm cache clean --force`
   - Delete node_modules and reinstall

### Getting Help

- Check the console for error messages
- Verify all environment variables are set
- Test API endpoints with tools like Postman
- Check database connection and schema

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
