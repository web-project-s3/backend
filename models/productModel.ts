import { AllowNull, AutoIncrement, BelongsTo, BelongsToMany, Column, ForeignKey, HasMany, HasOne, Model, PrimaryKey, Sequelize, Unique } from "sequelize-typescript";
import { DataTypes } from "sequelize";
import { Table } from "sequelize-typescript";
import { Beach } from "./beachModel";
import { User } from "./userModel";
import { BeachRestaurant } from "./beach_restaurantModel";
import { Restaurant } from "./restaurantModel";

@Table
export class Product extends Model {

    @PrimaryKey
    @AutoIncrement
    @Column
    declare id: number;

    @AllowNull(false)
    @Column
    declare name: string;

    @Unique
    @Column
    declare imageUrl: string;

    @ForeignKey(() => Restaurant)
    @Column
    declare restaurantId: number;

    @BelongsTo(() => Restaurant)
    declare restaurant: Restaurant;

    static fullAttributes: ["id", "name", "imageUrl"];
}

export interface IProduct {
    name: string;
    imageUrl: string;
}
