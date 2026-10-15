const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generates a JWT authentication token for the user.
function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '2d' }
  );
}

// Registers a new user account.
async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    // Checks that all required registration fields are provided.
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    // Ensures the password meets the minimum length requirement.
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    // Normalizes the email and checks whether the account already exists.
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(409).json({ message: 'An account with that email already exists.' });

    // Creates a new member account in the database.
    const user = await User.create({ name, email: normalizedEmail, password, role: 'member' });

    // Returns the registration confirmation, authentication token, and user details.
    res.status(201).json({
      message: 'Registration successful.',
      token: signToken(user),
      user: user.toJSON()
    });
  } catch (error) {
    // Returns an error if registration fails.
    res.status(500).json({ message: 'Registration failed.', error: error.message });
  }
}

// Authenticates a user and logs them into the application.
async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Checks that both email and password are provided.
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });

    // Retrieves the user account, including the password for verification.
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    // Verifies the user's credentials before allowing login.
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Returns the login confirmation, authentication token, and user details.
    res.json({ message: 'Login successful.', token: signToken(user), user: user.toJSON() });
  } catch (error) {
    // Returns an error if login fails.
    res.status(500).json({ message: 'Login failed.', error: error.message });
  }
}

// Returns the details of the currently authenticated user.
async function me(req, res) {
  res.json({ user: req.user.toJSON() });
}

// Exports the authentication functions for use in routes.
module.exports = { register, login, me };
