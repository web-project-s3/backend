import { AllowNull, AutoIncrement, BelongsToMany, Column, ForeignKey, HasMany, HasOne, Model, PrimaryKey, Sequelize, Unique } from "sequelize-typescript";
import { DataTypes } from "sequelize";
import { Table } from "sequelize-typescript";
import { Beach } from "./beachModel";
import { User } from "./userModel";
import { BeachRestaurantProduct } from "./beach_restaurant_product";
import { Product } from "./productModel";

@Table
export class Restaurant extends Model {

    @PrimaryKey
    @AutoIncrement
    @Column
    declare id: number;

    @AllowNull(false)
    @Column
    declare name: string;

    @AllowNull(false)
    @Unique
    @Column
    declare code: string;

    @HasOne(() => User, "restaurantOwnerId")
    declare owner: User;

    @HasMany(() => User, "restaurantEmployeeId")
    declare employees: User[];

    @BelongsToMany(() => Beach, () => BeachRestaurantProduct)
    declare beaches: Array<Beach & {BeachRestaurantProduct: BeachRestaurantProduct}>;

    @BelongsToMany(() => Product, () => BeachRestaurantProduct)
    declare products: Array<Product & {BeachRestaurantProduct: BeachRestaurantProduct}>;

    static isValid(restaurant: IRestaurant | Restaurant) {
        return restaurant.code && restaurant.name;
    }

    static fullAttributes: ["id", "name", "code"];
}

export interface IRestaurant {
    name: string;
    code: string;
}

