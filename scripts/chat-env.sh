#!/bin/bash
# Source after loading .env, before docker compose / starting the JVMs.
# Reuse our existing Mongo port. Never kill an unrelated MongoDB on this machine.
if [ -z "${MONGODB_PORT:-}" ]; then
  CHAT_EXISTING_MONGO_PORT=$(docker port ccadro-mongodb 27017/tcp 2>/dev/null | sed -n 's/^127\.0\.0\.1://p' | head -1)
  if [ -n "$CHAT_EXISTING_MONGO_PORT" ]; then
    export MONGODB_PORT="$CHAT_EXISTING_MONGO_PORT"
  elif lsof -tiTCP:27017 -sTCP:LISTEN >/dev/null 2>&1; then
    export MONGODB_PORT=27018
  else
    export MONGODB_PORT=27017
  fi
fi
export CHAT_MONGODB_URI="${CHAT_MONGODB_URI:-mongodb://127.0.0.1:${MONGODB_PORT}/ccadro_chat}"
export CHAT_SERVICE_URL="${CHAT_SERVICE_URL:-http://127.0.0.1:${CHAT_PORT:-8090}}"
export CHAT_SOCKET_URL="${CHAT_SOCKET_URL:-ws://127.0.0.1:${CHAT_SOCKET_PORT:-8091}}"
export CHAT_SOCKET_HTTP_URL="${CHAT_SOCKET_HTTP_URL:-http://127.0.0.1:${CHAT_SOCKET_PORT:-8091}}"
unset CHAT_EXISTING_MONGO_PORT
