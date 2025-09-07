
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image_url VARCHAR(500),
    category VARCHAR(100) NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create cart table
CREATE TABLE IF NOT EXISTS cart (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_cart_user_id ON cart(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_product_id ON cart(product_id);

-- Insert sample products
INSERT INTO products (name, description, price, image_url, category, stock_quantity) VALUES
('Wireless Headphones', 'High-quality wireless headphones with noise cancellation', 199.99, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500', 'Electronics', 50),
('Smartphone', 'Latest model smartphone with advanced camera features', 899.99, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500', 'Electronics', 25),
('Running Shoes', 'Comfortable running shoes for all terrains', 129.99, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500', 'Sports', 100),
('Coffee Maker', 'Automatic coffee maker with programmable features', 89.99, 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500', 'Home & Kitchen', 30),
('Laptop', 'High-performance laptop for work and gaming', 1299.99, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500', 'Electronics', 15),
('Yoga Mat', 'Non-slip yoga mat for home workouts', 39.99, 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=500', 'Sports', 75),
('Blender', 'High-speed blender for smoothies and food prep', 79.99, 'https://images.unsplash.com/photo-1585515656519-4b0a0b4b8b8b?w=500', 'Home & Kitchen', 40),
('T-Shirt', 'Comfortable cotton t-shirt in various colors', 24.99, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500', 'Clothing', 200);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update the updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cart_updated_at BEFORE UPDATE ON cart
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
