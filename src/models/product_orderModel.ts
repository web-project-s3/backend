import { Column, Default, ForeignKey, HasOne, Model, Table } from "sequelize-typescript";
import { Order } from "./orderModel";
import { Product } from "./productModel";

@Table
export class ProductOrder extends Model {



    @ForeignKey(() => Order)
    @Column
    declare orderId: number;

    @ForeignKey(() => Product)
    @Column
    declare productId: number;

    @Default(false)
    @Column
    declare ready: boolean;

    @Default(false)
    @Column
    declare sent: boolean;

    @Default(1)
    @Column
    declare quantity: number;

    @HasOne(() => Product, { foreignKey:"id", sourceKey:"productId" })
    declare product: Product;

    @HasOne(() => Order, "id")
    declare order: Order;

}