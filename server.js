const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt'); // Corrected from bcryptjs
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');
require('dotenv').config();

console.log("Loaded DATABASE_URL:", process.env.DATABASE_URL);


// Check for required environment variables
if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is required in .env file');
    process.exit(1);
}

if (!process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET is required in .env file');
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test database connection
pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('❌ Database connection error:', err);
    process.exit(-1);
});

// Test database connection on startup
const testConnection = async () => {
    try {
        const client = await pool.connect();
        console.log('✅ Database connection test successful');
        client.release();
    } catch (err) {
        console.error('❌ Database connection test failed:', err.message);
        console.error('Please check your DATABASE_URL in the .env file');
        process.exit(1);
    }
};

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET ;

// Google OAuth Client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Nodemailer configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_APP_PASSWORD || 'loib jnak cfcd uqmd'
  }
});


// In-memory storage for OTP (in production, use Redis or database)
const otpStorage = new Map();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Authentication Routes

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Check if user already exists
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Create user
        const result = await pool.query(
            'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
            [email, passwordHash]
        );

        const user = result.rows[0];

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'User created successfully',
            token,
            user: { id: user.id, email: user.email }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const result = await pool.query(
            'SELECT id, email, password_hash FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        // Check if user has a password (not Google-only user)
        if (!user.password_hash) {
            return res.status(401).json({ error: 'This account was created with Google. Please use "Continue with Google" to login.' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, email: user.email }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/google
app.post('/api/auth/google', async (req, res) => {
    try {
        const { token } = req.body;
        console.log('Google OAuth request received');

        if (!token) {
            console.log('No Google token provided');
            return res.status(400).json({ error: 'Google token is required' });
        }

        console.log('Verifying Google token with client ID:', process.env.GOOGLE_CLIENT_ID);

        // Verify the Google token
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { email, name, sub: googleId } = payload;
        console.log('Google token verified for user:', email);

        // Check if user already exists
        let result = await pool.query(
            'SELECT id, email, google_id, password_hash FROM users WHERE email = $1',
            [email]
        );

        let user;
        if (result.rows.length === 0) {
            // Create new user with Google ID
            result = await pool.query(
                'INSERT INTO users (email, password_hash, google_id) VALUES ($1, $2, $3) RETURNING id, email',
                [email, null, googleId] // No password for Google users
            );
            user = result.rows[0];
        } else {
            const existingUser = result.rows[0];
            
            // Check if user has a password (registered with email/password)
            if (existingUser.password_hash && !existingUser.google_id) {
                return res.status(400).json({ 
                    error: 'An account with this email already exists. Please login with your password or use "Continue with Google" if you registered with Google.' 
                });
            }
            
            // Update existing user with Google ID if not already set
            if (!existingUser.google_id) {
                await pool.query(
                    'UPDATE users SET google_id = $1 WHERE email = $2',
                    [googleId, email]
                );
            }
            user = existingUser;
        }

        // Generate JWT token
        const jwtToken = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Google authentication successful',
            token: jwtToken,
            user: { id: user.id, email: user.email }
        });

    } catch (error) {
        console.error('Google auth error:', error);
        console.error('Error details:', error.message);
        res.status(500).json({ error: 'Google authentication failed: ' + error.message });
    }
});

// OTP Routes

// POST /api/auth/forgot-password
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Check if user exists and has a password (not Google-only user)
        const result = await pool.query(
            'SELECT id, email FROM users WHERE email = $1 AND password_hash IS NOT NULL',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No account found with this email or account was created with Google' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store OTP with expiration (5 minutes)
        otpStorage.set(email, {
            otp: otp,
            expires: Date.now() + 5 * 60 * 1000 // 5 minutes
        });

        // Send OTP email
        const mailOptions = {
            from: process.env.EMAIL_USER || 'your-email@gmail.com',
            to: email,
            subject: 'Password Reset OTP - E-commerce Store',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Password Reset Request</h2>
                    <p>You requested a password reset for your account.</p>
                    <p>Your OTP is: <strong style="font-size: 24px; color: #3498db;">${otp}</strong></p>
                    <p>This OTP will expire in 5 minutes.</p>
                    <p>If you didn't request this, please ignore this email.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);

        res.json({ message: 'OTP sent to your email' });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
});

// POST /api/auth/verify-otp
app.post('/api/auth/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ error: 'Email and OTP are required' });
        }

        const storedData = otpStorage.get(email);

        if (!storedData) {
            return res.status(400).json({ error: 'OTP not found or expired' });
        }

        if (Date.now() > storedData.expires) {
            otpStorage.delete(email);
            return res.status(400).json({ error: 'OTP expired' });
        }

        if (storedData.otp !== otp) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        // Generate a temporary token for password reset
        const resetToken = jwt.sign(
            { email: email, purpose: 'password_reset' },
            JWT_SECRET,
            { expiresIn: '10m' }
        );

        // Remove OTP after successful verification
        otpStorage.delete(email);

        res.json({ 
            message: 'OTP verified successfully',
            resetToken: resetToken
        });

    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({ error: 'OTP verification failed' });
    }
});

