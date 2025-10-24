#!/usr/bin/env node
/**
 * ВРЕМЕННЫЙ СКРИПТ: Сброс пароля админа
 * Пароль: admin123
 */

import bcrypt from 'bcrypt';
import Database from 'better-sqlite3';

const db = new Database('./var/db/deepagg.sqlite');
const email = 'admin@prosnab.tech';
const password = 'admin123';

async function resetPassword() {
  try {
    // Хешируем пароль
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Обновляем в БД
    const result = db.prepare(`
      UPDATE admin_users 
      SET password_hash = ?, updated_at = datetime('now')
      WHERE email = ?
    `).run(passwordHash, email);
    
    if (result.changes > 0) {
      console.log(`✅ Пароль обновлён для ${email}`);
      console.log(`📝 Логин: ${email}`);
      console.log(`📝 Пароль: ${password}`);
      console.log(`🌐 URL: https://prosnab.tech/admin`);
    } else {
      console.error(`❌ Пользователь ${email} не найден`);
    }
    
    db.close();
  } catch (error) {
    console.error('Ошибка:', error.message);
    process.exit(1);
  }
}

resetPassword();
