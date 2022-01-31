import { FastifyInstance } from "fastify";
import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { Sequelize } from "sequelize-typescript";
import { ConnectionError, Error } from "sequelize";
import { Dialect } from "sequelize/types";

import { User } from "./userModel";
import { Restaurant } from "./restaurantModel";
import { Beach } from "./beachModel";
import { Product } from "./productModel";
import { BeachRestaurant } from "./beach_restaurantModel";
import { BeachProduct } from "./beach_productsModel";
import { Order } from "./orderModel";
import { ProductOrder } from "./product_orderModel";


export interface Models {
	User: any;
    Restaurant: any;
    Beach: any;
    Product: any;
    BeachProduct: any;
    BeachRestaurant: any;
    Order: any;
    ProductOrder: any;
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
            
            const models: Models = { User, Restaurant, Beach, Product, BeachProduct, BeachRestaurant, Order, ProductOrder };
            sequelize.addModels([User, Restaurant, Beach, Product, BeachProduct, BeachRestaurant, Order, ProductOrder]);
            //[User, Restaurant, Beach, Product, BeachProduct, BeachRestaurant, Order, ProductOrder].forEach(async test => await test.sync());
            await sequelize.sync();
            
            connected = true;
            fastify.decorate("db", { models });

            fastify.addHook("onClose", async () => await sequelize.close());
        }
        catch(e)
        {
            if ( e instanceof ConnectionError)
                fastify.log.error("Unable to connect to DB, retrying.. : " + e.message);
            else if ( e instanceof Error)
            {
                console.log(`${e.name} : ${e.message} : ${e.stack}`);
            }

            else (console.log(e));
        }
    }
};

export default fp(ConnectDB);