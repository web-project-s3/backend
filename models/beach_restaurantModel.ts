import { Column, ForeignKey, Model, Table } from "sequelize-typescript";
import { Beach } from "./beachModel";
import { Restaurant } from "./restaurantModel";

@Table
export class BeachRestaurant extends Model {
    @ForeignKey(() => Beach)
    @Column
    declare beachId: number;

    @ForeignKey(() => Restaurant)
    @Column
    declare restaurantId: number;
}