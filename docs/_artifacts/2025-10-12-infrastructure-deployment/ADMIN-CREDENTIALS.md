# 🔐 Mailcow Admin Credentials — UPDATED

**Дата сброса**: 12 октября 2025, 19:20 MSK

---

## ✅ Новые учётные данные

**URL**: https://mail.prosnab.tech

**Username**: `admin`

**Password**: `ProsnabAdmin2025!`

**2FA**: отключен

---

## ⚠️ Безопасность

**ВАЖНО**: Сменить пароль после первого входа!

**Как сменить**:
1. Войти в https://mail.prosnab.tech
2. Перейти: `System` → `Access` → `Edit Administrator`
3. Ввести новый сложный пароль (минимум 12 символов)
4. Включить 2FA для дополнительной безопасности

---

## 📝 Технические детали сброса

**Метод**: Прямое обновление в MySQL через dovecot hash

**Команды**:
```bash
# Генерация хэша
docker exec dovecot-mailcow doveadm pw -s SSHA256 -p "ProsnabAdmin2025!"

# Обновление в БД
docker exec mysql-mailcow mysql -u mailcow -p[PASSWORD] mailcow \
  -e "UPDATE admin SET password = '{SSHA256}...' WHERE username = 'admin';"

# Удаление 2FA
docker exec mysql-mailcow mysql -u mailcow -p[PASSWORD] mailcow \
  -e "DELETE FROM tfa WHERE username='admin';"
```

**Результат**: ✅ Пароль успешно сброшен

---

## 🔄 Следующие действия

После входа в систему:

1. **Сменить пароль admin** (обязательно!)
2. Включить 2FA (рекомендуется)
3. Создать mailbox `admin@prosnab.tech`
4. Настроить DKIM (Configuration → DKIM)
5. Запросить PTR-запись у timeweb.ru

---

**Последнее обновление**: 12 октября 2025, 19:20 MSK  
**Статус**: Готов к использованию
