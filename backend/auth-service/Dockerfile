

FROM python:3.7.9

WORKDIR /auth-service

COPY . .

RUN pip install -r requirements.txt

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]



#docker build -t cjeronimomx/auth-service:1.0.0 .
# docker run -d \
#	-e APP_DB_USR=$APP_DB_USR \
#    -e APP_DB_PASSWD=$APP_DB_PASSWD \
#    -e APP_DB_PORT=$APP_DB_PORT \
#    -e APP_DB_HOST=$APP_DB_HOST \
#    -e APP_DB_SCHEME=$APP_DB_SCHEME \
#	-p 8001:8000 --name auth-service-1.0.0 cjeronimomx/auth-service:1.0.0