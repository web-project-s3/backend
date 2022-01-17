import { FastifyInstance } from "fastify";
import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { Sequelize } from "sequelize";
import { Dialect } from "sequelize/types";

import { UserModel } from "./userModel";
import { RestaurantModel } from "./restaurantModel";

export interface Models {
	UserModel: any;
    RestaurantModel: any;
}

export interface Db {
	models: Models;
}

const ConnectDB: FastifyPluginAsync = async (
    fastify: FastifyInstance
) => {
    try {
        const sequelize = new Sequelize(process.env["DB_NAME"]!, process.env["DB_USER"]!, process.env["DB_PASSWORD"]!, {
            host: process.env["DB_HOST"],
            dialect: process.env["DB_DIALECT"] as Dialect
        });
      
        await sequelize.authenticate().then(() => {
            console.log("Connection established successfully.");
        }).catch((e) => {
            console.error("Unable to connect to the database", e);
        });

        const models: Models = { UserModel, RestaurantModel };
        models.UserModel.onInit(sequelize);
        models.RestaurantModel.onInit(sequelize);
        await models.UserModel.associate();
        await models.RestaurantModel.associate();
        await sequelize.sync();
      
        fastify.decorate("db", { models });
    } catch (error) {
        console.error(error);
    }
};

export default fp(ConnectDB);