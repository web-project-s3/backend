import { fastify } from "fastify";
import db  from "./src/models/sequelize";
import usersRoute from "./src/controllers/userController";
import restaurantsRoute from "./src/controllers/restaurantController";
import beachRoute from "./src/controllers/beachController";
import productRoute from "./src/controllers/productController";
import jwt from "fastify-jwt";
import cors from "fastify-cors";
import { access } from "./src/auth/userAuth";

export function build(){
    const server = fastify({
        logger: process.env["WEB_APP_ENVIRONMENT"] === "development" ? {
            prettyPrint: {
                translateTime: "HH:MM:ss Z",
                ignore: "pid,hostname"
            },
            level: "debug"
        } : true
        ,pluginTimeout: 3000000
    });
    
    server.register(jwt, { secret: access });
    server.register(cors);
    server.register(db);
    server.register(productRoute, {prefix: "/products"});
    server.register(usersRoute, {prefix: "/users"});
    server.register(restaurantsRoute, {prefix: "/restaurants"});
    server.register(beachRoute, {prefix: "/beaches"});

    return server;
}

const server = build();
if ( process.env["NODE_ENV"] != "test")
    server.listen(8080);