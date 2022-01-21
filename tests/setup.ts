import { build } from "../index";
import { User } from "../src/models/userModel";
import { access } from "../src/auth/userAuth";
import jwt from "jsonwebtoken";

export const server = build();

export async function buildUserHeader(user: User){
    return { 
        authorization: "Bearer " + await jwt.sign({id: user.id}, access, { expiresIn: "10m" })
    };
}

export async function buildAdminHeader(){
    return { 
        authorization: "Bearer " + await jwt.sign({id: 1}, access, { expiresIn: "10m" })
    };
}