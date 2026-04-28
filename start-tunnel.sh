#!/bin/bash
# Expose local SSH port 2222 to GitHub Actions via ngrok TCP tunnel.
# After starting, update DEPLOY_HOST and DEPLOY_PORT in GitHub Secrets.
#
# Setup (one-time):
#   1. Create free account at https://dashboard.ngrok.com
#   2. Install ngrok: https://ngrok.com/download
#   3. ngrok config add-authtoken <your-token>

echo "Starting ngrok TCP tunnel on port 2222..."
echo "Note the printed host and port, then update GitHub Secrets:"
echo "  DEPLOY_HOST = X.tcp.ngrok.io (or eu.tcp.ngrok.io)"
echo "  DEPLOY_PORT = the printed port number"
echo ""

ngrok tcp 2222
