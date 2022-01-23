import { AllowNull, Column, ForeignKey, HasMany, Model, Table } from "sequelize-typescript";
import { Beach } from "./beachModel";
import { Product } from "./productModel";

@Table
export class BeachProduct extends Model {

    @ForeignKey(() => Beach)
    @Column
    declare beachId: number;

    @ForeignKey(() => Product)
    @Column
    declare productId: number;

    @AllowNull(false)
    @Column
    declare price: number;

    @HasMany(() => Beach, "beachId")
    declare beaches: Beach[];

    @HasMany(() => Product, "productId")
    declare products: Product[];
}