#!/usr/bin/env python3
"""
Deploy DigiKey OAuth test to Amsterdam server
Run token exchange there (no geo-blocking)
"""

import subprocess
import sys

SERVER = "root@37.60.243.19"
KEY = "deploy_key"
CODE = "ueiC69YA"

print("🚀 Deploying DigiKey OAuth test to server...")
print("")

# Upload script
subprocess.run([
    "scp", "-i", KEY, "-o", "StrictHostKeyChecking=no",
    "digikey_exchange_server.mjs",
    f"{SERVER}:/root/aggregator/"
])

print("")
print("✅ Script uploaded")
print("")
print("🔐 Running token exchange on server...")
print("")

# Run on server
result = subprocess.run([
    "ssh", "-i", KEY, "-o", "StrictHostKeyChecking=no",
    SERVER,
    f"cd /root/aggregator && node digikey_exchange_server.mjs {CODE}"
], capture_output=False)

sys.exit(result.returncode)
