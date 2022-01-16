import { FastifyInstance, FastifyRegisterOptions } from "fastify";
import { Db } from "../models/sequelize";
import { UserModel, User, UserRefreshToken } from "../models/userModel";
import { refresh, generateAccessToken, generateRefreshToken, isAdmin } from "../auth/userAuth";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { RestaurantModel } from "../models/restaurantModel";

// Declaration merging
declare module "fastify" {
	export interface FastifyInstance {
		db: Db;
	}
}

export default function (server: FastifyInstance, options: FastifyRegisterOptions<unknown>, done: () => void) {
    server.post<{Body: User}>("/register", {
        handler: async (request, reply) => 
        {
            try
            {
                const findUser = await server.db.models.UserModel.findOne({where: {
                    email: request.body.email
                }});

                if ( findUser )
                    return reply.code(409).send("User already exists");
                
                const password = await bcrypt.hash(request.body.password, 10);
                const userModel: User = {
                    firstname: request.body.firstname,
                    lastname: request.body.lastname,
                    email: request.body.email,
                    password,
                    refreshToken: await generateRefreshToken({ email: request.body.email, password })
                };
                
                await server.db.models.UserModel.create(userModel);
                reply.code(201).send({refreshToken: userModel.refreshToken});
            }
            catch(e)
            {
                console.log(e);
                reply.code(500).send("Internal error while registering");
            }
        }
    });

    server.post<{Body: UserRefreshToken}>("/login", {
        handler: async (request, reply) => 
        {
            try
            {
                const findUser = await server.db.models.UserModel.findOne({where: {
                    email: request.body.email
                }});

                if ( findUser )
                {
                    if ( await bcrypt.compare(request.body.password, findUser.password) )
                    {
                        const accessToken = await generateAccessToken({id: findUser.id, isAdmin: findUser.isAdmin});

                        return reply.code(200).send({
                            accessToken,
                            refreshToken: findUser.refreshToken
                        });
                    }
                    else
                    {
                        return reply.code(401).send("Invalid creditentials");
                    }
                }
                else 
                {
                    return reply.code(404).send("User not found");
                }
            }
            catch(e)
            {
                reply.code(500).send("Internal error while registering");
            }
        }
    });

    server.post("/token", async (request, reply) => 
    {
        const authHeader = request.headers["authorization"];
        const refreshToken = authHeader && authHeader.split(" ")[1];
		
        if(refreshToken == null)
            return reply.code(400).send("Invalid refresh token");

        const user: UserModel = await server.db.models.UserModel.findOne({where: {refreshToken}});

        if(!user)
        {
            return reply.code(403).send("Forbidden");
        }
		
        jwt.verify(refreshToken, refresh, async (err) => 
        {
            if(err)
                return reply.code(401).send("Unauthorized");

            const accessToken = await generateAccessToken({ id: user.id, isAdmin: user.isAdmin });
            reply.code(200).send({ accessToken });
        });
    });

    server.get("/", {
        preHandler: isAdmin,
        handler: async (request, reply) => {
            const users = await UserModel.findAll({
                attributes:["id", "firstname", "lastname", "email", "isAdmin"],
                include: [{
                    model: RestaurantModel,
                    as: "Owner"
                },
                {
                    model: RestaurantModel,
                    as: "Employees"
                }
                ]
            });
            reply.code(200).send(users);
        },
    });

    done();
}

