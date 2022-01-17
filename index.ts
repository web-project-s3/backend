import { fastify } from "fastify";
import db  from "./models/sequelize";
import usersRoute from "./controllers/userController";
import restaurantsRoute from "./controllers/restaurantController";
import jwt from "fastify-jwt";
import { access } from "./auth/userAuth";

const server = fastify({
    logger: true
});

server.register(jwt, { secret: access });
server.register(db);
server.register(usersRoute, {prefix: "/users"});
server.register(restaurantsRoute, {prefix: "/restaurants"});
server.listen(8080);
