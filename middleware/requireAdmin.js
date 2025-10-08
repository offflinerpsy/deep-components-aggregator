/**
 * Admin authorization middleware
 * Requires user to be authenticated AND have role='admin'
 */

export function requireAdmin(req, res, next) {
  // Check if user is authenticated
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    // RFC 7235: 401 requires WWW-Authenticate header
    res.setHeader('WWW-Authenticate', 'Bearer realm="Admin API"');
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Authentication required' 
    });
  }

  // Check if user has admin role
  if (!req.user || req.user.role !== 'admin') {
    // RFC 7235: 403 means authenticated but forbidden (no WWW-Authenticate)
    return res.status(403).json({ 
      error: 'Forbidden',
      message: 'Admin access required' 
    });
  }

  // User is authenticated and is admin
  next();
}

/**
 * Optional admin middleware - adds isAdmin flag to request
 * Use for routes that show different content for admins vs regular users
 */
export function checkAdmin(req, res, next) {
  req.isAdmin = req.isAuthenticated && req.isAuthenticated() && req.user && req.user.role === 'admin';
  next();
}
