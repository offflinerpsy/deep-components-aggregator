import { AdminUser } from '../src/db/models.js'

const run = async () => {
  const u = await AdminUser.findOne({ where: { email: 'admin@prosnab.tech', is_active: true } })
  console.log('Sequelize findOne ->', !!u)
  if (u) {
    console.log(JSON.stringify(u.get({ plain: true }), null, 2))
  }
}

run().catch((e) => {
  console.error('Error:', e && e.message)
  console.error(e && e.stack)
  process.exit(1)
})
