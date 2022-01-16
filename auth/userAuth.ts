import { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { UserAccessToken, UserRefreshToken } from "../models/userModel";

export const refresh = process.env["REFRESH_TOKEN"]!;
export const access = process.env["ACCESS_TOKEN"]!;
if ( !refresh || !access )
{
    console.error("Can't load JWT Secrets");
    process.exit(1);
}

export async function isAdmin(request: FastifyRequest, reply: FastifyReply) {
    await verifyUser(request, reply);
    const user = request.user as UserAccessToken;

    if ( !user.isAdmin )
        reply.status(403).send("Forbidden");
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

export async function generateAccessToken(payload: UserAccessToken) {
    return jwt.sign(payload, access, { expiresIn: "24h" });
}

export async function generateRefreshToken(payload: UserRefreshToken) {
    return jwt.sign(payload, refresh);
}