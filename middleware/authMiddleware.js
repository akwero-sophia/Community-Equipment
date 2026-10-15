const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Extracts the authentication token from the request headers.
function getToken(req) {
  const header = req.headers.authorization || '';

  // Returns the token if the header uses the Bearer format.
  if (header.startsWith('Bearer ')) return header.slice(7);

  return null;
}

// Verifies the authentication token and identifies the logged-in user.
async function protect(req, res, next) {
  try {
    // Retrieves the authentication token from the request.
    const token = getToken(req);

    // Rejects the request if no authentication token is provided.
    if (!token) return res.status(401).json({ message: 'Authentication required.' });

    // Verifies the token and retrieves the associated user account.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    // Rejects the request if the user account no longer exists.
    if (!user) return res.status(401).json({ message: 'User account no longer exists.' });

    // Attaches the authenticated user to the request for later use.
    req.user = user;

    // Passes control to the next middleware or route handler.
    next();
  } catch (error) {
    // Rejects the request if the token is invalid or expired.
    return res.status(401).json({ message: 'Invalid or expired authentication token.' });
  }
}

// Restricts access to users with administrator privileges.
function requireAdmin(req, res, next) {
  // Rejects requests from users who are not administrators.
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Administrator access required.' });
  }

  // Allows the request to continue if the user is an administrator.
  next();
}

// Exports the authentication and administrator authorization middleware.
module.exports = { protect, requireAdmin };
