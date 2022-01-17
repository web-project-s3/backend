import { FastifyInstance, FastifyRegisterOptions } from "fastify";
import { Db } from "../models/sequelize";
import { UserModel } from "../models/userModel";
import { isAdmin } from "../auth/userAuth";
import { RestaurantModel } from "../models/restaurantModel";
import { UniqueConstraintError } from "sequelize";

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
                    const user = await server.db.models.UserModel.findByEmail(request.body.ownerEmail);
                    if ( user )
                    {
                        if ( await user.getOwner() )
                            return reply.code(409).send("User is already an owner");

                        const restaurant = await server.db.models.RestaurantModel.create( 
                            {   name: request.body.restaurantName, 
                                code :  server.jwt.sign({restaurantName: request.body.restaurantName}).substr(-5,5) });

                        await restaurant.setOwner(user.id);
                        return reply.code(201).send(restaurant);
                    }
                    else return reply.code(400).send("Owner couldn't be found");
                }
                else return reply.code(400).send("Restaurant is invalid");
                
            }
            catch(e) {
                if ( e instanceof UniqueConstraintError )
                {
                    console.log(e);
                    return reply.code(409).send("Restaurant already exists");
                }
                else throw e;
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
                    attributes: ["id"],
                    as: "Owner"
                },
                {
                    model: UserModel,
                    attributes: ["id"],
                    as: "Employee"
                }
                ]
            });
            reply.code(200).send(restaurants);
        },
    });

    server.delete<{Params: {id: number}}>("/:id", {
        preHandler: isAdmin,
        handler: async (request, reply) => {
            const restaurant = await server.db.models.RestaurantModel.findByPk(request.params.id);
            if ( !restaurant )
                return reply.code(404).send("Restaurant not found");
            restaurant.setOwner(null);
            await restaurant.destroy();
            return reply.code(200).send();
        }
    });

    done();
}

