#!/usr/bin/env node
/**
 * Script to create an initial admin user
 * Usage: node scripts/create-admin-user.mjs --email admin@example.com --name "Admin User" --password "secure-password"
 */

import { sequelize, AdminUser } from '../src/db/models.js';
import bcrypt from 'bcrypt';
import { parseArgs } from 'node:util';

// Parse command line arguments
const options = {
  email: { type: 'string', short: 'e' },
  name: { type: 'string', short: 'n' },
  password: { type: 'string', short: 'p' },
  role: { type: 'string', short: 'r', default: 'admin' },
  help: { type: 'boolean', short: 'h' }
};

const { values } = parseArgs({ options, allowPositionals: false });

// Show help
if (values.help) {
  console.log(`
Create Admin User
----------------
Usage: node scripts/create-admin-user.mjs --email admin@example.com --name "Admin User" --password "secure-password"

Options:
  -e, --email     Email address (required)
  -n, --name      Full name (required)
  -p, --password  Password (required)
  -r, --role      Role (default: admin)
  -h, --help      Show this help
`);
  process.exit(0);
}

// Validate required parameters
if (!values.email || !values.name || !values.password) {
  console.error('Error: Missing required parameters');
  console.error('Use --help for usage information');
  process.exit(1);
}

// Validate email format
if (!values.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
  console.error('Error: Invalid email format');
  process.exit(1);
}

// Validate password strength
if (values.password.length < 8) {
  console.error('Error: Password must be at least 8 characters long');
  process.exit(1);
}

// Validate role
const validRoles = ['admin', 'moderator'];
if (!validRoles.includes(values.role)) {
  console.error(`Error: Invalid role. Must be one of: ${validRoles.join(', ')}`);
  process.exit(1);
}

async function createAdminUser() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('Connected to database');

    // Check if user already exists
    const existingUser = await AdminUser.findOne({ where: { email: values.email } });
    if (existingUser) {
      console.log(`User with email ${values.email} already exists`);

      // Update user if --force flag is set
      if (values.force) {
        const passwordHash = await bcrypt.hash(values.password, 10);
        await existingUser.update({
          name: values.name,
          password_hash: passwordHash,
          role: values.role,
          is_active: true
        });
        console.log(`User updated: ${values.email} (${values.role})`);
      } else {
        console.error('Use --force to update existing user');
        process.exit(1);
      }
    } else {
      // Create new user
      const passwordHash = await bcrypt.hash(values.password, 10);
      const user = await AdminUser.create({
        email: values.email,
        name: values.name,
        password_hash: passwordHash,
        role: values.role,
        is_active: true
      });
      console.log(`Admin user created: ${user.email} (${user.role})`);
    }

    // Close database connection
    await sequelize.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

createAdminUser();
