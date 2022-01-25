import { FastifyInstance, FastifyRegisterOptions } from "fastify";
import { Db } from "../models/sequelize";
import { User, IUser, IUserRefreshToken, IUserAccessToken } from "../models/userModel";
import { refresh, generateAccessToken, generateRefreshToken, isAdmin, verifyUser, verifyAndFetchAllUser } from "../auth/userAuth";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Restaurant } from "../models/restaurantModel";
import createHttpError from "http-errors";
import { ValidationError, Op} from "sequelize";
import { Beach } from "../models/beachModel";

// Declaration merging
declare module "fastify" {
	export interface FastifyInstance {
		db: Db;
	}
}

export default function (server: FastifyInstance, options: FastifyRegisterOptions<unknown>, done: () => void) {
    server.get("/test/", {
        preHandler: verifyAndFetchAllUser,
        handler: async ( request, reply ) => {
            server.log.error((request.user as any).owner);
        }
    });

    server.post<{Body: IUser}>("/register", {
        handler: async (request, reply) => 
        {
            try
            {
                const findUser = await User.findOne({where: {
                    email: request.body.email
                }});

                if ( findUser )
                    return reply.code(409).send(createHttpError(409, "User already exists"));


                if ( request.body.password.length < 6 )
                    return reply.code(400).send(createHttpError(400, "Password must be at least 6 characters long"));
                
                const password = await bcrypt.hash(request.body.password, 10);
                const user = new User({
                    firstname: request.body.firstname,
                    lastname: request.body.lastname,
                    email: request.body.email,
                    password,
                    refreshToken: await generateRefreshToken({ email: request.body.email, password }),
                    isAdmin: false 
                });

                await user.save();
                
                reply.code(201).send({id: user.id});
            }
            catch(e)
            {
                console.log(e);
                reply.code(500).send(createHttpError(500));
            }
        }
    });

    server.post<{Body: IUserRefreshToken}>("/login", {
        handler: async (request, reply) => 
        {
            try
            {
                const findUser = await User.findOne({where: {
                    email: request.body.email
                }});

                if ( findUser )
                {
                    if ( await bcrypt.compare(request.body.password, findUser.password) )
                    {
                        const accessToken = await generateAccessToken({id: findUser.id});

                        return reply.code(200).send({
                            id: findUser.id,
                            firstname: findUser.firstname,
                            lastname: findUser.lastname,
                            email: findUser.email,
                            restaurantOwnerId: findUser.restaurantOwnerId,
                            restaurantEmployeeId: findUser.restaurantEmployeeId,
                            beachOwnerId: findUser.beachOwnerId,
                            beachEmployeeId: findUser.beachEmployeeId,
                            isAdmin: findUser.isAdmin,
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

        const user = await User.findOne({where: {refreshToken}});

        if(!user)
        {
            return reply.code(403).send(createHttpError(403));
        }
		
        jwt.verify(refreshToken, refresh, async (err) => 
        {
            if(err)
                return reply.code(401).send(createHttpError(401));

            const accessToken = await generateAccessToken({ id: user.id });
            return reply.code(200).send({
                id: user.id,
                firstname: user.firstname,
                lastname: user.lastname,
                email: user.email,
                restaurantOwnerId: user.restaurantOwnerId,
                restaurantEmployeeId: user.restaurantEmployeeId,
                beachOwnerId: user.beachOwnerId,
                beachEmployeeId: user.beachEmployeeId,
                isAdmin: user.isAdmin,
                accessToken,
                refreshToken: user.refreshToken
            });
        });
    });

    server.post<{Body: {code: string}}>("/worksAt", {
        preHandler: verifyUser,
        handler: async (request, reply) => {
            const restaurant = await Restaurant.findOne({where: {code: request.body.code}});
            const beach = await Beach.findOne({where:{ code: request.body.code}});

            if ( !restaurant && !beach )
                return reply.code(404).send(createHttpError(404, "Restaurant or beach not found"));

            const userId = (request.user as IUserAccessToken).id;

            const user = await User.findByPk(userId, { attributes: User.safeUserAttributes });

            if ( !user )
                return reply.code(404).send(createHttpError(404, "User not found"));

            if (restaurant)
            {
                await restaurant.$add("Employee", user.id);
                await user.$set("beachEmployee", null);
            }
            else
            {
                await beach?.$add("Employee", user.id);
                await user.$set("restaurantEmployee", null);
            }

            return reply.code(200).send(await user.reload({attributes: User.safeUserAttributes, include:[
                { model: Restaurant, as: "restaurantEmployee"}, 
                { model: Restaurant, as: "restaurantOwner"},
                { model: Beach, as: "beachEmployee"},
                { model: Beach, as: "beachOwner"}]}));
        }
    });

    server.get("/", {
        preHandler: isAdmin,
        handler: async (request, reply) => {
            const users = await User.findAll({
                attributes: User.safeUserAttributes,
                include: [{
                    model: Restaurant,
                    as: "restaurantOwner",
                    attributes: ["id"]
                },
                {
                    model: Restaurant,
                    as: "restaurantEmployee",
                    attributes: ["id"]
                },
                {
                    model: Beach,
                    as: "beachOwner",
                    attributes: ["id"]
                },
                {
                    model: Beach,
                    as: "beachEmployee",
                    attributes: ["id"]
                }
                ]
            });
            return reply.code(200).send(users);
        },
    });

    server.get<{Params: {id: number}}>("/:id", {
        preHandler: verifyAndFetchAllUser,
        handler: async (request, reply) => {
            const authUser = request.user as User;
            if ( ( request.params.id != authUser.id ) && !authUser.isAdmin )
                return reply.code(403).send(createHttpError(403));

            const user = await User.findByPk(request.params.id, { attributes: User.safeUserAttributes,
                include: [{
                    model: Restaurant,
                    as: "restaurantOwner",
                    attributes: Restaurant.fullAttributes
                },
                {
                    model: Restaurant,
                    as: "restaurantEmployee",
                    attributes: Restaurant.fullAttributes
                },
                {
                    model: Beach,
                    as: "beachOwner",
                    attributes: Beach.fullAttributes
                },
                {
                    model: Beach,
                    as: "beachEmployee", 
                    attributes: Beach.fullAttributes
                }
                ]});

            if ( !user )
                return reply.code(404).send(createHttpError(404, "User not found"));
            else return user;
        }
    });

    server.delete<{Params: {id: number}}>("/:id", {
        preHandler:isAdmin, 
        handler: async ( request, reply ) => {
            const user = await User.findByPk(request.params.id);
            if ( !user )
                return reply.code(404).send(createHttpError(404, "User not found"));

            await user.destroy();
            return reply.code(204).send();
        }
    });

    server.put<{Body: User, Params: {id: number}}>("/:id", {
        preHandler:isAdmin,
        handler: async ( request, reply ) => {
            const user = await User.findByPk(request.params.id);
            const b = request.body;

            if ( !user )
                return reply.code(404).send(createHttpError(404, "User not found"));
            
            if ( b.firstname && b.lastname && b.email && b.password && isAdmin != null )
            {
                if ( b.password.length < 6 )
                    return reply.code(400).send(createHttpError(400, "Password must be at least 6 characters long"));

                Object.assign(user, b);
                user.refreshToken = await generateRefreshToken({email: b.email, password: b.password});

                try {
                    reply.code(200).send(await user.save());
                }
                catch(e) {
                    if ( e instanceof ValidationError )
                    {
                        server.log.error(e);
                        return reply.code(409).send("Email is already taken");
                    }
                    server.log.error(e);
                }
            }
            else return reply.code(400).send(createHttpError(400, "User is missing fields"));
        }
    });

    server.patch<{Body: IUser, Params: {id: number}}>("/:id", {
        preHandler:verifyAndFetchAllUser,
        handler: async ( request, reply ) => {
            const userAuth = request.user as User;
            const b = request.body;

            if (( userAuth.id != request.params.id ) && !userAuth.isAdmin )
                return reply.code(403).send(createHttpError(403));

            const user = await User.findByPk(request.params.id);

            if ( !user )
                return reply.code(404).send(createHttpError(404, "User not found"));
            

            if ( b.password != null && b.password.length < 6 )
                return reply.code(400).send(createHttpError(400, "Password must be at least 6 characters long"));

            if ( b.email != null ) user.email = b.email;
            if ( b.firstname != null ) user.firstname = b.firstname;
            if ( b.lastname != null ) user.lastname = b.lastname;
            if ( b.password != null ) 
            {
                user.password = b.password;
                user.refreshToken = await generateRefreshToken({email: b.email, password: b.password});
            }

            try {
                return reply.code(200).send(await user.save());
            }
            catch(e) {
                server.log.error(e);
                if ( e instanceof ValidationError )
                    return reply.code(409).send("Email is already taken");
                return reply.code(500).send(createHttpError(500));
            }   
        }
    });

    server.get<{Params: {firstname: string, lastname: string}}>("/:firstname/:lastname", {
        preHandler: isAdmin,
        handler: async ( request, reply ) => {
            return reply.code(200).send(await User.findAll({
                where:{
                    firstname: {
                        [Op.iLike]: "%" + request.params.firstname + "%"
                    },
                    lastname: {
                        [Op.iLike]: "%" + request.params.lastname + "%"
                    }
                }, 
                attributes: User.safeUserAttributes
            }));
        }
    });

    done();
}