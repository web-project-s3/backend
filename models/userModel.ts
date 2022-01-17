import { DataTypes, FindAttributeOptions, Includeable, Model, Sequelize } from "sequelize";
import { RestaurantModel } from "./restaurantModel";

export class UserModel extends Model {
    declare id: number;
    declare firstname: string;
    declare lastname: string;
    declare email: string;
    declare password: string;
    declare refreshToken: string;
    declare isAdmin: boolean;

    static onInit(sequelize: Sequelize){
        UserModel.init(initObject, { sequelize, modelName: "Users" });
    }
    static associate() {
        UserModel.belongsTo(RestaurantModel, { as: "Owner" });
        UserModel.belongsTo(RestaurantModel, { as: "Employee" });
    }
    static async findByEmail(email: string, include?: Includeable[], attributes?: FindAttributeOptions) {
        return await UserModel.findOne({where: { email }, include, attributes} );
    }
    static safeUserAttributes = ["id", "firstname", "lastname", "email", "isAdmin"];
}

export class User {
    declare firstname: string;
    declare lastname: string;
    declare email: string;
    declare password: string;
    declare refreshToken: string | undefined;

}

export class UserAccessToken {
    declare id: number;
    declare isAdmin: boolean;
}

export class UserRefreshToken {
    declare email: string;
    declare password: string;
}

const initObject = {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    firstname: {
        type: DataTypes.STRING,
        allowNull: false
    },
    lastname: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    refreshToken: {
        type: DataTypes.STRING,
        allowNull: false
    },
    isAdmin: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
};