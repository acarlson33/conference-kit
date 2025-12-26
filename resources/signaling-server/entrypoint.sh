#!/bin/sh
set -e

# Check if we should skip TLS (e.g., behind a reverse proxy like Koyeb)
if [ "${DISABLE_TLS:-false}" = "true" ]; then
  echo "TLS disabled (DISABLE_TLS=true). Running in plain WebSocket mode."
  echo "This is appropriate when behind a TLS-terminating proxy (Koyeb, Cloudflare, etc.)"
  unset SSL_CERT_PATH
  unset SSL_KEY_PATH
  exec "$@"
fi

CERT_DIR="${CERT_DIR:-/certs}"
SSL_CERT_PATH="${SSL_CERT_PATH:-$CERT_DIR/fullchain.pem}"
SSL_KEY_PATH="${SSL_KEY_PATH:-$CERT_DIR/privkey.pem}"

# Generate self-signed certificate if none provided
if [ ! -f "$SSL_CERT_PATH" ] || [ ! -f "$SSL_KEY_PATH" ]; then
  echo "No TLS certificates found, generating self-signed certificate..."
  mkdir -p "$CERT_DIR"
  
  openssl req -x509 -nodes -days 365 \
    -newkey rsa:2048 \
    -keyout "$SSL_KEY_PATH" \
    -out "$SSL_CERT_PATH" \
    -subj "/CN=signaling-server/O=ConferenceKit/C=US" \
    -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1,IP:0.0.0.0"
  
  echo "Self-signed certificate generated at $CERT_DIR"
  echo "  Note: Browsers will show a warning for self-signed certs."
  echo "  Mount your own certs to $CERT_DIR for production use."
fi

# Export paths for the Bun server
export SSL_CERT_PATH
export SSL_KEY_PATH

exec "$@"
