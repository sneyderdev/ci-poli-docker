pipeline {
    agent any

    options {
        disableConcurrentBuilds()
        timestamps()
        timeout(time: 15, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '30'))
    }

    // Revisa GitHub cada ~2 minutos y lanza el build si hay commits nuevos
    triggers {
        pollSCM('H/2 * * * *')
    }

    environment {
        // Nombre de proyecto propio por build: contenedores, red y volumen aislados
        COMPOSE_PROJECT_NAME = "ci-poli-build-${env.BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                sh 'git log -1 --pretty="Commit %h: %s (%an)"'
            }
        }

        stage('Build') {
            steps {
                // La clave de la base de datos sale de las credenciales de Jenkins, no del repositorio
                withCredentials([string(credentialsId: 'ci-poli-db-password', variable: 'DB_PASSWORD')]) {
                    sh '''
                        printf 'POSTGRES_USER=notas_user\\nPOSTGRES_PASSWORD=%s\\nPOSTGRES_DB=notas\\nAPI_PORT=3080\\n' "$DB_PASSWORD" > .env
                    '''
                }
                sh 'docker compose --profile test build'
                sh 'docker build --target test -t ci-poli-api:test ./api'
                sh 'docker image ls "ci-poli-*"'
            }
        }

        stage('Test') {
            steps {
                echo 'Pruebas unitarias de la api'
                sh 'docker run --rm ci-poli-api:test'

                echo 'Prueba de integración: api <-> db por nombre de servicio'
                sh 'docker compose up -d --wait'
                sh 'docker compose exec -T api getent hosts db'
                sh 'docker compose --profile test run --rm smoke'
            }
        }
    }

    post {
        success {
            echo 'Build exitoso: imágenes construidas y pruebas aprobadas'
        }
        fixed {
            echo 'El build vuelve a pasar después de un fallo'
        }
        failure {
            echo 'El build falló; logs de los contenedores:'
            sh 'docker compose logs --no-color || true'
        }
        cleanup {
            sh 'docker compose --profile test down -v --remove-orphans || true'
            sh 'rm -f .env'
        }
    }
}
