- Proyecto backend
    - API NodeJS
    - La config está en backend/env
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
- Proyecto frontend
    - Opción 1 (compleja): NodeJS
        - La config está en frontend/env
        - Añadir nginx y hacer proxy al puerto elegido y configurar PM2
            - https://www.digitalocean.com/community/tutorials/how-to-set-up-a-node-js-application-for-production-on-ubuntu-16-04
        - Para instalar en producción:
            ```
            npm install
            ```
        - Para ejecutar en producción
            ```
            npm start:pro
     - Opción 2 (fácil). Apache
        - Copiar el contenido de la carpeta spa a /var/www/html/
        - Añadir apache a script de arranque
            ```
            sudo update-rc.d apache2 defaults
