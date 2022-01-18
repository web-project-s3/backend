import { FastifyInstance } from "fastify";
import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { Sequelize } from "sequelize-typescript";
import { ConnectionError } from "sequelize";
import { Dialect } from "sequelize/types";

import { User } from "./userModel";
import { Restaurant } from "./restaurantModel";
import { Beach } from "./beachModel";
import { BeachRestaurant } from "./beach_restaurantModel";

export interface Models {
	User: any;
    Restaurant: any;
    Beach: any;
    BeachRestaurant: any
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

            const models: Models = { User, Restaurant, Beach, BeachRestaurant };
            sequelize.addModels([User, Restaurant, Beach, BeachRestaurant]);
            // models.User.onInit(sequelize);
            // models.Restaurant.onInit(sequelize);
            // models.Beach.onInit(sequelize);
            // await models.User.associate();
            // await models.Restaurant.associate();
            // await models.Beach.associate();
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