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
        sh './build.sh build'
      }
    }
    stage('Build Backend') {
      steps {
        dir('backend') {
          sh './build.sh init clean install publish'
        }
      }
      stage('Build image') {
        steps {
          sh 'edifice image --archs=linux/amd64 --force'
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

