#!/bin/bash

MVN_OPTS="-Duser.home=/var/maven"

if [ ! -e node_modules ]
then
  mkdir node_modules
fi

case `uname -s` in
  MINGW* | Darwin*)
    USER_UID=1000
    GROUP_UID=1000
    ;;
  *)
    if [ -z ${USER_UID:+x} ]
    then
      USER_UID=`id -u`
      GROUP_GID=`id -g`
    fi
esac

# Options
NO_DOCKER=""
SPRINGBOARD="recette"
for i in "$@"
do
case $i in
  -s=*|--springboard=*)
  SPRINGBOARD="${i#*=}"
  shift
  ;;
  --no-docker*)
  NO_DOCKER="true"
  shift
  ;;
  *)
  ;;
esac
done

init() {
  me=`id -u`:`id -g`
  echo "DEFAULT_DOCKER_USER=$me" > .env
}

clean () {
  if [ "$NO_DOCKER" = "true" ] ; then
    rm -rf node_modules
    rm -f yarn.lock
    mvn clean
  else
    docker-compose run --rm maven mvn $MVN_OPTS clean
  fi
}

install () {
  docker-compose run --rm maven mvn $MVN_OPTS install -DskipTests
}

test () {
  docker-compose run --rm maven mvn $MVN_OPTS test
}

#buildNode () {
  #jenkins
  #echo "[buildNode] Get branch name from jenkins env..."
  #BRANCH_NAME=`echo $GIT_BRANCH | sed -e "s|origin/||g"`
  #docker-compose run --rm -u "$USER_UID:$GROUP_GID" node sh -c "pnpm build:prod"
  #docker-compose run --rm -u "$USER_UID:$GROUP_GID" -e PUBLISH_TAG="${PUBLISH_TAG:-latest}" -e DRY_RUN="${DRY_RUN:-false}" node sh -c "pnpm build:prod && pnpm publish:client-rest"
#}

publish() {
  if [ "$NO_DOCKER" = "true" ] ; then
    version=`docker-compose run --rm maven mvn $MVN_OPTS help:evaluate -Dexpression=project.version -q -DforceStdout`
    level=`echo $version | cut -d'-' -f3`
    case "$level" in
      *SNAPSHOT) export nexusRepository='snapshots' ;;
      *)         export nexusRepository='releases' ;;
    esac
    mvn -DrepositoryId=ode-$nexusRepository -DskiptTests deploy
  else
    version=`docker-compose run --rm maven mvn $MVN_OPTS help:evaluate -Dexpression=project.version -q -DforceStdout`
    level=`echo $version | cut -d'-' -f3`
    case "$level" in
      *SNAPSHOT) export nexusRepository='snapshots' ;;
      *)         export nexusRepository='releases' ;;
    esac

    docker-compose run --rm  maven mvn -DrepositoryId=ode-$nexusRepository -DskiptTests --settings /var/maven/.m2/settings.xml deploy
  fi
}

watch () {
  if [ "$NO_DOCKER" = "true" ] ; then
    node_modules/gulp/bin/gulp.js watch --springboard=../recette
  else
    docker-compose run --rm -u "$USER_UID:$GROUP_GID" node sh -c "node_modules/gulp/bin/gulp.js watch --springboard=/home/node/$SPRINGBOARD"
  fi
}

for param in "$@"
do
  case $param in
    init)
      init
      ;;
    clean)
      clean
      ;;
    #buildNode)
      #buildNode
    #  ;;
    install)
      #buildNode && 
      install
      ;;
    test)
      test
      ;;
    watch)
      watch
      ;;
    publish)
      publish
      ;;
    *)
      echo "Invalid argument : $param"
  esac
  if [ ! $? -eq 0 ]; then
    exit 1
  fi
done

