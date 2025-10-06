#!/bin/bash
# Fix deep-agg systemd service configuration

# Copy service file to systemd
cp /opt/deep-agg/deep-agg.service /etc/systemd/system/deep-agg.service

# Reload systemd
systemctl daemon-reload

# Enable and start service
systemctl enable deep-agg
systemctl start deep-agg

# Check status
systemctl status deep-agg --no-pager
