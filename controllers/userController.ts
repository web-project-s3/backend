import { FastifyInstance, FastifyRegisterOptions } from "fastify";
import { Db } from "../models/sequelize";
import { User, IUser, IUserRefreshToken, IUserAccessToken } from "../models/userModel";
import { refresh, generateAccessToken, generateRefreshToken, isAdmin, verifyUser } from "../auth/userAuth";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Restaurant } from "../models/restaurantModel";
import createHttpError from "http-errors";
import { Sequelize, ValidationError, Op} from "sequelize";

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
                user.save();
                reply.code(201).send({user});
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
                const findUser = await User.findOne({where: {
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
            return reply.code(200).send({ accessToken });
        });
    });

    server.post<{Body: {code: string}}>("/worksAt", {
        preHandler: verifyUser,
        handler: async (request, reply) => {
            const restaurant = await Restaurant.findOne({where: {code: request.body.code}});
            if ( !restaurant )
                return reply.code(404).send(createHttpError("Restaurant not found"));

            const userId = (request.user as IUserAccessToken).id;

            const user = await server.db.models.User.findByPk(userId, { attributes: User.safeUserAttributes });

            if ( !user )
                return reply.code(404).send(createHttpError(404, "User not found"));

            await restaurant.$add("Employee", user.id);
            await user.reload({attributes: User.safeUserAttributes, include:[{ model: Restaurant, as: "restaurantEmployee"}, {model: Restaurant, as: "restaurantOwner"}]});
            return reply.code(200).send(user);
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
                }]});

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
            return reply.code(200).send(await user.destroy());
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

    server.patch<{Body: IUser, Params: {id: number}}>("/", {
        preHandler:verifyUser,
        handler: async ( request, reply ) => {
            const user = await User.findByPk((request.user as IUserAccessToken).id);
            const b = request.body;

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