// Check if email exists in the system
const { db, sql } = require('../../db/connect.js')

const checkEmailHandler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email } = req.body

  if (!email) {
    return res.status(400).json({ error: 'Email required' })
  }

  try {
    const user = await db.get(sql`
      SELECT id FROM users WHERE email = ${email}
    `)

    return res.json({ exists: !!user })
  } catch (error) {
    console.error('Error checking email:', error)
    return res.status(500).json({ error: 'Database error' })
  }
}

module.exports = { checkEmailHandler }