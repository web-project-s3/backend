import { FastifyInstance, FastifyRegisterOptions } from "fastify";
import { Db } from "../models/sequelize";
import { IUserAccessToken, User } from "../models/userModel";
import { isAdmin, verifyAndFetchAllUser, verifyUser } from "../auth/userAuth";
import {  Restaurant } from "../models/restaurantModel";
import { UniqueConstraintError, ValidationError, Op } from "sequelize";
import createHttpError from "http-errors";
import { Beach, IBeach } from "../models/beachModel";
import { Product } from "../models/productModel";

// Declaration merging
declare module "fastify" {
	export interface FastifyInstance {
		db: Db;
	}
}

export default function (server: FastifyInstance,  options: FastifyRegisterOptions<unknown>, done: () => void) {

    server.post<{Body: {beachName: string, ownerEmail: string}}>("/", {
        preHandler: isAdmin,
        handler: async (request, reply) => {
            try {
                if ( request.body.beachName )
                {
                    const user = await User.findByEmail(request.body.ownerEmail);
                    if ( user )
                    {
                        if ( await user.isOwner() )
                            return reply.code(409).send(createHttpError(409, "User is already an owner"));

                        const beach = await Beach.create( 
                            {   name: request.body.beachName, 
                                code :  server.jwt.sign({restaurantName: request.body.beachName}).substr(-5,5) });

                        await beach.$set("owner", user.id);
                        return reply.code(201).send(beach);
                    }
                    else return reply.code(404).send(createHttpError(404, "Owner couldn't be found"));
                }
                else return reply.code(400).send(createHttpError(400, "Beach is invalid"));
            }
            catch(e) {
                if ( e instanceof UniqueConstraintError )
                {
                    console.log(e);
                    return reply.code(409).send(createHttpError(409, "Beach already exists"));
                }
                else throw e;
            }
        }
    });
       
    server.get("/", {
        preHandler: isAdmin,
        handler: async (request, reply) => {
            const beach = await Beach.findAll({
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
                    model: Restaurant, 
                    attributes: ["id"],
                    as: "partners"
                },
                {
                    model: Product,
                    attributes: ["id"],
                    through: {
                        attributes: ["price"]
                    }
                }
                ]});
            reply.code(200).send(beach);
        },
    });

    server.delete<{Params: {id: number}}>("/:id", {
        preHandler: isAdmin,
        handler: async (request, reply) => {
            const beach = await Beach.findByPk(request.params.id);
            if ( !beach )
                return reply.code(404).send(createHttpError(404, "Beach not found"));
            await beach.destroy();
            return reply.code(204).send();
        }
    });


    server.get<{Params: {id: number}}>("/:id", {
        preHandler: verifyAndFetchAllUser,
        handler: async (request, reply) => {
            const user = request.user as User;

            if ( user.isAdmin || user.beachOwner && user.beachOwner.id == request.params.id )
            {
                const beach = await Beach.findByPk(request.params.id, { attributes: Beach.fullAttributes, include:[
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
                        model: Restaurant,
                        attributes: Restaurant.fullAttributes,
                        as: "partners"
                    },
                    {
                        model: Product,
                        attributes: Product.fullAttributes,
                        through: {
                            attributes: ["price"]
                        }
                    }
                ]});
                if (!beach)
                    return reply.code(404).send(createHttpError(404, "Beach not found"));

                return reply.code(200).send(beach);
            }
            else return reply.code(403).send(createHttpError(403));
        }});
    
    server.put<{Params: {id: number}, Body: IBeach}>("/:id", {
        preHandler: isAdmin,
        handler: async (request, reply) => {
            const beach = await Beach.findByPk(request.params.id);
            if ( !beach )
                return reply.code(404).send(createHttpError(404, "Beach not found"));
            
            if ( !Beach.isValid(request.body) )
                return reply.code(400).send(createHttpError(400, "Beach is missing fields"));
            
            Object.assign(beach, request.body);

            try {
                return reply.code(200).send(await beach.save());
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
            const beach = await user.$get("beachOwner");

            if ( !beach )
                return reply.code(404).send(createHttpError(404, "You're not managing any beaches"));
            
            if ( !request.body.name )
                return reply.code(400).send(createHttpError(400, "Beach must have a name"));

            beach.name = request.body.name;

            return await beach.save();
        }
    });

    server.get<{Params: {name: string}}>("/search/:name", {
        preHandler: isAdmin,
        handler: async ( request, reply ) => {
            return reply.code(200).send(await Beach.findAll({
                where:{
                    name: {
                        [Op.iLike]: "%" + request.params.name + "%"
                    }
                }, 
            }));
        }
    });

    server.post<{Body: {id: number, code: string}}>("/restaurant", {
        preHandler: verifyAndFetchAllUser,
        handler: async ( request, reply ) => {
            const user = request.user as User;

            let beach: Beach | null = null;
            if ( user.isAdmin )
                beach = await Beach.findByPk(request.body.id);
            else
                beach = await user.ownsBeach(request.body.id, reply);
            if ( reply.sent ) return;

            if ( !beach )
                return reply.code(404).send(createHttpError(404, "Beach not found"));
                
            const restaurant = await Restaurant.findOne({ where: { code: request.body.code }});
            if ( !restaurant )
                return reply.code(404).send(createHttpError(404, "Restaurant not found"));

            if ( await restaurant.$has("partners", beach.id) )
                return reply.code(409).send(createHttpError(409, "Already a partner of this restaurant"));

            return reply.code(200).send(await restaurant.$add("partners", beach));
            
        }
    });

    server.delete<{Body: {restaurantId: string, beachId: string}}>("/restaurant", {
        preHandler: verifyAndFetchAllUser, 
        handler: async ( request, reply ) => {
            const user = request.user as User;
            
            let beach: Beach | null = null;
            if ( user.isAdmin )
                beach = await Beach.findByPk(request.body.beachId);
            else
                beach = await user.ownsBeach(parseInt(request.body.beachId), reply);
            if ( reply.sent ) return;

            if ( !beach )
                return reply.code(404).send(createHttpError(404, "Beach not found"));

            if ( !await beach.$remove("partners", request.body.restaurantId) )
                return reply.code(404).send(createHttpError(404, "Beach is not a partner"));

            return reply.code(204).send();
            
        }
    });
    /*

    Routes related to beach's product :
    Tests for thoses routes are in products.tests.ts
    */

    server.get<{Params: {beachId: number}}>("/:beachId/product", {
        preHandler: verifyAndFetchAllUser,
        handler: async (request, reply) => {
            const user = request.user as User;
            let beach;
            if ( !user.isAdmin )
            {
                beach = await user.ownsBeach(request.params.beachId, reply);
                if ( reply.sent ) return;
            }
            else beach = await Restaurant.findByPk(request.params.beachId);

            if ( !beach )
                return reply.code(404).send(createHttpError(404, "Beach could not be found"));

            const products = await beach.$get("products");
            reply.code(200).send(products);
        },
    });


    done();
}

