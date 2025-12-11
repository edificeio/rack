#!/usr/bin/env groovy

pipeline {
  agent any
    stages {
      stage("Initialization") {
        steps {
          script {
            def version = sh(returnStdout: true, script: 'docker-compose run --rm maven mvn $MVN_OPTS help:evaluate -Dexpression=project.version -q -DforceStdout')
            buildName "${env.GIT_BRANCH.replace("origin/", "")}@${version}"
          }
        }
      }
      stage('Build Front') {
        steps {
          sh 'docker-compose run --rm -u "1000:1000" node sh -c "pnpm build:prod"'
          //docker-compose run --rm -u "$USER_UID:$GROUP_GID" -e PUBLISH_TAG="${PUBLISH_TAG:-latest}" -e DRY_RUN="${DRY_RUN:-false}" node sh -c "pnpm build:prod && pnpm publish:client-rest"
        }
      }
      stage('Build Backend') {
        steps {
          dir('backend') {
            sh './build.sh init clean install publish'
          }
        }
      }
    }
  post {
    cleanup {
      sh 'docker-compose down'
    }
  }
}

