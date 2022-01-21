import { AllowNull, AutoIncrement, BelongsTo, BelongsToMany, Column, ForeignKey, HasMany, HasOne, Model, PrimaryKey, Sequelize, Unique } from "sequelize-typescript";
import { DataTypes } from "sequelize";
import { Table } from "sequelize-typescript";
import { Beach } from "./beachModel";
import { User } from "./userModel";
import { BeachProduct } from "./beach_productsModel";
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

    @AllowNull(false)
    @ForeignKey(() => Restaurant)
    @Column
    declare restaurantId: number;

    @BelongsTo(() => Restaurant)
    declare restaurant: Restaurant;

    @BelongsToMany(() => Beach, () => BeachProduct)
    declare beaches: Array<Beach & {BeachProduct: BeachProduct}>;

    static fullAttributes: ["id", "name", "imageUrl"];

    static isValid(product: IProduct) {
        return product.imageUrl && product.name;
    }

    async hasAccess(user: User) {
        if ( user.isAdmin )
            return true;
        
        const restaurant = await this.$get("restaurant");

        if ((await user.$get("restaurantOwner", { where: { id: restaurant?.id }})) )
            return true;
        if ((await user.$get("restaurantEmployee", { where: { id: restaurant?.id }})) )
            return true;
        
        const beaches = await this.$get("beaches") as Beach[];
        const beachesId = beaches.map((beach) => beach.id);
        if ((await user.$get("beachOwner", { where: {id: beachesId}})))
            return true;
        if ((await user.$get("beachEmployee", { where: {id: beachesId}})))
            return true;
        
        return false;
    }
}

export interface IProduct {
    name: string;
    imageUrl: string;
}
