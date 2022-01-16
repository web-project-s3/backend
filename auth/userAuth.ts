import { FastifyReply, FastifyRequest } from "fastify";
import httpErrors from "http-errors";
import jwt from "jsonwebtoken";

export const refresh = process.env["REFRESH_TOKEN"]!;
export const access = process.env["ACCESS_TOKEN"]!;
if ( !refresh || !access )
{
    console.error("Can't load JWT Secrets");
    process.exit(1);
}

export function preHandler(req: FastifyRequest, res: FastifyReply, next: Function) {
    next();
}

export async function globalAdminAuth(req: FastifyRequest, res: FastifyReply, next: Function) {

    try 
    {
        console.log(await req.server.jwt.verify(access));
        console.log(req.user);
    } 
    catch (err) 
    {
        res.send(err);
    }
    console.log(req.user);
    next();
}

export async function generateAccessToken(payload: any) {
    return jwt.sign(payload, access, { expiresIn: "2m" });
}