import { FastifyInstance, FastifyRegisterOptions } from "fastify";
import { Db } from "../models/sequelize";
import { UserModel, IUser, IUserRefreshToken, IUserAccessToken } from "../models/userModel";
import { refresh, generateAccessToken, generateRefreshToken, isAdmin, verifyUser } from "../auth/userAuth";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { RestaurantModel } from "../models/restaurantModel";
import createHttpError from "http-errors";

// Declaration merging
declare module "fastify" {
	export interface FastifyInstance {
		db: Db;
	}
}

export default function (server: FastifyInstance, options: FastifyRegisterOptions<unknown>, done: () => void) {
    server.post<{Body: IUser}>("/register", {
        handler: async (request, reply) => 
        {
            try
            {
                const findUser = await server.db.models.UserModel.findOne({where: {
                    email: request.body.email
                }});

                if ( findUser )
                    return reply.code(409).send(createHttpError(409, "User already exists"));
                
                const password = await bcrypt.hash(request.body.password, 10);
                const userModel: IUser = {
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
                reply.code(500).send(createHttpError(500, "Internal error while registering"));
            }
        }
    });

    server.post<{Body: IUserRefreshToken}>("/login", {
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
                        const accessToken = await generateAccessToken({id: findUser.id});

                        return reply.code(200).send({
                            accessToken,
                            refreshToken: findUser.refreshToken
                        });
                    }
                    else
                    {
                        return reply.code(401).send(createHttpError(401, "Invalid creditentials"));
                    }
                }
                else 
                {
                    return reply.code(404).send(createHttpError(404, "User not found"));
                }
            }
            catch(e)
            {
                reply.code(500).send(createHttpError(500, "Internal error while logging in"));
            }
        }
    });

    server.post("/token", async (request, reply) => 
    {
        const authHeader = request.headers["authorization"];
        const refreshToken = authHeader && authHeader.split(" ")[1];
		
        if(refreshToken == null)
            return reply.code(400).send(createHttpError(400, "Invalid refresh token"));

        const user: UserModel = await server.db.models.UserModel.findOne({where: {refreshToken}});

        if(!user)
        {
            return reply.code(403).send(createHttpError(403));
        }
		
        jwt.verify(refreshToken, refresh, async (err) => 
        {
            if(err)
                return reply.code(401).send(createHttpError(401));

            const accessToken = await generateAccessToken({ id: user.id });
            return reply.code(200).send({ accessToken });
        });
    });

    server.post<{Body: {code: string}}>("/worksAt", {
        preHandler: verifyUser,
        handler: async (request, reply) => {
            const restaurant = await server.db.models.RestaurantModel.findOne({where: {code: request.body.code}});
            if ( !restaurant )
                return reply.code(404).send(createHttpError("Restaurant not found"));

            const userId = (request.user as IUserAccessToken).id;

            const user = await server.db.models.UserModel.findByPk(userId, { attributes: UserModel.safeUserAttributes });

            if ( !user )
                return reply.code(404).send(createHttpError(404, "User not found"));

            await restaurant.addEmployee(user.id);
            await user.setEmployee(restaurant);
            await user.reload({attributes: UserModel.safeUserAttributes, include:[{ model: RestaurantModel, as: "Employee"}, {model: RestaurantModel, as: "Owner"}]});
            return reply.code(200).send(user);
        }
    });

    server.get("/", {
        preHandler: isAdmin,
        handler: async (request, reply) => {
            const users = await UserModel.findAll({
                attributes: UserModel.safeUserAttributes,
                include: [{
                    model: RestaurantModel,
                    as: "Owner",
                    attributes: ["id"]
                },
                {
                    model: RestaurantModel,
                    as: "Employee",
                    attributes: ["id"]
                }
                ]
            });
            reply.code(200).send(users);
        },
    });

    server.get<{Params: {id: number}}>("/:id", {
        preHandler: verifyUser,
        handler: async (request, reply) => {
            if ( request.params.id != ((request.user) as IUserAccessToken).id )
                await isAdmin(request, reply);

            const user = await UserModel.findByPk(request.params.id, { attributes: UserModel.safeUserAttributes,
                include: [{
                    model: RestaurantModel,
                    as: "Owner",
                    attributes: RestaurantModel.fullAttributes
                },
                {
                    model: RestaurantModel,
                    as: "Employee",
                    attributes: RestaurantModel.fullAttributes
                }]});

            if ( !user )
                return reply.code(404).send(createHttpError(404, "User not found"));
            else return user;
        }
    });

    server.delete<{Params: {id: number}}>("/:id", {
        preHandler:isAdmin, 
        handler: async ( request, reply ) => {
            const user = await server.db.models.UserModel.findByPk(request.params.id);
            if ( !user )
                return reply.code(404).send(createHttpError(404, "User not found"));
            user.setOwner(null);
            return reply.code(200).send(await user.destroy());
        }
    });

    done();
}

