#!/bin/bash

export USER_UID=${USER_UID:-1000}
export GROUP_GID=${GROUP_GID:-1000}


build() {
  echo "[build] Build project..."
  docker compose run --rm -u "$USER_UID:$GROUP_GID" -e NPM_TOKEN=$NPM_TOKEN node sh -c "pnpm clean && pnpm install:prod && pnpm build:prod"
}

for param in "$@"
do
  case $param in
    build) build ;;
    *) echo "Invalid argument: $param" ;;
  esac
  if [ ! $? -eq 0 ]; then
    exit 1
  fi
done