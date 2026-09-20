const jwt = require('jsonwebtoken');
const User = require('../models/User');

function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '2d' }
  );
}

async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(409).json({ message: 'An account with that email already exists.' });

    const user = await User.create({ name, email: normalizedEmail, password, role: 'member' });
    res.status(201).json({
      message: 'Registration successful.',
      token: signToken(user),
      user: user.toJSON()
    });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed.', error: error.message });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    res.json({ message: 'Login successful.', token: signToken(user), user: user.toJSON() });
  } catch (error) {
    res.status(500).json({ message: 'Login failed.', error: error.message });
  }
}

async function me(req, res) {
  res.json({ user: req.user.toJSON() });
}

module.exports = { register, login, me };
