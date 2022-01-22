import { DataTypes, FindAttributeOptions, Includeable } from "sequelize";
import { Sequelize, Model, Table, Column, AllowNull, Unique, PrimaryKey, AutoIncrement, BelongsTo, ForeignKey } from "sequelize-typescript";
import { Beach } from "./beachModel";
import { Restaurant } from "./restaurantModel";
import { FastifyReply } from "fastify";
import createHttpError from "http-errors";

@Table
export class User extends Model {

    @PrimaryKey
    @AutoIncrement
    @Column
    declare id: number;

    @AllowNull(false)
    @Column
    declare firstname: string;

    @AllowNull(false)
    @Column
    declare lastname: string;

    @AllowNull(false)
    @Unique
    @Column
    declare email: string;

    @AllowNull(false)
    @Column
    declare password: string;

    @AllowNull(false)
    @Unique
    @Column
    declare refreshToken: string;

    @AllowNull(false)
    @Column
    declare isAdmin: boolean;

    @ForeignKey(() => Restaurant)
    @Column
    declare restaurantOwnerId: number;

    @ForeignKey(() => Restaurant)
    @Column
    declare restaurantEmployeeId: number;

    @ForeignKey(() => Beach)
    @Column
    declare beachOwnerId: number;

    @ForeignKey(() => Beach)
    declare beachEmployeeId: number;

    @BelongsTo(() => Restaurant, "restaurantOwnerId")
    declare restaurantOwner: Restaurant;

    @BelongsTo(() => Restaurant, "restaurantEmployeeId")
    declare restaurantEmployee: Restaurant;

    @BelongsTo(() => Beach, "beachOwnerId")
    declare beachOwner: Beach;

    @BelongsTo(() => Beach, "beachEmployeeId")
    declare beachEmployee: Beach;

    static async findByEmail(email: string, include?: Includeable[], attributes?: FindAttributeOptions) {
        return await User.findOne({where: { email }, include, attributes} );
    }
    static safeUserAttributes = ["id", "firstname", "lastname", "email", "isAdmin"];

    async isOwner() {
        if ( await this.$get("restaurantOwner") || await this.$get("beachOwner"))
            return true;
        return false;
    }

    async ownsRestaurant(id: number, reply?: FastifyReply) : Promise<Restaurant | null>{
        let restaurant;
        if ( !this.restaurantOwner )
            restaurant = await this.$get("restaurantOwner");
        else restaurant = this.restaurantOwner;

        if ( !restaurant || restaurant.id !== id )
            if ( reply )
                return reply.code(403).send(createHttpError(403, "This is not your restaurant"));
            else return null;
        return restaurant;
    }

    async ownsBeach(id: number, reply?: FastifyReply) : Promise<Beach | null>{
        const beach = await this.$get("beachOwner");
        if ( !beach )
            if ( reply )
                return reply.code(404).send(createHttpError(404, `User ${id} doesn't own any beaches`));
            else return null;
        if ( beach.id !== id )
            if ( reply )
                return reply.code(403).send(createHttpError(403, "This is not your beach"));
            else return null;
        return beach;
    }

}

export interface IUser {
    firstname: string;
    lastname: string;
    email: string;
    password: string;
    refreshToken: string | undefined;
}

export interface IUserAccessToken {
    id: number;
}

export interface IUserRefreshToken {
    email: string;
    password: string;
}
