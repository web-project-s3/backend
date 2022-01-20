import { FastifyInstance, FastifyRegisterOptions } from "fastify";
import { Db } from "../models/sequelize";
import { IUserAccessToken, User } from "../models/userModel";
import { isAdmin, verifyAndFetchAllUser, verifyUser } from "../auth/userAuth";
import { Restaurant } from "../models/restaurantModel";
import { UniqueConstraintError, ValidationError, Op } from "sequelize";
import createHttpError from "http-errors";
import { Beach, IBeach } from "../models/beachModel";
import { IProduct, Product } from "../models/productModel";

// Declaration merging
declare module "fastify" {
	export interface FastifyInstance {
		db: Db;
	}
}

export default function (server: FastifyInstance,  options: FastifyRegisterOptions<unknown>, done: () => void) {
    server.post<{Body: {restaurantId: number, name: string, imageUrl: string}}>("", {
        preHandler: isAdmin,
        handler: async (request, reply) => {
            const restaurant = await Restaurant.findByPk(request.body.restaurantId);
            if ( !restaurant )
                return reply.code(404).send(createHttpError(404, "Restaurant could not be found"));

            const product = new Product({
                name: request.body.name,
                imageUrl: request.body.imageUrl,
                restaurantId: restaurant.id
            });

            return reply.code(201).send(await product.save());
        }
    });
       
    server.get("/", {
        preHandler: isAdmin,
        handler: async (request, reply) => {
            const products = await Product.findAll({
                attributes: ["id", "imageUrl", "name"],
                include: [{
                    model: Restaurant,
                    attributes: ["id"],
                    as: "restaurant",
                },
                {
                    model: Beach, 
                    attributes: ["id"],
                    through: {
                        attributes: ["price"]
                    }
                }
                ]});
            reply.code(200).send(products);
        },
    });

    server.delete<{Params: {id: number}}>("/:id", {
        preHandler: isAdmin,
        handler: async (request, reply) => {
            const product = await Product.findByPk(request.params.id);
            if ( !product )
                return reply.code(404).send(createHttpError(404, "Product not found"));
            await product.destroy();
            return reply.code(200).send();
        }
    });


    server.get<{Params: {id: number}}>("/:id", {
        preHandler: verifyAndFetchAllUser,
        handler: async (request, reply) => {
            const user = request.user as User;
            const product = await Product.findByPk(request.params.id);
            if ( !product )
                return reply.code(404).send(createHttpError(404, "Product not found"));

            if ( !await product.hasAccess(user) )
                return reply.code(403).send(createHttpError(403));

            product.$get("restaurant", { attributes: Restaurant.fullAttributes }),
            product.$get("beaches", { attributes: Beach.fullAttributes});

            return reply.code(200).send(product);
        }});
    

    server.put<{Params: {id: number}, Body: IProduct}>("/:id", {
        preHandler: isAdmin,
        handler: async (request, reply) => {
            const product = await Product.findByPk(request.params.id);
            if ( !product )
                return reply.code(404).send(createHttpError(404, "Product not found"));
            
            if ( !Product.isValid(request.body) )
                return reply.code(400).send(createHttpError(400, "Product is missing fields"));
            
            Object.assign(product, request.body);

            try {
                return reply.code(200).send(await product.save());
            }
            catch(e) {
                server.log.error(e);
                return reply.code(500).send(createHttpError(500));
            }
        }
    });

    server.patch<{Params: {id: number}, Body: IProduct}>("/:id", {
        preHandler: verifyAndFetchAllUser,
        handler: async (request, reply) => {
            const user = request.user as User;
            const product = await Product.findByPk(request.params.id);
            if ( !product )
                return reply.code(404).send(createHttpError(404, "Product not found"));

            if (!product.hasAccess(user))
                return reply.code(403).send(createHttpError(403));
            
            if ( request.body.name )
                product.name = request.body.name;
            if ( request.body.imageUrl)
                product.imageUrl = request.body.imageUrl;

            try {
                return reply.code(200).send(await product.save());
            }
            catch(e) {
                server.log.error(e);
                return reply.code(500).send(createHttpError(500));
            }
        }
    });

    server.get<{Params: {name: string}}>("/search/:name", {
        preHandler: isAdmin,
        handler: async ( request, reply ) => {
            return reply.code(200).send(await Product.findAll({
                where:{
                    name: {
                        [Op.iLike]: "%" + request.params.name + "%"
                    }
                }, 
            }));
        }
    });


    done();
}

