#!/bin/bash
export SSHPASS="NDZzHCYzPRKWfKRd"
if command -v sshpass >/dev/null 2>&1; then
    echo "Using sshpass..."
    sshpass -e ssh -o StrictHostKeyChecking=no root@95.217.134.12 "$@"
else
    echo "Installing sshpass..."
    if command -v apt-get >/dev/null 2>&1; then
        sudo apt-get update && sudo apt-get install -y sshpass
    elif command -v yum >/dev/null 2>&1; then
        sudo yum install -y sshpass
    elif command -v pacman >/dev/null 2>&1; then
        sudo pacman -S sshpass
    else
        echo "Cannot install sshpass automatically"
        exit 1
    fi
    sshpass -e ssh -o StrictHostKeyChecking=no root@95.217.134.12 "$@"
fi
