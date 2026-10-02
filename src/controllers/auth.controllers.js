const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // 1. Check required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                error: 'Name, email and password are required'
            });
        }

        // 2. Check if email already exists
        const existingUser = await db
            .prepare('SELECT id FROM users WHERE email = ?')
            .get(email);

        if (existingUser) {
            return res.status(409).json({
                error: 'Email already registered'
            });
        }

        // 3. Hash the password
        const hashedPassword = bcrypt.hashSync(password, 10);

        // 4. Insert user into database
        const result = await db.prepare(`
            INSERT INTO users (name, email, password)
            VALUES (?, ?, ?)
        `).run(name, email, hashedPassword);

        // 5. Send success response
        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: result.lastInsertRowid,
                name,
                email
            }
        });

    } catch (error) {
        // Two people registering the same email at the same moment
        if (error.code === '23505') {
            return res.status(409).json({
                error: 'Email already registered'
            });
        }

        console.error('Register error:', error);

        res.status(500).json({
            error: 'Internal server error'
        });
    }
};

// LOGIN
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Check required fields
        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password are required'
            });
        }

        // 2. Find user by email
        const user = await db
            .prepare('SELECT * FROM users WHERE email = ?')
            .get(email);

        // 3. Check if user exists
        if (!user) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }

        // 4. Compare password with hashed password
        const passwordMatch = bcrypt.compareSync(
            password,
            user.password
        );

        // 5. Check password
        if (!passwordMatch) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
   {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
    },
    process.env.JWT_SECRET,
    {
        expiresIn: '1h'
    }
);
        // 6. Login successful
        res.status(200).json({
            message: 'Login successful',
            token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login error:', error);

        res.status(500).json({
            error: 'Internal server error'
        });
    }
};

module.exports = {
    register ,
    login
};  