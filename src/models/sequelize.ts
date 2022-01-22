import { FastifyInstance } from "fastify";
import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { Sequelize } from "sequelize-typescript";
import { ConnectionError } from "sequelize";
import { Dialect } from "sequelize/types";

import { User } from "./userModel";
import { Restaurant } from "./restaurantModel";
import { Beach } from "./beachModel";
import { Product } from "./productModel";
import { BeachRestaurant } from "./beach_restaurantModel";
import { BeachProduct } from "./beach_productsModel";

export interface Models {
	User: any;
    Restaurant: any;
    Beach: any;
    Product: any;
    BeachProduct: any;
    BeachRestaurant: any;
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

            const models: Models = { User, Restaurant, Beach, Product, BeachProduct, BeachRestaurant };
            sequelize.addModels([User, Restaurant, Beach, Product, BeachProduct, BeachRestaurant]);
            await sequelize.sync();
              
            fastify.decorate("db", { models });

            fastify.addHook("onClose", async () => await sequelize.close());
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