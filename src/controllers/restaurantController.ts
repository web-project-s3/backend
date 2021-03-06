import { FastifyInstance, FastifyRegisterOptions, FastifyRequest, FastifyReply } from "fastify";
import { Db } from "../models/sequelize";
import {  User } from "../models/userModel";
import { isAdmin, verifyAndFetchAllUser } from "../auth/userAuth";
import { IRestaurant, Restaurant } from "../models/restaurantModel";
import { UniqueConstraintError, ValidationError, Op } from "sequelize";
import createHttpError from "http-errors";
import { Beach } from "../models/beachModel";
import { Product } from "../models/productModel";
import { BeachProduct } from "../models/beach_productsModel";

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
                    as: "partners"
                },
                {
                    model: Product, 
                    attributes: ["id"]
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
            await restaurant.$set("employees", null);
            await restaurant.destroy();
            return reply.code(204).send();
        }
    });


    server.get<{Params: {id: number}}>("/:id", {
        preHandler: verifyAndFetchAllUser,
        handler: async (request, reply) => {
            
            const user = request.user as User;

            if ( user.isAdmin || user.canAccesRestaurant(request.params.id) )
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
                        attributes: Beach.fullAttributes,
                        as: "partners"
                    },
                    {
                        model: Product, 
                        attributes: Product.fullAttributes,
                        include: [
                            {
                                model: Beach,
                                attributes: Beach.fullAttributes,
                                through: {
                                    as: "pricing",
                                    attributes: ["price"]
                                }
                            }
                        ]
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
        preHandler:verifyAndFetchAllUser,
        handler: async (request, reply) => {
            const user = request.user as User;
            const restaurant = user.restaurantOwner;

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

    server.post<{Body: {code: string}, Params: {id: number}}>("/:id/beach", {
        preHandler: verifyAndFetchAllUser,
        handler: async ( request, reply ) => {
            const user = request.user as User;
            let restaurant: Restaurant | null = null;
            if ( user.isAdmin )
                restaurant = await Restaurant.findByPk(request.params.id);
            else
                restaurant = await user.ownsRestaurant(request.params.id, reply);
            if ( reply.sent ) return;

            if ( !restaurant )
                return reply.code(404).send(createHttpError(404, "Restaurant not found"));
                
            const beach = await Beach.findOne({ where: { code: request.body.code }});
            if ( !beach )
                return reply.code(404).send(createHttpError(404, "Beach could not be found"));

            if ( await beach.$has("partners", restaurant.id) )
                return reply.code(409).send(createHttpError(409, "Already a partner of this beach"));

            return reply.code(200).send(await beach.$add("partners", restaurant));
        }
    });

    server.delete<{Params: {restaurantId: string, beachId: string}}>("/:restaurantId/beach/:beachId", {
        preHandler: verifyAndFetchAllUser, 
        handler: async ( request, reply ) => {
            const user = request.user as User;
            let restaurant: Restaurant | null = null;
            if ( user.isAdmin )
                restaurant = await Restaurant.findByPk(request.params.restaurantId);
            else
                restaurant = await user.ownsRestaurant(parseInt(request.params.restaurantId), reply);
            if ( reply.sent ) return;

            if ( !restaurant )
                return reply.code(404).send(createHttpError(404, "Restaurant not found"));

            if ( !await restaurant.$remove("partners", request.params.beachId) )
                return reply.code(404).send(createHttpError(404, "Beach is not a partner"));

            return reply.code(204).send();
        }
    });

    /*
    Routes related to restaurant's product :
    Tests for thoses routes are in products.tests.ts
    */

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function userCanAccesRestaurant(restaurantId: number, request: FastifyRequest<any>, reply: FastifyReply): Promise<Restaurant | null> {
        const user = request.user as User;
        let restaurant;

        if ( !user.isAdmin )
        {
            restaurant = await user.ownsRestaurant(request.params.restaurantId, reply);
            if ( reply.sent ) return null;
        }
        else restaurant = await Restaurant.findByPk(request.params.restaurantId);

        if ( !restaurant )
        {
            reply.code(404).send(createHttpError(404, "Restaurant could not be found"));
            return null;
        }
        return restaurant;
    }

    server.delete<{Params: {restaurantId: number, productId: number, beachId: number}, Body: { price: number}}>("/:restaurantId/product/:productId/beach/:beachId", {
        preHandler: verifyAndFetchAllUser,
        handler: async (request, reply) => {
            const restaurant = await userCanAccesRestaurant(request.params.restaurantId, request, reply);
            if ( restaurant === null ) return;
            const product = await Product.findByPk(request.params.productId);

            if ( !product )
                return reply.code(404).send(createHttpError(404, "Product not found"));

            if ( product.restaurantId !== request.params.restaurantId && !(request.user as User).isAdmin )
                return reply.code(403).send(createHttpError(403));

            const beachProduct = await BeachProduct.findOne( {
                where: {
                    productId: request.params.productId,
                    beachId: request.params.beachId
                }
            });

            if ( !beachProduct )
                return reply.code(404).send(createHttpError(404, "Product not found"));

            return reply.code(204).send(await beachProduct.destroy());
        }
    });

    server.post<{Body: {name: string, imageUrl: string}, Params: { restaurantId: number }}>("/:restaurantId/product", {
        preHandler: verifyAndFetchAllUser,
        handler: async (request, reply) => {
            const restaurant = await userCanAccesRestaurant(request.params.restaurantId, request, reply);
            if ( restaurant === null ) return;

            const product = new Product({
                name: request.body.name,
                imageUrl: request.body.imageUrl,
                restaurantId: restaurant.id
            });
            try {
                return reply.code(201).send(await product.save());
            }
            catch(e)
            {
                if ( e instanceof UniqueConstraintError )
                    return reply.code(409).send(createHttpError(409, "Image URL is not unique"));
                throw e;
            }
        }
    });

    server.get<{Params: {restaurantId: number}}>("/:restaurantId/product", {
        preHandler: verifyAndFetchAllUser,
        handler: async (request, reply) => {
            const restaurant = await userCanAccesRestaurant(request.params.restaurantId, request, reply);
            if ( restaurant === null ) return;

            const products = await restaurant.$get("products", {
                include: [
                    {
                        model: Beach,
                        attributes: Beach.fullAttributes,
                        through: {
                            as: "pricing",
                            attributes: ["price"]
                        }
                    }
                ]});

            reply.code(200).send(products);
        }
    });

    server.put<{Params: {restaurantId: number, productId: number, beachId: number}, Body: { price: number}}>("/:restaurantId/product/:productId/beach/:beachId", {
        preHandler: verifyAndFetchAllUser,
        handler: async (request, reply) => {
            const restaurant = await userCanAccesRestaurant(request.params.restaurantId, request, reply);
            if ( restaurant === null ) return;


            const products = await restaurant.$get("products", { where: { id: request.params.productId}});
            const beaches = await restaurant.$get("partners", { where: { id: request.params.beachId}});
            if ( beaches.length === 0)
                return reply.code(404).send("Beach not found");
            if ( products.length === 0)
                return reply.code(404).send("Product not found");
            
            const beachProduct = await BeachProduct.upsert({
                beachId: request.params.beachId,
                productId: request.params.productId,
                price: request.body.price
            });

            return reply.code(beachProduct[0].createdAt.toString() == beachProduct[0].updatedAt.toString() ? 201:200).send(beachProduct[0]);
        }
    });

    server.get<{Params: {restaurantId: number, beachId: number}}>("/:restaurantId/beach/:beachId", {
        preHandler: verifyAndFetchAllUser,
        handler: async (request, reply) => {
            const user = request.user as User;

            if ( (!await user.canAccesBeach(request.params.beachId)) && (!await user.canAccesRestaurant(request.params.restaurantId)) && !user.isAdmin)
                return reply.code(403).send(createHttpError(403));

            const restaurant = await Restaurant.findByPk(request.params.restaurantId);
            const beach = await Beach.findByPk(request.params.beachId);

            if ( beach === null) return reply.code(404).send(createHttpError(404, "Beach not found"));
            if ( restaurant === null ) return reply.code(404).send(createHttpError(404, "Restaurant not found"));

            const products = await Product.findAll({where: {
                restaurantId: request.params.restaurantId
            },
            include: [
                {
                    model: Beach,
                    attributes: Beach.fullAttributes,
                    where: {
                        id: request.params.beachId
                    },
                    through: {
                        as: "pricing",
                        attributes: ["price"]
                    }
                },
                {
                    model: Restaurant,
                    attributes: Restaurant.fullAttributes
                }
            ]});
        
            return reply.code(200).send(products);
        }
    });

    done();
}