// POST /api/auth/reset-password
app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;

        if (!resetToken || !newPassword) {
            return res.status(400).json({ error: 'Reset token and new password are required' });
        }

        // Verify reset token
        const decoded = jwt.verify(resetToken, JWT_SECRET);
        
        if (decoded.purpose !== 'password_reset') {
            return res.status(400).json({ error: 'Invalid reset token' });
        }

        // Hash new password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);

        // Update password in database
        await pool.query(
            'UPDATE users SET password_hash = $1 WHERE email = $2',
            [passwordHash, decoded.email]
        );

        res.json({ message: 'Password reset successfully' });

    } catch (error) {
        console.error('Password reset error:', error);
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            res.status(400).json({ error: 'Invalid or expired reset token' });
        } else {
            res.status(500).json({ error: 'Password reset failed' });
        }
    }
});

// Product Routes

// GET /api/products
// GET /api/products
app.get('/api/products', async (req, res) => {
    try {
        const { category, min_price, max_price } = req.query;
        let query = 'SELECT * FROM products';
        let params = [];
        let whereClause = [];
        let paramIndex = 1;

        // Add category filter if present
        if (category) {
            whereClause.push(`category = $${paramIndex++}`);
            params.push(category);
        }

        // Add min_price filter if present and is a valid number
        if (min_price && !isNaN(parseFloat(min_price))) {
            whereClause.push(`price >= $${paramIndex++}`);
            params.push(parseFloat(min_price));
        }

        // Add max_price filter if present and is a valid number
        if (max_price && !isNaN(parseFloat(max_price))) {
            whereClause.push(`price <= $${paramIndex++}`);
            params.push(parseFloat(max_price));
        }

        // Construct the full query with WHERE clauses
        if (whereClause.length > 0) {
            query += ' WHERE ' + whereClause.join(' AND ');
        }

        query += ' ORDER BY created_at DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);

    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/products/:id
app.get('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'SELECT * FROM products WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Cart Routes

// POST /api/cart
app.post('/api/cart', authenticateToken, async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const userId = req.user.userId;

        if (!productId || !quantity || quantity <= 0) {
            return res.status(400).json({ error: 'Product ID and valid quantity are required' });
        }

        // Check if product exists
        const productResult = await pool.query(
            'SELECT id, stock_quantity FROM products WHERE id = $1',
            [productId]
        );

        if (productResult.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const product = productResult.rows[0];

        if (product.stock_quantity < quantity) {
            return res.status(400).json({ error: 'Insufficient stock' });
        }

        // Check if item already exists in cart
        const existingCartItem = await pool.query(
            'SELECT id, quantity FROM cart WHERE user_id = $1 AND product_id = $2',
            [userId, productId]
        );

        if (existingCartItem.rows.length > 0) {
            // Update existing cart item
            const newQuantity = existingCartItem.rows[0].quantity + quantity;
            
            if (product.stock_quantity < newQuantity) {
                return res.status(400).json({ error: 'Insufficient stock for requested quantity' });
            }

            await pool.query(
                'UPDATE cart SET quantity = $1 WHERE id = $2',
                [newQuantity, existingCartItem.rows[0].id]
            );

            res.json({ message: 'Cart item updated successfully' });
        } else {
            // Add new item to cart
            await pool.query(
                'INSERT INTO cart (user_id, product_id, quantity) VALUES ($1, $2, $3)',
                [userId, productId, quantity]
            );

            res.status(201).json({ message: 'Item added to cart successfully' });
        }

    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/cart/:userId
app.get('/api/cart/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;

        // Verify user can only access their own cart
        if (parseInt(userId) !== req.user.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const result = await pool.query(
            `SELECT c.id, c.quantity, c.created_at, p.id as product_id, p.name, p.description, 
            p.price, p.image_url, p.category
            FROM cart c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = $1
            ORDER BY c.created_at DESC`,
            [userId]
        );

        res.json(result.rows);

    } catch (error) {
        console.error('Get cart error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/cart/:id
app.delete('/api/cart/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        // Verify the cart item belongs to the user
        const cartItem = await pool.query(
            'SELECT id FROM cart WHERE id = $1 AND user_id = $2',
            [id, userId]
        );

        if (cartItem.rows.length === 0) {
            return res.status(404).json({ error: 'Cart item not found' });
        }

        await pool.query('DELETE FROM cart WHERE id = $1', [id]);

        res.json({ message: 'Item removed from cart successfully' });

    } catch (error) {
        console.error('Remove from cart error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/cart/:id (Update quantity)
app.put('/api/cart/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity } = req.body;
        const userId = req.user.userId;

        if (!quantity || quantity <= 0) {
            return res.status(400).json({ error: 'Valid quantity is required' });
        }

        // Get cart item with product info
        const cartItem = await pool.query(
            `SELECT c.id, c.product_id, p.stock_quantity 
            FROM cart c
            JOIN products p ON c.product_id = p.id
            WHERE c.id = $1 AND c.user_id = $2`,
            [id, userId]
        );

        if (cartItem.rows.length === 0) {
            return res.status(404).json({ error: 'Cart item not found' });
        }

        const product = cartItem.rows[0];

        if (product.stock_quantity < quantity) {
            return res.status(400).json({ error: 'Insufficient stock' });
        }

        await pool.query(
            'UPDATE cart SET quantity = $1 WHERE id = $2',
            [quantity, id]
        );

        res.json({ message: 'Cart item updated successfully' });

    } catch (error) {
        console.error('Update cart error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ message: 'Server is running', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
const startServer = async () => {
    try {
        // Test database connection first
        await testConnection();

        // Start the server
        app.listen(PORT, () => {
            console.log(`🚀 Server is running on port ${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
            console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
};

// Start the server

startServer();
