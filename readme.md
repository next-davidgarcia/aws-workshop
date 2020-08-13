# Next AWS HandsOn


## Proyecto backend (backend)

- API NodeJS 
- La config está en backend/env Crear .env.pro
- Añadir nginx y hacer proxy al puerto elegido y configurar PM2
    - https://www.digitalocean.com/community/tutorials/how-to-set-up-a-node-js-application-for-production-on-ubuntu-16-04
- Para instalar en producción:
    ```
    npm install
    npm configure:pro
    ```
    
- Para ejecutar en producción
    ```
    npm start:pro

## Proyecto frontend (/frontend)

- Reemplazar en el archivo /frontend/spa/_nuxt/2bb52aa466136bd4b286.js http://localhost:3500 por la url del servidor backend
- Copiar el contenido de la carpeta spa a /var/www/html/
- Añadir apache a script de arranque
    ```
        sudo update-rc.d apache2 defaults
            
## Proyecto front ssr (/ssr)

Nos sirve para construir el dist del proyecto frontend.

# Datos de Prueba


## Usuario de pruebas:

E-Mail: prueba@bbva.com  
Password: $Contraseña1234

## Datos de pruebas:

Cargar el archivo dump.sql en backend/dump/db.sql 
