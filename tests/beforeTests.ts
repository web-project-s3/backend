import dotenv from "dotenv";
dotenv.config();
process.env["DB_NAME"] = "test";

import { server } from "./setup";

export default async () => {
    await server;
    // await server.db.models.User.sync({ force:true });
    // await server.db.models.Restaurant.sync({ force:true });
    // await server.db.models.Beach.sync({ force:true });
    // await server.db.models.Product.sync({ force:true });
    // await server.db.models.BeachRestaurant.sync({ force:true });
    // await server.db.models.BeachProduct.sync({ force:true });

    const response = await server.inject({
        method: "POST",
        url: "users/register",
        payload: {
            email: "test@test.com",
            firstname: "Simon",
            lastname: "LUCIDO", 
            password: "password"
        }
    });

    server.log.debug(response.statusCode.toString());
    server.log.debug(response.body);

    const user = await server.db.models.User.findByPk("1");
    user.isAdmin = true;
    await user.save();
};