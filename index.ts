import { fastify } from "fastify";
import db  from "./src/models/sequelize";
import usersRoute from "./src/controllers/userController";
import restaurantsRoute from "./src/controllers/restaurantController";
import beachRoute from "./src/controllers/beachController";
import productRoute from "./src/controllers/productController";
import orderRoute from "./src/controllers/orderController";
import jwt from "fastify-jwt";
import bcrypt from "bcrypt";
import cors from "fastify-cors";
import socketio from "fastify-socket.io";
import { instrument } from "@socket.io/admin-ui";
import { access, generateRefreshToken } from "./src/auth/userAuth";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";

export function build(){
    const server = fastify({
        logger:process.env["WEB_APP_ENVIRONMENT"] === "development" ? {
            prettyPrint: {
                translateTime: "HH:MM:ss Z",
                ignore: "pid,hostname"
            },
            level: "debug"
        } : true
        ,pluginTimeout: 3000000
    });
    
    server.register(jwt, { secret: access });
    server.register(cors, { origin: "*" });
    server.register(db);
    server.register(socketio);
    server.register(productRoute, {prefix: "/products"});
    server.register(usersRoute, {prefix: "/users"});
    server.register(restaurantsRoute, {prefix: "/restaurants"});
    server.register(beachRoute, {prefix: "/beaches"});
    server.register(orderRoute, {prefix: "/orders"});

    if ( !(process.env["NODE_ENV"] == "test")) 
    {
        server.ready().then(async () => {
            const host = process.env["REDIS_HOSTNAME"];
            const password = process.env["REDIS_PASSWORD"];
            const port = process.env["REDIS_PORT"];
            const pubClient = createClient({password, socket: { host, port: port ? parseInt(port) : 6379}});
            await pubClient.connect();
            const subClient = pubClient.duplicate();
            await subClient.connect();
            server.io.adapter(createAdapter(pubClient, subClient));
    
            server.io.on("connect", (socket) => server.log.debug(`Connected : ${socket.id}`));
    
            instrument(server.io, {
                auth: {
                    type: "basic",
                    username: "admin",
                    password: "$2a$12$EnNaiQbujcA6jyN6Mn1WNOG7RXESAm7f6x3z4OZrLAFVcK8/48HuS"
                }
            });

            if ( process.env["ADMIN_EMAIL"] && process.env["ADMIN_PASSWORD"] )
            {

                try {
                    const password = await bcrypt.hash(process.env["ADMIN_PASSWORD"], 10);
                    const user = new server.db.models.User({
                        firstname: "admin",
                        lastname: "admin",
                        email: process.env["ADMIN_EMAIL"],
                        password,
                        refreshToken: await generateRefreshToken({ email: process.env["ADMIN_EMAIL"], password }),
                        isAdmin: true 
                    });
                
                    await user.save();
                }
                catch(e) {
                    server.log.error(e);
                }
            }

        });
    }

    return server;
}

const server = build();
if ( process.env["NODE_ENV"] != "test")
    server.listen(8080, "0.0.0.0");