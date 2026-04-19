#!/bin/sh
# Run this once to generate VAPID keys for push notifications
# Requires node/npm installed
npx web-push generate-vapid-keys
echo ""
echo "Copy the keys above into your .env file."
