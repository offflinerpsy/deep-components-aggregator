/**
 * Admin authorization middleware
 * Requires user to be authenticated AND have role='admin'
 * Supports both:
 * 1. Passport auth (req.isAuthenticated + req.user)
 * 2. AdminJS auth (req.session.adminUser)
 */

export function requireAdmin(req, res, next) {
  // Check if user is authenticated via Passport
  const passportAuth = req.isAuthenticated && req.isAuthenticated() && req.user;
  
  // Check if user is authenticated via AdminJS
  const adminJsAuth = req.session && req.session.adminUser;
  
  // Not authenticated through either method
  if (!passportAuth && !adminJsAuth) {
    // RFC 7235: 401 requires WWW-Authenticate header
    res.setHeader('WWW-Authenticate', 'Bearer realm="Admin API"');
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }

  // Check if user has admin role (Passport) or is an admin (AdminJS)
  if ((passportAuth && req.user.role !== 'admin') && 
      (!adminJsAuth || (adminJsAuth.role !== 'admin'))) {
    // RFC 7235: 403 means authenticated but forbidden (no WWW-Authenticate)
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Admin access required'
    });
  }

  // If authenticated via AdminJS but not Passport, set user for consistency
  if (!passportAuth && adminJsAuth) {
    req.user = {
      id: adminJsAuth.id,
      email: adminJsAuth.email,
      name: adminJsAuth.name,
      role: adminJsAuth.role
    };
  }

  // User is authenticated and is admin
  next();
}

/**
 * Optional admin middleware - adds isAdmin flag to request
 * Use for routes that show different content for admins vs regular users
 * Supports both Passport and AdminJS authentication
 */
export function checkAdmin(req, res, next) {
  const passportAdmin = req.isAuthenticated && req.isAuthenticated() && req.user && req.user.role === 'admin';
  const adminJsAdmin = req.session && req.session.adminUser && req.session.adminUser.role === 'admin';
  
  req.isAdmin = passportAdmin || adminJsAdmin;
  
  // If authenticated via AdminJS but not Passport, set user for consistency
  if (!passportAdmin && adminJsAdmin && !req.user) {
    req.user = {
      id: req.session.adminUser.id,
      email: req.session.adminUser.email,
      name: req.session.adminUser.name,
      role: req.session.adminUser.role
    };
  }
  
  next();
}
