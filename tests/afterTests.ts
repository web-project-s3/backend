import dotenv from "dotenv";
dotenv.config();
process.env["DB_NAME"] = "test";

import { server } from "./setup";

export default async () => {
    server.log.debug("Shutting down..");
    await server.close();
    server.log.debug("Shut down done");
};
