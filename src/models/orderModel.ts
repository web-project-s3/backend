import { AllowNull, AutoIncrement, BeforeUpdate, BelongsTo, BelongsToMany, Column, Default, ForeignKey, Model, PrimaryKey, Table } from "sequelize-typescript";
import { Beach } from "./beachModel";
import { Product } from "./productModel";
import { ProductOrder } from "./product_orderModel";
import { User } from "./userModel";

@Table
export class Order extends Model {

    @PrimaryKey
    @AutoIncrement
    @Column
    declare id: number;

    @Column
    declare note: string;

    @Default(true)
    @Column
    declare active: boolean;

    @AllowNull(false)
    @ForeignKey(() => User)
    @Column
    declare userId: number;

    @AllowNull(false)
    @ForeignKey(() => Beach)
    @Column
    declare beachId: number;

    @BelongsTo(() => Beach)
    declare beach: Beach;

    @BelongsTo(() => User)
    declare user: User;

    @BelongsToMany(() => Product, () => ProductOrder)
    declare contains: Array<Product & {ProductOrder: ProductOrder}>;

}