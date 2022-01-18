import { AllowNull, AutoIncrement, BelongsToMany, Column, HasOne, Model, PrimaryKey, Sequelize, Table, Unique } from "sequelize-typescript";
import { DataTypes } from "sequelize";
import { Restaurant } from "./restaurantModel";
import { User } from "./userModel";
import { BeachRestaurant } from "./beach_restaurantModel";

@Table
export class Beach extends Model {

    @PrimaryKey
    @AutoIncrement
    @Column
    declare id: number;

    @AllowNull(false)
    @Unique
    @Column
    declare code: string;

    @AllowNull(false)
    @Column
    declare name: string;

    @HasOne(() => User, "beachOwnerId")
    declare owner: User;

    @BelongsToMany(() => Restaurant, () => BeachRestaurant)
    declare restaurants: Array<Restaurant & {BookAuthor: BeachRestaurant}>;

    static onInit(sequelize: Sequelize){
        Beach.init(initObject, { sequelize, modelName: "Beach" });
    }
    static associate(){
        Beach.hasOne(User, { as: "BeachOwner" });
        Beach.belongsToMany(Restaurant, { through: "Restaurant_Beach" });
    }
    static isValid(restaurant: Beach | IBeach) {
        return restaurant.name && restaurant.code;
    }

    static fullAttributes: ["id", "name", "code"];
}

export interface IBeach {
    name: string;
    code: string
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