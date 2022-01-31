###
### Première partie : Compilation du code Typescript
###
FROM node:16.13.1 as tsc-builder
WORKDIR /usr/src/app

ENV DB_HOST="127.0.0.1"
ENV DB_PORT="5432"
ENV DB_NAME="postgres"
ENV DB_DIALECT="postgres"
ENV REFRESH_TOKEN="token"
ENV ACCESS_TOKEN="accesstoken"

# Installation des dépendances et build.
COPY . .
RUN env
RUN npm install && npm run test && npm run build

###
### Construction de l'image de production (2ème partie)
###
FROM node:16.13.1 as runtime-container
WORKDIR /usr/src/app

# On copie les sources compilées depuis la première étape
COPY --from=tsc-builder /usr/src/app/build ./build
COPY --from=tsc-builder ["/usr/src/app/package.json", "/usr/src/app/package-lock.json", "./"]

# Installation des modules de production seulement
RUN npm install --only=prod

# On expose le port 4000 en sortie
EXPOSE 8080

# La commande de lancement
CMD [ "node", "./build/index.js" ]