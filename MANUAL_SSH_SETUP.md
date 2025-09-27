# Ручная настройка SSH ключей

## Проблема
SSH не может интерактивно запросить пароль в автоматическом режиме.

## Решение - выполни вручную:

### 1. Подключись к серверу:
```bash
ssh root@89.104.69.77
```
**Пароль:** `OPYgPpOEqUSQmUqI`

### 2. На сервере выполни:
```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
```

### 3. Скопируй этот публичный ключ:
```
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDTWCxWbK73t8NlfG8qMHk0rZE23PaWz4SZcsM5qNLxlEWbhNAxZQYbH7QHeCpy4G6Mqlu4JEAC4ZwZnXFUb2BYoviQ716qvU+mDpVWwNNXoImiagqQnZNZ+rSWGrx1Jja6SdE1yVqh8R2ksHF0MN/JiQFPcdv1HF8IEqJExVrewFZTHf5B3k5yUEEpVq87zPIPOWWWuypevpY3VqcV1AQ0un+YuSUOLeioQltxJ3NDQU7QfEzb2lnwCohXfIBW9oMPmoJ7cXLwplmW8GevZYaxKKkmpB4JyVBxhqZVh8rFubf0dDEKVeQdqUeLc0TbyL1Pvtj1KPRT5EceyvZhf1q/STe4Nw/SeQMrikRy99rb41OA4/NqRNn4h2qbVnfqaak83OBqB/JfMCmELuMqU5QkvoY+53XigTfDYbseU2vz2urabV8qmyGC9hKoHDasi3i1Mz/hklijYL64wo7orzUfbO8e3Z5cZiTWfZY3vdP2lsc50OguQ6V5BRCLnmZIY0gEKSGaPQ9agU9LoOfaJdylvfQLxx8/S7I38h3kdE6sxM6R5eI80MRPeF3EwvgtiBauJazyTRXeSvutWX6GPQaJ23hv5vbLpReX2q5UjBfSZ7Zix36Rt5Wd5h6MHPBUHkeJP2QvuWFsnH82m299AIgrD93ziTOMzGF/+2kyis7o3Q== Alex@DESKTOP-P0V2V04
```

### 4. Добавь ключ в authorized_keys:
```bash
echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDTWCxWbK73t8NlfG8qMHk0rZE23PaWz4SZcsM5qNLxlEWbhNAxZQYbH7QHeCpy4G6Mqlu4JEAC4ZwZnXFUb2BYoviQ716qvU+mDpVWwNNXoImiagqQnZNZ+rSWGrx1Jja6SdE1yVqh8R2ksHF0MN/JiQFPcdv1HF8IEqJExVrewFZTHf5B3k5yUEEpVq87zPIPOWWWuypevpY3VqcV1AQ0un+YuSUOLeioQltxJ3NDQU7QfEzb2lnwCohXfIBW9oMPmoJ7cXLwplmW8GevZYaxKKkmpB4JyVBxhqZVh8rFubf0dDEKVeQdqUeLc0TbyL1Pvtj1KPRT5EceyvZhf1q/STe4Nw/SeQMrikRy99rb41OA4/NqRNn4h2qbVnfqaak83OBqB/JfMCmELuMqU5QkvoY+53XigTfDYbseU2vz2urabV8qmyGC9hKoHDasi3i1Mz/hklijYL64wo7orzUfbO8e3Z5cZiTWfZY3vdP2lsc50OguQ6V5BRCLnmZIY0gEKSGaPQ9agU9LoOfaJdylvfQLxx8/S7I38h3kdE6sxM6R5eI80MRPeF3EwvgtiBauJazyTRXeSvutWX6GPQaJ23hv5vbLpReX2q5UjBfSZ7Zix36Rt5Wd5h6MHPBUHkeJP2QvuWFsnH82m299AIgrD93ziTOMzGF/+2kyis7o3Q== Alex@DESKTOP-P0V2V04" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 5. Выйди с сервера:
```bash
exit
```

### 6. Проверь подключение без пароля:
```bash
ssh root@89.104.69.77 "echo 'SSH ключ работает!'"
```

## После настройки SSH ключей

Запусти деплой:
```bash
./deploy.sh
```


