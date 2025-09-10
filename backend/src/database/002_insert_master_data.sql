-- ========================================
-- RETAILVERSE - MASTER DATA INSERTION
-- ========================================
-- This script inserts master data for categories and subcategories
-- Run this after creating the schema

-- ========================================
-- INSERT CATEGORIES AND SUBCATEGORIES
-- ========================================
INSERT INTO categories_subcategories (category, sub_category) VALUES
-- Makeup Category
('Makeup', 'Face'),
('Makeup', 'Eyes'),
('Makeup', 'Lips'),
('Makeup', 'Nail'),

-- Skin Category
('Skin', 'Moisturizers'),
('Skin', 'Cleansers'),
('Skin', 'Masks'),
('Skin', 'Toners'),
('Skin', 'Body Care'),
('Skin', 'Eye Care'),
('Skin', 'Lip Care'),
('Skin', 'Sun Care'),

-- Hair Category
('Hair', 'Hair Care'),

-- Bath & Body Category
('Bath & Body', 'Bath & Shower'),
('Bath & Body', 'Shaving & Hair Removal'),
('Bath & Body', 'Men''s Grooming'),
('Bath & Body', 'Hands & Feet'),
('Bath & Body', 'Hygiene Essentials'),
('Bath & Body', 'Oral Care'),

-- Mom & Baby Category
('Mom & Baby', 'Baby Care'),
('Mom & Baby', 'Maternity Care'),
('Mom & Baby', 'Kids Care'),
('Mom & Baby', 'Nursing & Feeding'),

-- Health & Wellness Category
('Health & Wellness', 'Health Supplements'),
('Health & Wellness', 'Beauty Supplements'),
('Health & Wellness', 'Sports Nutrition'),
('Health & Wellness', 'Weight Management'),
('Health & Wellness', 'Health Foods'),

-- Electronics Category
('Electronics', 'Mobile & Accessories'),
('Electronics', 'Computers & Laptops'),
('Electronics', 'Home Appliances'),
('Electronics', 'Audio & Video'),

-- Fashion Category
('Fashion', 'Men''s Clothing'),
('Fashion', 'Women''s Clothing'),
('Fashion', 'Kids'' Clothing'),
('Fashion', 'Footwear'),
('Fashion', 'Accessories'),

-- Home & Garden Category
('Home & Garden', 'Furniture'),
('Home & Garden', 'Home Decor'),
('Home & Garden', 'Kitchen & Dining'),
('Home & Garden', 'Garden & Outdoor'),

-- Sports Category
('Sports', 'Fitness Equipment'),
('Sports', 'Sports Apparel'),
('Sports', 'Outdoor Gear'),
('Sports', 'Team Sports'),

-- Beauty Category (General)
('Beauty', 'Skincare'),
('Beauty', 'Makeup'),
('Beauty', 'Hair Care'),
('Beauty', 'Fragrance'),

-- Food & Beverage Category
('Food & Beverage', 'Snacks'),
('Food & Beverage', 'Beverages'),
('Food & Beverage', 'Dairy Products'),
('Food & Beverage', 'Frozen Foods'),

-- Automotive Category
('Automotive', 'Car Care'),
('Automotive', 'Accessories'),
('Automotive', 'Tools & Equipment'),
('Automotive', 'Parts & Spares');

-- ========================================
-- CREATE DEFAULT ADMIN USER
-- ========================================
-- Note: Password is 'admin123' (hashed with bcrypt)
INSERT INTO users (email, password, role, first_name, last_name, is_active, email_verified) VALUES
('admin@retailverse.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8Kz8Kz2', 'admin', 'System', 'Admin', true, true);

-- ========================================
-- VERIFY DATA INSERTION
-- ========================================
-- Check categories count
SELECT 'Categories inserted: ' || COUNT(DISTINCT category) as result FROM categories_subcategories;

-- Check subcategories count
SELECT 'Subcategories inserted: ' || COUNT(*) as result FROM categories_subcategories;

-- Check admin user
SELECT 'Admin user created: ' || email as result FROM users WHERE role = 'admin';

-- ========================================
-- MASTER DATA INSERTION COMPLETE
-- ========================================
-- Database is now ready for use with:
-- - 11 main categories
-- - 50+ subcategories
-- - Default admin user (admin@retailverse.com / admin123)
