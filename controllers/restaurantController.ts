import { FastifyInstance, FastifyRegisterOptions } from "fastify";
import fp from "fastify-plugin";
import { Db } from "../models/sequelize";
import { UserModel, User } from "../models/userModel";
import { isAdmin, refresh, generateAccessToken, generateRefreshToken, verifyUser } from "../auth/userAuth";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Restaurant, RestaurantModel } from "../models/restaurantModel";
import { send } from "process";

// Declaration merging
declare module "fastify" {
	export interface FastifyInstance {
		db: Db;
	}
}

export default function (server: FastifyInstance,  options: FastifyRegisterOptions<unknown>, done: () => void) {

    server.post<{Body: {restaurant: Restaurant, ownerEmail: string}}>("/", {
        preHandler: isAdmin,
        handler: async (request, reply) => {
            try {
                if ( RestaurantModel.isValid(request.body.restaurant) )
                {
                    const user = await server.db.models.UserModel.findByEmail(request.body.ownerEmail);
                    if ( user )
                    {
                        const restaurant = await server.db.models.RestaurantModel.create(request.body.restaurant);
                        restaurant.setOwner(user.id);
                        return reply.code(201).send(restaurant);
                    }
                    else return reply.code(400).send("Owner couldn't be found");
                }
                else return reply.code(400).send("Restaurant is invalid");
                
            }
            catch(e) {
                return e;
            }
        }
    });
    
    server.get("/", {
        preHandler: isAdmin,
        handler: async (request, reply) => {
            const restaurants = await RestaurantModel.findAll({
                attributes: ["id", "code", "name"],
                include: [{
                    model: UserModel,
                    attributes: ["id", "firstname", "lastname", "email"],
                    as: "Owner"
                },
                {
                    model: UserModel,
                    as: "Employees"
                }
                ]
            });
            reply.code(200).send(restaurants);
        },
    });
    
    done();
}

