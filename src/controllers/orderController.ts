import { FastifyInstance, FastifyRegisterOptions } from "fastify";
import createHttpError from "http-errors";
import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { verifyAndFetchAllUser } from "../auth/userAuth";
import { Beach } from "../models/beachModel";
import { Order } from "../models/orderModel";
import { Product } from "../models/productModel";
import { ProductOrder } from "../models/product_orderModel";
import { Restaurant } from "../models/restaurantModel";
import { Db } from "../models/sequelize";
import { User } from "../models/userModel";

// Declaration merging
declare module "fastify" {
	export interface FastifyInstance {
		db: Db;
	}
}

export default async function (server: FastifyInstance,  options: FastifyRegisterOptions<unknown>, done: () => void) {
    
    const orderNS = server.io.of("/orders");
    
    orderNS.on("connect", (socket) => {
        server.log.debug(`Connection de ${socket.id}`);
        socket.on("register", async (data: {accessToken: string, beachId: number | null, restaurantId: number | null }) => {
            try {
                const id = server.jwt.decode<{id: number}>(data.accessToken)?.id;
                if (id)
                {
                    const user = await User.findByPk(id);
                    if (user && ( data.beachId || data.restaurantId ))
                    {
                        if ( data.beachId && ( user.beachEmployeeId == data.beachId || user.beachOwnerId == data.beachId || user.isAdmin ))
                            return await onRoomJoinBeach(socket, data.beachId);
                        else if ( data.restaurantId && ( user.restaurantEmployeeId == data.restaurantId || user.restaurantOwnerId == data.restaurantId || user.isAdmin ))
                            return await onRoomJoinRestaurant(socket, data.restaurantId);
                    }

                }
                
                return socket.disconnect();
            }
            catch(error)
            {
                socket.disconnect();
            }
        });
    });

    async function onRoomJoinBeach(socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, id: number) {
        socket.join("beach:" + id);

        const orders = await getActiveForBeach(id);

        return socket.emit("activeOrders", orders);
    }

    async function getActiveForBeach(beachId: number) {

        return Order.findAll({ where: { "active": true, "beachId": beachId }, include: [
            {
                model: User,
                attributes: ["id", "firstname", "lastname"]
            },
            {
                model: Product,
                attributes: ["id", "name", "imageUrl", "restaurantId"],
                through: {
                    as: "details",
                    attributes: ["ready", "quantity", "sent"],
                },
                include: [{
                    model: Restaurant,
                    attributes: ["id", "name"]
                }]
            },
            {
                model: Beach,
                attributes: ["id", "name"]
            }
        ]});
    }

    async function onRoomJoinRestaurant(socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, id: number) {
        socket.join("restaurant:" + id);

        const orders = await getActiveForRestaurant(id);

        return socket.emit("activeOrders", orders);
    }

    async function getActiveForRestaurant(restaurantId: number) {

        const orders = await Order.findAll({ where: { "active": true }, include: [
            {
                model: User,
                attributes: ["id", "firstname", "lastname"]
            },
            {
                model: Product,
                attributes: ["id", "name", "imageUrl", "restaurantId"],
                where: {
                    "restaurantId": restaurantId,
                },
                through: {
                    as: "details",
                    attributes: ["ready", "quantity", "sent"],
                    where: { 
                        "sent": false
                    }
                }
            },
            {
                model: Beach,
                attributes: ["id", "name"]
            }
        ],
        });

        return orders.filter(order => order.contains.length > 0);
    }

    async function pushNewEvent(orderId: number, productId: number) {
        const order = await Order.findByPk(orderId);
        const product = await Product.findByPk(productId);

        if ( !order || !product ) return;

        orderNS.to("beach:" + order.beachId).emit("activeOrders", await getActiveForBeach(order.beachId));
        orderNS.to("restaurant:" + product.restaurantId).emit("activeOrders", await getActiveForRestaurant(product.restaurantId));
    }

    async function pushNewOrder(order: Order, products: Product[]) {
        orderNS.to("beach:" + order.beachId).emit("activeOrders", await getActiveForBeach(order.beachId));

        products.forEach(async product =>
            orderNS.to("restaurant:" + product.restaurantId).emit("activeOrders", await getActiveForRestaurant(product.restaurantId)));
    }

    async function pushRefreshedOrder(orderId: number) {
        const order = await Order.findByPk(orderId, {
            include: [{ model: Product }]
        });

        if ( order )
        {
            orderNS.to("beach:" + order.beachId).emit("activeOrders", await getActiveForBeach(order.beachId));
            order.contains.forEach(async product =>
                orderNS.to("restaurant:" + product.restaurantId).emit("activeOrders", await getActiveForRestaurant(product.restaurantId)));
        }
    }


    server.post<{Body: { products: { id: number, details: { quantity: number } }[], note: string | null | undefined }, Params: {id: number}}>("/beach/:id", {
        preHandler: verifyAndFetchAllUser,
        handler: async ( request, reply ) => {
            const user = request.user as User;
            if ( !user.isAdmin && await !user.canAccesBeach(request.params.id) )
                return reply.code(403).send(createHttpError(403));
            
            const beach = await Beach.findByPk(request.params.id);
            if ( !beach )
                return reply.code(404).send(createHttpError(404, "Beach could not be found"));
    
            const products = (await beach.$get("products", {attributes:["id", "restaurantId"]}))
                .filter((product) => {
                    return request.body.products.find(productBody => { 
                        return product.id === productBody.id;
                    });
                });

            const order = await Order.build({ beachId: beach.id, userId: user.id, active: true, note: request.body.note });
            console.log(products);
            await order.save();

            request.body.products.forEach(async product => {
                ProductOrder.create({ "orderId": order.id, "productId": product.id, "quantity": product.details.quantity, "ready": false });
            });

            pushNewOrder(order, products);

            return reply.code(201).send(order);
        }
    });

    server.post<{Params: { orderId: number, productId: number }}>("/:orderId/product/:productId", {
        preHandler: verifyAndFetchAllUser,
        handler: async (request, reply) => {
            const user = request.user as User;
            const productOrder = await ProductOrder.findOne({
                where: {
                    "productId": request.params.productId,
                    "orderId": request.params.orderId
                },
                include: [{
                    model: Product
                },
                {
                    model: Order
                }]
            });

            if ( !productOrder )
                return reply.code(404).send(createHttpError(404, "Not found"));

            if ( !user.isAdmin && ! await user.canAccesRestaurant(productOrder?.product.restaurantId))
                return reply.code(403).send(createHttpError(403));

            productOrder.ready = !productOrder.ready;
            await productOrder.save();

            pushNewEvent(request.params.orderId, request.params.productId);

            return reply.code(200).send(productOrder);
        }
    });

    server.post<{Params: { orderId: number, restaurantId: number}}>("/:orderId/restaurant/:restaurantId", {
        preHandler: verifyAndFetchAllUser,
        handler: async ( request, reply ) => {
            const user = request.user as User;

            if ( !user.isAdmin && ! await user.canAccesRestaurant(request.params.restaurantId ))
                return reply.code(403).send(createHttpError(403));

            const productOrders = await ProductOrder.findAll({
                where: {
                    "orderId": request.params.orderId,
                    "sent": false
                },
                include: [{
                    model: Product
                },
                {
                    model: Order
                }]
            });

            let allSent = true;

            productOrders.forEach(async productOrder => {
                if ( productOrder.product.restaurantId == request.params.restaurantId )
                {
                    productOrder.ready = true;
                    productOrder.sent = true;
                    await productOrder.save();
                }
                else allSent = allSent && productOrder.sent;
            });

            const order = productOrders[0].order;
            if ( allSent )
            {
                order.active = false;
                await order.save();
            }

            pushRefreshedOrder(order.id);
        }
    });

    server.post<{Params: {orderId: number}}>("/:orderId", {
        preHandler: verifyAndFetchAllUser,
        handler: async (request, reply) => {
            const user = request.user as User;
            const order = await Order.findByPk(request.params.orderId);
            if ( !order ) 
                return reply.code(404).send(createHttpError(404, "Order not found"));

            if ( !user.isAdmin && !user.canAccesBeach(order.beachId))
                return reply.code(403).send(createHttpError(403));

            order.active = false;
            await order.save();

            pushRefreshedOrder(order.id);

            reply.code(200).send(order);
        }
    });

    done();
}

