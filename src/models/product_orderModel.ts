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

    @Default(1)
    @Column
    declare quantity: number;

    @HasOne(() => Order, "id")
    declare order: Order;

    @HasOne(() => Product, "id")
    declare product: Product;

}