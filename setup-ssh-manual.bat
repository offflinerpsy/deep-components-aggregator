@echo off
echo ========================================
echo    НАСТРОЙКА SSH КЛЮЧЕЙ
echo ========================================
echo.
echo 1. Подключаемся к серверу...
echo    Пароль: OPYgPpOEqUSQmUqI
echo.
ssh root@89.104.69.77
echo.
echo 2. Если подключение успешно, выполни на сервере:
echo    mkdir -p ~/.ssh
echo    chmod 700 ~/.ssh
echo    echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDTWCxWbK73t8NlfG8qMHk0rZE23PaWz4SZcsM5qNLxlEWbhNAxZQYbH7QHeCpy4G6Mqlu4JEAC4ZwZnXFUb2BYoviQ716qvU+mDpVWwNNXoImiagqQnZNZ+rSWGrx1Jja6SdE1yVqh8R2ksHF0MN/JiQFPcdv1HF8IEqJExVrewFZTHf5B3k5yUEEpVq87zPIPOWWWuypevpY3VqcV1AQ0un+YuSUOLeioQltxJ3NDQU7QfEzb2lnwCohXfIBW9oMPmoJ7cXLwplmW8GevZYaxKKkmpB4JyVBxhqZVh8rFubf0dDEKVeQdqUeLc0TbyL1Pvtj1KPRT5EceyvZhf1q/STe4Nw/SeQMrikRy99rb41OA4/NqRNn4h2qbVnfqaak83OBqB/JfMCmELuMqU5QkvoY+53XigTfDYbseU2vz2urabV8qmyGC9hKoHDasi3i1Mz/hklijYL64wo7orzUfbO8e3Z5cZiTWfZY3vdP2lsc50OguQ6V5BRCLnmZIY0gEKSGaPQ9agU9LoOfaJdylvfQLxx8/S7I38h3kdE6sxM6R5eI80MRPeF3EwvgtiBauJazyTRXeSvutWX6GPQaJ23hv5vbLpReX2q5UjBfSZ7Zix36Rt5Wd5h6MHPBUHkeJP2QvuWFsnH82m299AIgrD93ziTOMzGF/+2kyis7o3Q== Alex@DESKTOP-P0V2V04" ^>^> ~/.ssh/authorized_keys
echo    chmod 600 ~/.ssh/authorized_keys
echo    exit
echo.
echo 3. После выхода с сервера, проверь подключение:
echo    ssh root@89.104.69.77 "echo 'SSH ключ работает!'"
echo.
pause


