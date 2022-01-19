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

    @BelongsTo(() => Restaurant, "restaurantOwnerId")
    declare restaurantOwner: Restaurant;

    @BelongsTo(() => Restaurant, "restaurantEmployeeId")
    declare restaurantEmployee: Restaurant;

    @BelongsTo(() => Beach)
    declare beachOwner: Beach;

    static onInit(sequelize: Sequelize){
        User.init(initObject, { sequelize, modelName: "Users" });
    }
    static associate() {
        User.belongsTo(Restaurant, { as: "RestaurantOwner" });
        User.belongsTo(Beach, { as: "BeachOwner" });
        User.belongsTo(Restaurant, { as: "Employee" });
    }
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
        const restaurant = await this.$get("restaurantOwner");
        if ( !restaurant )
            if ( reply )
                return reply.code(404).send(createHttpError(404, `User ${id} doesn't own any restaurant`));
            else return null;
        if ( restaurant.id !== id )
            if ( reply )
                return reply.code(403).send(createHttpError(403, "This is not your restaurant"));
            else return null;
        return restaurant;
    }

    async ownsBeach(id: number) : Promise<Beach | null>{
        const beach = await this.$get("beachOwner");
        if ( !beach || beach.id != id )
            return null;
        else return beach;
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

const initObject = {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    firstname: {
        type: DataTypes.STRING,
        allowNull: false
    },
    lastname: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    refreshToken: {
        type: DataTypes.STRING,
        allowNull: false
    },
    isAdmin: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
};