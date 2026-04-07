#!/bin/bash

export USER_UID=${USER_UID:-1000}
export GROUP_GID=${GROUP_GID:-1000}

# If DEBUG env var is set to "true" then set -x to enable debug mode
if [ "$DEBUG" == "true" ]; then
	set -x
	EDIFICE_CLI_DEBUG_OPTION="--debug"
else
	EDIFICE_CLI_DEBUG_OPTION=""
fi

init() {
  me=`id -u`:`id -g`
  echo "DEFAULT_DOCKER_USER=$me" > .env

  # If CLI_VERSION is empty set to latest
  if [ -z "$CLI_VERSION" ]; then
    CLI_VERSION="latest"
  fi
  # Create a build.compose.yaml file from following template
  cat <<EOF > build.compose.yaml
services:
  edifice-cli:
    image: opendigitaleducation/edifice-cli:$CLI_VERSION
    user: "$DEFAULT_DOCKER_USER"
EOF
  # Copy /root/edifice from edifice-cli container to host machine
  docker compose -f build.compose.yaml create edifice-cli
  docker compose -f build.compose.yaml cp edifice-cli:/root/edifice ./edifice
  docker compose -f build.compose.yaml rm -fsv edifice-cli
  rm -f build.compose.yaml
  chmod +x edifice
  ./edifice version $EDIFICE_CLI_DEBUG_OPTION
}

build() {
  echo "[build] Build project..."
  docker compose run --rm -u "$USER_UID:$GROUP_GID" -e NPM_TOKEN=$NPM_TOKEN node sh -c "pnpm clean && pnpm install:prod && pnpm build:prod"
}

for param in "$@"
do
  case $param in
    build) build ;;
    init) init ;;
    *) echo "Invalid argument: $param" ;;
  esac
  if [ ! $? -eq 0 ]; then
    exit 1
  fi
done