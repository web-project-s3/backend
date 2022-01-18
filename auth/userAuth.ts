import { FastifyReply, FastifyRequest } from "fastify";
import createHttpError from "http-errors";
import jwt from "jsonwebtoken";
import { IUserAccessToken, IUserRefreshToken, User } from "../models/userModel";

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
        return reply.status(403).send(createHttpError(403));
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

export async function generateAccessToken(payload: IUserAccessToken) {
    return jwt.sign(payload, access, { expiresIn: "24h" });
}

export async function generateRefreshToken(payload: IUserRefreshToken) {
    return jwt.sign(payload, refresh);
}