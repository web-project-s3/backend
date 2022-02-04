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
                logging: false//(sql) => fastify.log.debug(sql)
            });  

            await sequelize.authenticate();

            fastify.log.info("Connected successfully !");
            
            const models: Models = { User, Restaurant, Beach, Product, BeachProduct, BeachRestaurant, Order, ProductOrder };
            sequelize.addModels([User, Restaurant, Beach, Product, BeachProduct, BeachRestaurant, Order, ProductOrder]);
            await sequelize.sync();
            await sequelize.query(`
CREATE OR REPLACE FUNCTION checkOrderStillActive()
RETURNS TRIGGER 
LANGUAGE PLPGSQL
as $$

declare
    nb_active_product integer;
begin
    select count(1) from "Orders" o join "ProductOrders" po 
    on o.id = po."orderId"
    where po.sent = false
    into nb_active_product;

    IF nb_active_product = 0 THEN
        UPDATE "Orders"
        SET active = false
        where id = NEW.id;
    END IF;
    RETURN NULL;
END;
$$;
            `);

            await sequelize.query(
                `
drop trigger if exists onOrderUpdate on "Orders";
create TRIGGER onOrderUpdate
after update on "Orders"
FOR EACH ROW EXECUTE PROCEDURE checkOrderStillActive();
                `
            );
            
            await sequelize.query(`
CREATE OR REPLACE FUNCTION atLeastThreeCharactersInCodeRestaurant()
RETURNS TRIGGER 
LANGUAGE PLPGSQL
as $$

declare
code_length integer;
begin
    select LENGTH(code) from "Restaurants" r where r.id = new.id into code_length;

    IF code_length < 3 THEN
        RAISE EXCEPTION 'code has to be at least 3 characters';
    END IF;
    RETURN NEW;
END;
$$;
            `);

            await sequelize.query(`
CREATE OR REPLACE FUNCTION atLeastThreeCharactersInCodeBeach()
RETURNS TRIGGER 
LANGUAGE PLPGSQL
as $$

declare
    code_length integer;
begin
    select LENGTH(code) from "Beaches" b where b.id = new.id into code_length;

    IF code_length < 3 THEN
        RAISE EXCEPTION 'code has to be at least 3 characters';
    END IF;
    RETURN NEW;
END;
$$;
                        `);

            await sequelize.query(
                `
drop trigger if exists onRestaurantCreateOrUpdate on "Restaurants";
create TRIGGER onRestaurantCreateOrUpdate
before insert or update on "Restaurants"
FOR EACH ROW EXECUTE PROCEDURE atLeastThreeCharactersInCodeRestaurant();
                `
            );

            await sequelize.query(
                `
drop trigger if exists onBeachCreateOrUpdate on "Beaches";
create TRIGGER onBeachCreateOrUpdate
before insert or update on "Beaches"
FOR EACH ROW EXECUTE PROCEDURE atLeastThreeCharactersInCodeBeach();
                `
            );

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