import { AllowNull, AutoIncrement, BelongsToMany, Column, HasMany, HasOne, Model, PrimaryKey, Sequelize, Table, Unique } from "sequelize-typescript";
import { DataTypes } from "sequelize";
import { Restaurant } from "./restaurantModel";
import { User } from "./userModel";
import { BeachRestaurantProduct } from "./beach_restaurant_product";
import { Product } from "./productModel";

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

    @HasMany(() => User, "beachEmployeeId")
    declare employees: User[];

    @BelongsToMany(() => Restaurant, () => BeachRestaurantProduct)
    declare restaurants: Array<Restaurant & {BeachRestaurantProduct: BeachRestaurantProduct}>;

    @BelongsToMany(() => Product, () => BeachRestaurantProduct)
    declare products: Array<Product & {BeachRestaurantProduct: BeachRestaurantProduct}>;


    static isValid(restaurant: Beach | IBeach) {
        return restaurant.name && restaurant.code;
    }

    static fullAttributes: ["id", "name", "code"];
}

export interface IBeach {
    name: string;
    code: string
}
