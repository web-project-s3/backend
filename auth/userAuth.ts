import { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";

export const refresh = process.env["REFRESH_TOKEN"]!;
export const access = process.env["ACCESS_TOKEN"]!;
if ( !refresh || !access )
{
    console.error("Can't load JWT Secrets");
    process.exit(1);
}

export function preHandler(req: FastifyRequest, res: FastifyReply, next: () => void) {
    next();
}

export async function globalAdminAuth(req: FastifyRequest, res: FastifyReply, next: () => void) {

    try 
    {
        console.log(await req.jwtVerify());
        console.log(req.user);
    } 
    catch (err) 
    {
        res.send(err);
    }
    console.log(req.user);
    next();
}

export async function generateAccessToken(payload: {id: number}) {
    return jwt.sign(payload, access, { expiresIn: "2m" });
}

export async function generateRefreshToken(payload: {email: string, password: string}) {
    return jwt.sign(payload, refresh);
}