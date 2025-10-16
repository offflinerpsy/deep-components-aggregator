#!/bin/bash
# Generate secure random secrets for AdminJS

# Check if .env file exists
if [ ! -f .env ]; then
  echo "Error: .env file not found. Create it first."
  exit 1
fi

# Generate random secrets
ADMIN_COOKIE_SECRET=$(openssl rand -hex 32)
ADMIN_SESSION_SECRET=$(openssl rand -hex 32)

# Check if secrets already exist in .env
if grep -q "ADMIN_COOKIE_SECRET=" .env; then
  echo "ADMIN_COOKIE_SECRET already exists in .env"
  echo "Current value will be replaced"
  # Remove existing line
  sed -i '/ADMIN_COOKIE_SECRET=/d' .env
fi

if grep -q "ADMIN_SESSION_SECRET=" .env; then
  echo "ADMIN_SESSION_SECRET already exists in .env"
  echo "Current value will be replaced"
  # Remove existing line
  sed -i '/ADMIN_SESSION_SECRET=/d' .env
fi

# Add new secrets to .env
echo "ADMIN_COOKIE_SECRET=$ADMIN_COOKIE_SECRET" >> .env
echo "ADMIN_SESSION_SECRET=$ADMIN_SESSION_SECRET" >> .env

echo "Admin secrets generated and added to .env"
echo "ADMIN_COOKIE_SECRET: ${ADMIN_COOKIE_SECRET:0:8}...${ADMIN_COOKIE_SECRET:56}"
echo "ADMIN_SESSION_SECRET: ${ADMIN_SESSION_SECRET:0:8}...${ADMIN_SESSION_SECRET:56}"
