#!/usr/bin/env sh
set -eu

URL="${API_URL:-http://localhost:3000}"
TEXT="prueba-$(date +%s)"

for _ in $(seq 1 30); do
  curl -sf "$URL/health" > /dev/null && break
  sleep 1
done

curl -sf -X POST "$URL/notes" -H 'Content-Type: application/json' -d "{\"text\":\"$TEXT\"}"
echo
curl -sf "$URL/notes" | grep -q "$TEXT"
echo "OK: la nota \"$TEXT\" se guardó en db y se leyó desde la api"
