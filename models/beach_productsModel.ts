import { AllowNull, Column, ForeignKey, HasMany, Model, PrimaryKey, Table } from "sequelize-typescript";
import { Beach } from "./beachModel";
import { Product } from "./productModel";
import { Restaurant } from "./restaurantModel";

@Table
export class BeachProducts extends Model {
    @ForeignKey(() => Beach)
    @Column
    declare beachId: number;

    @ForeignKey(() => Product)
    @Column
    declare productId: number;

    @ForeignKey(() => Restaurant)
    @Column
    declare restaurantId: number;

    @AllowNull(false)
    @Column
    declare price: number;
}