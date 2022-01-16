import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { Db } from "../models/sequelize";
import { UserModel, User } from "../models/userModel";
import { globalAdminAuth, refresh, access, generateAccessToken, generateRefreshToken } from "../auth/userAuth";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Declaration merging
declare module "fastify" {
	export interface FastifyInstance {
		db: Db;
	}
}

export default function (fastify: FastifyInstance,  options: any, done: Function) {
    fastify.post<{Body: User}>("/register", {
        handler: async (request, reply) => 
        {
            try
            {
                const findUser = await fastify.db.models.UserModel.findOne({where: {
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
                
                await fastify.db.models.UserModel.create(userModel);
                reply.code(201).send(userModel.refreshToken);
            }
            catch(e)
            {
                reply.code(500).send("Internal error while registering");
            }
        }
    });

    fastify.post<{Body: {email: string, password: string}}>("/login", {
        handler: async (request, reply) => 
        {
            try
            {
                const findUser = await fastify.db.models.UserModel.findOne({where: {
                    email: request.body.email
                }});

                if ( findUser )
                {
                    if ( await bcrypt.compare(request.body.password, findUser.password) )
                    {
                        const accessToken = await generateAccessToken({id: findUser.id});

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

    fastify.post("/token", async (request, reply) => 
    {
        const authHeader = request.headers["authorization"];
        const refreshToken = authHeader && authHeader.split(" ")[1];
		
        if(refreshToken == null)
            return reply.code(400).send("Invalid refresh token");

        const user: UserModel = await fastify.db.models.UserModel.findOne({where: {refreshToken}});

        if(!user)
        {
            return reply.code(403).send("Forbidden");
        }
		
        jwt.verify(refreshToken, refresh, async (err) => 
        {
            if(err)
                return reply.code(401).send("Unauthorized");

            const accessToken = await generateAccessToken({ id: user.id });
            reply.code(200).send({ AccessToken: accessToken });
        });
    });

    done();
}

