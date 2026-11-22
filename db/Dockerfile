FROM postgres:17.11-alpine3.24

# El script se ejecuta solo la primera vez que se inicializa el volumen de datos
COPY init.sql /docker-entrypoint-initdb.d/init.sql
