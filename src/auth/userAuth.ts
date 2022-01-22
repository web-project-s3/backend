import { FastifyReply, FastifyRequest } from "fastify";
import createHttpError from "http-errors";
import jwt from "jsonwebtoken";
import { Beach } from "../models/beachModel";
import { Restaurant } from "../models/restaurantModel";
import { IUser, IUserAccessToken, IUserRefreshToken, User } from "../models/userModel";

export const refresh = process.env["REFRESH_TOKEN"]!;
export const access = process.env["ACCESS_TOKEN"]!;

if ( !refresh || !access )
{
    console.error("Can't load JWT Secrets");
    process.exit(1);
}

export async function isAdmin(request: FastifyRequest, reply: FastifyReply) {
    await verifyUser(request, reply);

    const user = await User.findByPk((request.user as IUserAccessToken).id, {attributes: ["isAdmin"]});

    if ( !user?.isAdmin )
        return reply.code(403).send(createHttpError(403));
}

export async function verifyUser(request: FastifyRequest, reply: FastifyReply) {
    try 
    {
        await request.jwtVerify();
    }
    catch(e)
    {
        reply.send(e);
    }
}

export async function verifyAndFetchAllUser(request: FastifyRequest, reply: FastifyReply) {
    try
    {
        request.jwtVerify();
        const user = await User.findByPk((request.user as IUserAccessToken).id, { attributes: User.safeUserAttributes,
            include: [{
                model: Restaurant,
                as: "restaurantOwner",
                attributes: Restaurant.fullAttributes
            },
            {
                model: Restaurant,
                as: "restaurantEmployee",
                attributes: Restaurant.fullAttributes
            },
            {
                model: Beach,
                as: "beachOwner",
                attributes: Beach.fullAttributes
            },
            {
                model: Beach,
                as: "beachEmployee", 
                attributes: Beach.fullAttributes
            }
            ]});

        if ( !user )
            return reply.code(400).send("Access token invalid: doesn't match any user");

        request.user = user;
        //debugger;
        
    }
    catch(e)
    {
        reply.send(e);
    }
}


export async function generateAccessToken(payload: IUserAccessToken) {
    return jwt.sign(payload, access, { expiresIn: "24h" });
}
export async function generateRefreshToken(payload: IUserRefreshToken) {
    return jwt.sign(payload, refresh);
}
