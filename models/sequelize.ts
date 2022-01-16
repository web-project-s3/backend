import { FastifyInstance } from "fastify";
import { FastifyPluginAsync, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin";
import { UserModel, initObject } from "./userModel";
import { Sequelize, DataTypes } from "sequelize";
import { Dialect } from "sequelize/types";

export interface Models {
	UserModel: any;
}

export interface Db {
	models: Models;
}

const ConnectDB: FastifyPluginAsync = async (
    fastify: FastifyInstance,
    options: FastifyPluginOptions
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

        const models: Models = { UserModel };
        models.UserModel.init(initObject, { sequelize: sequelize });
        models.UserModel.sync();

        fastify.decorate("db", { models });
    } catch (error) {
        console.error(error);
    }
};

export default fp(ConnectDB);