import { AllowNull, AutoIncrement, BelongsTo, BelongsToMany, Column, ForeignKey, Model, PrimaryKey, Unique } from "sequelize-typescript";
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
        await user.reload();
        const id = (await this.$get("restaurant"))?.id.toString();

        if ((await user.$get("restaurantOwner", { where: { id }})))
            return true;
        if ((await user.$get("restaurantEmployee", { where: { id }})) )
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
