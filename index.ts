import { fastify } from "fastify";
import db  from "./models/sequelize";
import usersRoute from "./controllers/userController";
import restaurantsRoute from "./controllers/restaurantController";
import beachRoute from "./controllers/beachController";
import jwt from "fastify-jwt";
import { access } from "./auth/userAuth";

const server = fastify({
    logger: process.env["WEB_APP_ENVIRONMENT"] === "development" ? {
        prettyPrint: {
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname"
        },
        level: "debug"
    } : true,
    pluginTimeout: 3000000
});

server.register(jwt, { secret: access });
server.register(db);
server.register(usersRoute, {prefix: "/users"});
server.register(restaurantsRoute, {prefix: "/restaurants"});
server.register(beachRoute, {prefix: "/beaches"});
server.listen(8080);
