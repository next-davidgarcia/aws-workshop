# posts-microservice

This microservice is written in Node.js. 
This is a simple posts microservice working as a REST API

## Installation

```bash
npm install
```

## Configuration

The service scans the .env environment variables file for:
- `PORT=` - port of server
- `DB_HOST=` - host of db
- `DB_USER=` - db user
- `DB_PASSWORD=` - password for db user
- `DB_NAME=` -db name
- `DB_PORT=` - port of db
- `LOG=/home/{user}/{project-directory}/backend/log/req.log` - log directory
- `API_PREFIX=/api/` - API prefix


## Building

Use the Express.js framework.

- Pa lanzar en dev mode

```
npm start
```

- Para instalar en producción:
- La config está en backend/env Crear .env.pro con los datos adecuados
- Añadir nginx y hacer proxy al puerto elegido y configurar PM2 o forever
- https://www.digitalocean.com/community/tutorials/how-to-set-up-a-node-js-application-for-production-on-ubuntu-16-04
```
npm install
npm configure:pro
```
    
- Para ejecutar en producción
```
npm start:pro
```

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License
[MIT](https://choosealicense.com/licenses/mit/)