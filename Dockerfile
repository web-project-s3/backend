###
### Première partie : Compilation du code Typescript
###
FROM node:16.13.1 as tsc-builder
WORKDIR /usr/src/app

# Installation des dépendances et build.
COPY . .
RUN npm install && npm run build

###
### Construction de l'image de production (2ème partie)
###
FROM node:16.13.1 as runtime-container
WORKDIR /usr/src/app
COPY --from=tsc-builder /usr/src/app/build ./build
COPY --from=tsc-builder ["/usr/src/app/package.json", "/usr/src/app/package-lock.json", "./"]
RUN npm install --only=prod
EXPOSE 8080

# La commande de lancement
CMD [ "node", "./build/index.js" ]