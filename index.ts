import { fastify } from "fastify";
import db  from "./models/sequelize";
import userRoute from "./controllers/userController";
import jwt from "fastify-jwt";
import { access } from "./auth/userAuth";

const server = fastify({
    logger: true
});

server.register(jwt, { secret: access });
server.register(db);
server.register(userRoute, {prefix: "/users"});
server.listen(8080);
