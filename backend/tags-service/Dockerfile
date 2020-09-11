

FROM golang:1.14.8-alpine3.12

WORKDIR /tags-service

COPY . .

RUN go build -o tags-service.sh .

EXPOSE 4000
ENTRYPOINT ./tags-service.sh

# docker build -t cjeronimomx/tags-service:1.0.0 .
# docker run -d \
#	-e APP_DB_USR=$APP_DB_USR \
#    -e APP_DB_PASSWD=$APP_DB_PASSWD \
#    -e APP_DB_PORT=$APP_DB_PORT \
#    -e APP_DB_HOST=$APP_DB_HOST \
#    -e APP_DB_SCHEME=$APP_DB_SCHEME \
#    -e GO_API_SECRET=$APP_AUTH_SECRET \
#	-p 4001:4000 --name tags-service-1.0.0 cjeronimomx/tags-service:1.0.0