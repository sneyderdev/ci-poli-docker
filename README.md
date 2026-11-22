# ci-poli-docker

[![CI](https://github.com/sneyderdev/ci-poli-docker/actions/workflows/ci.yml/badge.svg)](https://github.com/sneyderdev/ci-poli-docker/actions/workflows/ci.yml)

Proyecto de integración continua: dos contenedores Docker que se comunican por nombre de servicio dentro de una red propia.

| Servicio | Papel | Imagen |
|---|---|---|
| `api` | API REST de notas (Node.js + Express) | Dockerfile propio sobre `node:24.22.2-alpine3.24` |
| `db` | Base de datos PostgreSQL con volumen persistente | Dockerfile propio sobre `postgres:17.11-alpine3.24` con `init.sql` incluido |

```
Host ──:3000──▶ api ──── db:5432 ────▶ db
                 └──── red app-net ────┘     volumen pgdata
```

La `api` se conecta a la base de datos usando el nombre del servicio (`DB_HOST=db`), resuelto por el DNS interno de Docker. El puerto de `db` no se publica en el host.

## Estructura

```
api/                 Servicio 1: API Node.js (Dockerfile, código y pruebas unitarias)
db/                  Servicio 2: imagen de PostgreSQL con el script de inicialización
docker-compose.yml   Orquestación de los dos servicios y del servicio de prueba smoke
scripts/             Prueba de comunicación de ida y vuelta (y su imagen)
jenkins/             Imagen y compose de Jenkins
Jenkinsfile          Pipeline de Jenkins
.github/workflows/   Pipeline de GitHub Actions
.env.example         Plantilla de variables de entorno
```

## Requisitos

- Docker 24 o superior con Docker Compose v2

## Cómo levantar los contenedores

```bash
git clone https://github.com/sneyderdev/ci-poli-docker.git
cd ci-poli-docker
cp .env.example .env        # y cambie POSTGRES_PASSWORD
docker compose up -d --build
docker compose ps
```

## Prueba de comunicación

Guardar una nota (la `api` la escribe en `db`):

```bash
curl -X POST http://localhost:3000/notes \
  -H "Content-Type: application/json" \
  -d '{"text":"Hola desde la API"}'
```

Leerla de vuelta (la `api` la consulta en `db`):

```bash
curl http://localhost:3000/notes
```

O ejecutar la prueba automática desde el host:

```bash
sh scripts/smoke-test.sh
```

O desde dentro de la red `app-net`, llegando a la api por su nombre de servicio:

```bash
docker compose --profile test run --rm smoke
```

## Pruebas unitarias

```bash
docker build --target test -t ci-poli-api:test ./api
docker run --rm ci-poli-api:test
```

## Comandos útiles

```bash
docker compose build                       # construir imágenes
docker compose logs -f api                 # ver logs de la api
docker compose exec api getent hosts db    # resolución DNS del servicio db
docker network inspect ci-poli_app-net     # inspeccionar la red
docker compose down                        # detener (conserva los datos)
docker compose down -v                     # detener y borrar el volumen
```

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Verifica la conexión con `db` |
| GET | `/notes` | Lista las notas |
| POST | `/notes` | Crea una nota: `{ "text": "..." }` |

## Integración continua con Jenkins

Jenkins corre en un contenedor (`jenkins/jenkins:2.580.2-lts-jdk21` con el cliente de Docker y los plugins preinstalados) y usa el Docker del host a través del socket montado.

```bash
docker compose -f jenkins/docker-compose.yml up -d --build
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

Luego se abre http://localhost:8080. El [Jenkinsfile](Jenkinsfile) define las etapas:

| Etapa | Qué hace |
|---|---|
| Checkout | Descarga el código de GitHub |
| Build | Construye las imágenes `ci-poli-api`, `ci-poli-db` y `ci-poli-smoke`, y la imagen de pruebas de la api |
| Test | Ejecuta las pruebas unitarias, levanta el compose y verifica que la api llega a `db` por nombre de servicio |
| post | Muestra los logs si algo falla y siempre apaga los contenedores y borra el volumen |

El pipeline revisa GitHub cada dos minutos (Poll SCM) y se ejecuta con cada push. La clave de la base de datos se guarda en Jenkins como credencial `ci-poli-db-password` (tipo *Secret text*) y nunca está escrita en el repositorio.

## GitHub Actions

[ci.yml](.github/workflows/ci.yml) se ejecuta en cada push y pull request: construye las imágenes, levanta los servicios y ejecuta la prueba de ida y vuelta.
