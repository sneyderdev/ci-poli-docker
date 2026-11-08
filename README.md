# ci-poli-docker

[![CI](https://github.com/sneyderdev/ci-poli-docker/actions/workflows/ci.yml/badge.svg)](https://github.com/sneyderdev/ci-poli-docker/actions/workflows/ci.yml)

Proyecto de integración continua: dos contenedores Docker que se comunican por nombre de servicio dentro de una red propia.

| Servicio | Papel | Imagen |
|---|---|---|
| `api` | API REST de notas (Node.js + Express) | Dockerfile propio sobre `node:24.22.2-alpine3.24` |
| `db` | Base de datos PostgreSQL con volumen persistente | `postgres:17.11-alpine3.24` |

```
Host ──:3000──▶ api ──── db:5432 ────▶ db
                 └──── red app-net ────┘     volumen pgdata
```

La `api` se conecta a la base de datos usando el nombre del servicio (`DB_HOST=db`), resuelto por el DNS interno de Docker. El puerto de `db` no se publica en el host.

## Estructura

```
api/                 Servicio 1: API Node.js (Dockerfile, .dockerignore, código)
db/init.sql          Servicio 2: script de inicialización de PostgreSQL
docker-compose.yml   Orquestación de los dos servicios
scripts/             Prueba de comunicación de ida y vuelta
.github/workflows/   Pipeline de CI
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

O ejecutar la prueba automática:

```bash
sh scripts/smoke-test.sh
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

## Integración continua

GitHub Actions ([ci.yml](.github/workflows/ci.yml)) se ejecuta en cada push y pull request: construye las imágenes, levanta los servicios y ejecuta la prueba de ida y vuelta.
