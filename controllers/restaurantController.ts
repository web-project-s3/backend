import { FastifyInstance, FastifyRegisterOptions } from "fastify";
import { Db } from "../models/sequelize";
import { IUser, IUserAccessToken, User } from "../models/userModel";
import { isAdmin, verifyUser } from "../auth/userAuth";
import { IRestaurant, Restaurant } from "../models/restaurantModel";
import { UniqueConstraintError, ValidationError, Op } from "sequelize";
import createHttpError from "http-errors";
import { Beach } from "../models/beachModel";

// Declaration merging
declare module "fastify" {
	export interface FastifyInstance {
		db: Db;
	}
}

export default function (server: FastifyInstance,  options: FastifyRegisterOptions<unknown>, done: () => void) {

    server.post<{Body: {restaurantName: string, ownerEmail: string}}>("/", {
        preHandler: isAdmin,
        handler: async (request, reply) => {
            try {
                if ( request.body.restaurantName )
                {
                    const user = await User.findByEmail(request.body.ownerEmail);
                    if ( user )
                    {
                        if ( await user.isOwner() )
                            return reply.code(409).send(createHttpError(409, "User is already an owner"));

                        const restaurant = await Restaurant.create( 
                            {   name: request.body.restaurantName, 
                                code :  server.jwt.sign({restaurantName: request.body.restaurantName}).substr(-5,5) });

                        await restaurant.$set("owner", user.id);
                        return reply.code(201).send(restaurant);
                    }
                    else return reply.code(404).send(createHttpError(404, "Owner couldn't be found"));
                }
                else return reply.code(400).send(createHttpError(400, "Restaurant is invalid"));

                
            }
            catch(e) {
                if ( e instanceof UniqueConstraintError )
                {
                    console.log(e);
                    return reply.code(409).send(createHttpError(409, "Restaurant already exists"));
                }
                else throw e;
            }
        }
    });
    
    server.get("/", {
        preHandler: isAdmin,
        handler: async (request, reply) => {
            const restaurants = await Restaurant.findAll({
                attributes: ["id", "code", "name"],
                include: [{
                    model: User,
                    attributes: ["id"],
                    as: "owner"
                },
                {
                    model: User,
                    attributes: ["id"],
                    as: "employees"
                },
                {
                    model: Beach,
                    attributes: ["id"],
                }
                ]
            });
            reply.code(200).send(restaurants);
        },
    });

    server.delete<{Params: {id: number}}>("/:id", {
        preHandler: isAdmin,
        handler: async (request, reply) => {
            const restaurant = await Restaurant.findByPk(request.params.id);
            if ( !restaurant )
                return reply.code(404).send(createHttpError(404, "Restaurant not found"));
            await restaurant.$set("owner", null);
            await restaurant.destroy();
            return reply.code(200).send();
        }
    });


    server.get<{Params: {id: number}}>("/:id", {
        preHandler: verifyUser,
        handler: async (request, reply) => {
            
            const user = await User.findByPk((request.user as IUserAccessToken).id, { attributes: User.safeUserAttributes, include: { model: Restaurant, as: "restaurantOwner"} });
            if ( !user )
            {
                server.log.error("/restaurants/:id : user should exists at this point");
                return reply.code(500).send(createHttpError(500));
            }

            if ( user.isAdmin || user.restaurantOwner && user.restaurantOwner.id == request.params.id )
            {
                const restaurant = await Restaurant.findByPk(request.params.id, { attributes: Restaurant.fullAttributes, include:[
                    {
                        model: User,
                        attributes: User.safeUserAttributes,
                        as: "owner"
                    },
                    {
                        model: User,
                        attributes: User.safeUserAttributes,
                        as: "employees"
                    },
                    {
                        model: Beach,
                        attributes: Beach.fullAttributes
                    }
                ]});
                if (!restaurant)
                    return reply.code(404).send(createHttpError(404, "Restaurant not found"));

                return reply.code(200).send(restaurant);
            }
            else return reply.code(403).send(createHttpError(403));
        }});
    
    server.put<{Params: {id: number}, Body: IRestaurant}>("/:id", {
        preHandler: isAdmin,
        handler: async (request, reply) => {
            const restaurant = await Restaurant.findByPk(request.params.id);
            if ( !restaurant )
                return reply.code(404).send(createHttpError(404, "Restaurant not found"));
            
            if ( !Restaurant.isValid(request.body))
                return reply.code(400).send(createHttpError(400, "Restaurant is missing fields"));
            
            Object.assign(restaurant, request.body);

            try {
                return reply.code(200).send(await restaurant.save());
            }
            catch(e) {
                server.log.error(e);
                if ( e instanceof ValidationError )
                    return reply.code(409).send(createHttpError(409, "Code is not unique"));
                return reply.code(500).send(createHttpError(500));
            }
        }
    });

    server.patch<{Body: {name: string}}>("/", {
        preHandler:verifyUser,
        handler: async (request, reply) => {
            const userId = (request.user as IUserAccessToken).id;
            const user = await User.findByPk(userId);
            if ( !user )
                return reply.code(404).send(createHttpError(404, "User not valid"));
            const restaurant = await user.$get("restaurantOwner"); //HERE

            if ( !restaurant )
                return reply.code(404).send(createHttpError(404, "You're not managing any restaurants"));
            
            if ( !request.body.name )
                return reply.code(400).send(createHttpError(400, "Restaurant must have a name"));

            restaurant.name = request.body.name;

            return await restaurant.save();
        }
    });

    server.get<{Params: {name: string}}>("/search/:name", {
        preHandler: isAdmin,
        handler: async ( request, reply ) => {
            return reply.code(200).send(await Restaurant.findAll({
                where:{
                    name: {
                        [Op.iLike]: "%" + request.params.name + "%"
                    }
                }, 
            }));
        }
    });

    server.post<{Body: {id: number, code: string}}>("/beach", {
        preHandler: verifyUser,
        handler: async ( request, reply ) => {
            const user = await User.findByPk((request.user as IUserAccessToken).id);
            if ( user )
            {
                let restaurant: Restaurant | null = null;
                if ( user.isAdmin )
                    restaurant = await Restaurant.findByPk(request.body.id);
                else
                    restaurant = await user.ownsRestaurant(request.body.id, reply);

                if ( !restaurant )
                    return reply.code(404).send(createHttpError(404, "Restaurant not found"));
                
                const beach = await Beach.findOne({ where: { code: request.body.code }});
                if ( !beach )
                    return reply.code(404).send(createHttpError(404, "Beach could not be found"));

                if ( await beach.$has("restaurants", restaurant.id) )
                    return reply.code(409).send(createHttpError(409, "Already a partner of this beach"));

                return reply.code(200).send(await beach.$add("restaurants", restaurant));
            }
        }
    });

    server.delete<{Body: {restaurantId: string, beachId: string}}>("/beach", {
        preHandler: verifyUser, 
        handler: async ( request, reply ) => {
            const user = await User.findByPk((request.user as IUserAccessToken).id);
            if ( user )
            {
                let restaurant: Restaurant | null = null;
                if ( user.isAdmin )
                    restaurant = await Restaurant.findByPk(request.body.restaurantId);
                else
                    restaurant = await user.ownsRestaurant(parseInt(request.body.restaurantId), reply);

                if ( !restaurant )
                    return reply.code(404).send(createHttpError(404, "Restaurant not found"));

                if ( !await restaurant.$remove("beaches", request.body.beachId) )
                    return reply.code(404).send(createHttpError(404, "Beach is not a partner"));

                return reply.code(204).send();
            }
        }
    });

    done();
}

