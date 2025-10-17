// api/auth-check.js
// Check email availability endpoint for registration

/**
 * POST /api/auth/check-email
 * Check if email is already registered
 */
export function checkEmailHandler(db, logger) {
  return async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email || typeof email !== 'string') {
        return res.status(400).json({
          ok: false,
          error: 'validation_error',
          message: 'Email is required'
        });
      }
      
      const normalizedEmail = email.toLowerCase().trim();
      
      // Check if email exists
      const existingUser = db.prepare('SELECT id, email_verified FROM users WHERE email = ?').get(normalizedEmail);
      
      if (existingUser) {
        return res.json({
          ok: true,
          exists: true,
          verified: Boolean(existingUser.email_verified)
        });
      }
      
      return res.json({
        ok: true,
        exists: false,
        verified: false
      });
      
    } catch (error) {
      logger.error({ error: error.message }, 'Check email failed');
      
      res.status(500).json({
        ok: false,
        error: 'server_error',
        message: 'Failed to check email'
      });
    }
  };
}