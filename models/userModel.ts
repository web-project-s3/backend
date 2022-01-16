import { DataTypes, Model } from "sequelize";

export class UserModel extends Model {
    declare id: number | undefined;
    declare firstname: string;
    declare lastname: string;
    declare email: string;
    declare password: string;
    declare token: string;
}

export class User {
    declare id: number | undefined;
    declare firstname: string;
    declare lastname: string;
    declare email: string;
    declare password: string;
    declare refreshToken: string | undefined;
}

export const initObject = {
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
    }
};