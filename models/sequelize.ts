import { FastifyInstance } from "fastify";
import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { ConnectionError, HostNotReachableError, Sequelize } from "sequelize";
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
    let connected = false;
    while ( !connected )
    {
        try
        {
            const sequelize = new Sequelize(process.env["DB_NAME"]!, process.env["DB_USER"]!, process.env["DB_PASSWORD"]!, {
                host: process.env["DB_HOST"],
                dialect: process.env["DB_DIALECT"] as Dialect,
                logging: (sql) => fastify.log.debug(sql)
            });  

            await sequelize.authenticate();

            fastify.log.info("Connected successfully !");
            connected = true;

            const models: Models = { UserModel, RestaurantModel };
            models.UserModel.onInit(sequelize);
            models.RestaurantModel.onInit(sequelize);
            await models.UserModel.associate();
            await models.RestaurantModel.associate();
            await sequelize.sync();
              
            fastify.decorate("db", { models });
        }
        catch(e)
        {
            if ( e instanceof ConnectionError)
                fastify.log.error("Unable to connect to DB, retrying.. : " + e.message);
            else throw e;
        }
    }
};

export default fp(ConnectDB);