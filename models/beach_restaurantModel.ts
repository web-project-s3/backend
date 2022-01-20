import { AllowNull, Column, DataType, ForeignKey, Model, PrimaryKey, Table } from "sequelize-typescript";
import { Beach } from "./beachModel";
import { Product } from "./productModel";
import { Restaurant } from "./restaurantModel";

@Table
export class BeachRestaurant extends Model {
    @PrimaryKey
    @ForeignKey(() => Beach)
    @Column
    declare beachId: number;

    @PrimaryKey
    @ForeignKey(() => Restaurant)
    @Column
    declare restaurantId: number;
}