const db = require('better-sqlite3')('/opt/deep-agg/var/db/deepagg.sqlite');
const email = 'deploy_test@example.com';
const before = db.prepare('SELECT email, provider, role, password_hash IS NOT NULL AS has_password FROM users WHERE email=?').get(email);
console.log(JSON.stringify({ before }));
db.prepare("UPDATE users SET provider=NULL, role='admin' WHERE email=?").run(email);
const after = db.prepare('SELECT email, provider, role, password_hash IS NOT NULL AS has_password FROM users WHERE email=?').get(email);
console.log(JSON.stringify({ after }));
db.close();
