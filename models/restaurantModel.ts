import { DataTypes, Model, Sequelize } from "sequelize";
import { UserModel } from "./userModel";

export class RestaurantModel extends Model {
    declare id: number;
    declare name: string;
    declare code: string;

    static onInit(sequelize: Sequelize){
        RestaurantModel.init(initObject, { sequelize, modelName: "Restaurant" });
    }
    static associate(){
        RestaurantModel.hasOne(UserModel, { as: "Owner" });
        RestaurantModel.hasMany(UserModel, { as: "Employee" });    
    }
    static isValid(restaurant: Restaurant | RestaurantModel) {
        return restaurant.code && restaurant.name;
    }
}

export class Restaurant {
    declare name: string;
    declare code: string;
}

export const initObject = {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    }
};