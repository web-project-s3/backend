import { FastifyInstance, FastifyRegisterOptions } from "fastify";
import { Db } from "../models/sequelize";
import { User } from "../models/userModel";
import { isAdmin, verifyAndFetchAllUser } from "../auth/userAuth";
import { Restaurant } from "../models/restaurantModel";
import { Op, UniqueConstraintError } from "sequelize";
import createHttpError from "http-errors";
import { Beach } from "../models/beachModel";
import { IProduct, Product } from "../models/productModel";

// Declaration merging
declare module "fastify" {
	export interface FastifyInstance {
		db: Db;
	}
}

export default function (server: FastifyInstance,  options: FastifyRegisterOptions<unknown>, done: () => void) {

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
        preHandler: verifyAndFetchAllUser,
        handler: async (request, reply) => {
            const user = (request.user) as User;
            const product = await Product.findByPk(request.params.id);
            
            if ( !product )
                return reply.code(404).send(createHttpError(404, "Product not found"));

            if ( !user.isAdmin && !user.ownsRestaurant(product.restaurantId))
                return reply.code(403).send(createHttpError(403));

            await product.destroy();
            return reply.code(204).send();
        }
    });


    server.get<{Params: {id: number}}>("/:id", {
        preHandler: verifyAndFetchAllUser,
        handler: async (request, reply) => {
            const user = request.user as User;
            const product = await Product.findByPk(request.params.id, { include: [
                {
                    model: Restaurant,
                    attributes: Restaurant.fullAttributes
                },
                {
                    model: Beach,
                    through: {
                        as: "pricing",
                        attributes: ["price"]
                    }
                }
            ]});
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
                if ( e instanceof UniqueConstraintError)
                    return reply.code(409).send(createHttpError(409, "ImageURL is not unique"));
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

            if (!await product.hasAccess(user))
                return reply.code(403).send(createHttpError(403));
            
            if ( request.body.name )
                product.name = request.body.name;
            if ( request.body.imageUrl)
                product.imageUrl = request.body.imageUrl;

            try {
                return reply.code(200).send(await product.save());
            }
            catch(e) {
                if ( e instanceof UniqueConstraintError )
                    return reply.code(409).send(createHttpError(409, "ImageURL is not unique"));
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

