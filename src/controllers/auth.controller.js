const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models'); // Assuming models/index.js exports User
const jwtConfig = require('../../config/jwt.config');

const SALT_ROUNDS = 10;
// Placeholder for JWT secret, will be moved to jwt.config.js
// const JWT_SECRET_KEY = process.env.JWT_SECRET || 'YOUR_DEFAULT_VERY_SECRET_KEY_FOR_DEVELOPMENT';


/**
 * Handles new user registration.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 1. Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    // 2. Check for existing user
    const existingUser = await User.findOne({
      where: {
        [User.sequelize.Op.or]: [{ email }, { username }]
      }
    });

    if (existingUser) {
      const field = existingUser.email === email ? 'Email' : 'Username';
      return res.status(409).json({ message: `${field} already in use.` });
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // 4. Create new user
    const newUser = await User.create({
      username,
      email,
      password_hash: hashedPassword
    });

    // 5. Send success response (excluding password)
    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    // Check for Sequelize validation errors
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(err => err.message);
      return res.status(400).json({ message: 'Validation error', errors: messages });
    }
    res.status(500).json({ message: 'Internal server error during signup.' });
  }
};

/**
 * Handles user login.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body; // Or allow login with username

    // 1. Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email (or username) and password are required.' });
    }

    // 2. Find user by email (or username)
    // For simplicity, using email only for now. Can be extended for username.
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials. User not found.' });
    }

    // 3. Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials. Password incorrect.' });
    }

    // 4. Generate JWT
    // Note: 'YOUR_SECRET_KEY' should be from an environment variable (jwtConfig.secret)
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      jwtConfig.secret, // Replace with jwtConfig.secret later
      { expiresIn: jwtConfig.expiresIn } // Token expiration time
    );

    // 5. Send 200 response with the token
    res.status(200).json({
      message: 'Login successful',
      token,
      user: { // Optionally send back some user info
        id: user.id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error during login.' });
  }
};

module.exports = {
  signup,
  login
};
