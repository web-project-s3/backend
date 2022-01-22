import { Beach } from "../../src/models/beachModel";
import { Product } from "../../src/models/productModel";
import { Restaurant } from "../../src/models/restaurantModel";
import { User } from "../../src/models/userModel";
import { server, buildAdminHeader, buildUserHeader } from "../setup";

describe("Restaurants endpoints test :", () => {
    
    let randomNotAdminUser: User;
    let notAdminHeader: { authorization: string };
    let userOne: User;
    let userTwo: User;
    let restaurantOne: Restaurant;

    beforeAll(async () => {
        await server;

        userOne = User.build({
            firstname: "product1",
            lastname: "product1",
            email: "product1@test.com",
            password: "product1",
            refreshToken: "product1",
            isAdmin: false
        });

        userTwo = User.build({
            firstname: "product2",
            lastname: "product2",
            email: "product2@test.com",
            password: "product2",
            refreshToken: "product2",
            isAdmin: false
        });

        restaurantOne = Restaurant.build({
            name: "product1",
            code: "product1"
        });

        
        randomNotAdminUser = User.build({
            firstname: "randomProduct",
            lastname: "randomProduct",
            email: "randomProduct@test.com",
            password: "randomProduct",
            refreshToken: "randomProduct",
            isAdmin: false
        });

        userOne = await userOne.save();
        userTwo = await userTwo.save();
        restaurantOne = await restaurantOne.save();
        
        restaurantOne.$set("owner", userOne);
            
        randomNotAdminUser = await randomNotAdminUser.save();
        notAdminHeader = await buildUserHeader(randomNotAdminUser);
    });

    describe("CRUDR endpoints :", () => {
        // Endpoint in restaurantController
        test("Creating product", async () => {
            const adminHeader = await buildAdminHeader();

            const productOne = await server.inject({
                method: "POST",
                url: "restaurants/" + restaurantOne.id + "/product",
                headers: adminHeader,
                payload: {
                    name: "product1",
                    imageUrl: "product1"
                }
            });

            const productTwo = await server.inject({
                method: "POST",
                url: "restaurants/" + restaurantOne.id + "/product",
                headers: await buildUserHeader(userOne),
                payload: {
                    name: "product2",
                    imageUrl: "product2"
                }
            });
            
            const conflict = await server.inject({
                method: "POST",
                url: "restaurants/" + restaurantOne.id + "/product",
                headers: adminHeader,
                payload: {
                    name: "product3",
                    imageUrl: "product1"
                }
            });

            const notFound = await server.inject({
                method: "POST",
                url: "restaurants/0/product",
                headers: adminHeader,
                payload: {
                    name: "notfound",
                    imageUrl: "notfound"
                }
            });

            const forbidden = await server.inject({
                method: "POST",
                url: "restaurants/" + restaurantOne.id + "/product",
                headers: notAdminHeader,
                payload: {
                    name: "forbidden",
                    imageUrl: "forbidden"
                }
            });

            expect(productOne.statusCode.toString()).toBe("201");
            expect(JSON.parse(productOne.body).id).not.toBeNull;
            expect(productTwo.statusCode.toString()).toBe("201");
            expect(JSON.parse(productTwo.body).id).not.toBeNull;

            expect(conflict.statusCode.toString()).toBe("409");
            expect(notFound.statusCode.toString()).toBe("404");
            expect(forbidden.statusCode.toString()).toBe("403");
        });

        // Endpoint in restaurantController
        test("Getting all products of restaurant", async () => {
            const adminHeader = await buildAdminHeader();

            const admin = await server.inject({
                method: "GET",
                url: "restaurants/" + restaurantOne.id + "/product",
                headers: adminHeader
            });

            const allowed = await server.inject({
                method: "GET",
                url: "restaurants/" + restaurantOne.id + "/product",
                headers: await buildUserHeader(userOne)
            });

            const notFound = await server.inject({
                method: "GET",
                url: "restaurants/0/product",
                headers: adminHeader
            });

            const forbidden = await server.inject({
                method: "GET",
                url: "restaurants/" + restaurantOne.id + "/product",
                headers: notAdminHeader
            });

            expect(admin.statusCode.toString()).toBe("200");
            expect(allowed.statusCode.toString()).toBe("200");
            expect(JSON.parse(allowed.body).id).toEqual(JSON.parse(admin.body).id);

            expect(notFound.statusCode.toString()).toBe("404");
            expect(forbidden.statusCode.toString()).toBe("403");
        });

        test("Getting all products", async () => {
            const adminHeader = await buildAdminHeader();

            const admin = await server.inject({
                method: "GET",
                url: "/products",
                headers: adminHeader
            });

            const forbidden = await server.inject({
                method: "GET",
                url: "/products",
                headers: notAdminHeader
            });

            const products: Product[] = JSON.parse(admin.body);

            expect(admin.statusCode.toString()).toBe("200");
            expect(products.length).toBeGreaterThanOrEqual(2);

            expect(forbidden.statusCode.toString()).toBe("403");
        });

        test("Deleting a product", async () => {
            const adminHeader = await buildAdminHeader();
            const productToDelete = await Product.create({
                name: "toDelete",
                imageUrl: "toDelete",
                restaurantId: restaurantOne.id
            });


            const forbidden = await server.inject({
                method: "GET",
                url: "/products/" + productToDelete.id,
                headers: notAdminHeader
            });

            const admin = await server.inject({
                method: "DELETE",
                url: "/products/" + productToDelete.id,
                headers: adminHeader
            });

            expect(admin.statusCode.toString()).toBe("204");
            expect(forbidden.statusCode.toString()).toBe("403"); 
            await expect(productToDelete.reload()).rejects.toThrow();
        });

        test("Getting a product", async () => {
            const adminHeader = await buildAdminHeader();
            const productOne = await Product.findOne();

            if ( !productOne )
                fail("Product not found not found");

            const productOneFromOwner = await server.inject({
                method: "GET",
                url: "products/" + productOne.id,
                headers: await buildUserHeader(userOne)
            });

            const productOneFromAdmin = await server.inject({
                method: "GET",
                url: "products/" + productOne.id,
                headers: adminHeader
            });

            const forbidden = await server.inject({
                method: "GET",
                url: "products/" + productOne.id,
                headers: await buildUserHeader(randomNotAdminUser)
            });

            const notFound = await server.inject({
                method: "GET",
                url: "products/0",
                headers: adminHeader
            });
            
            expect(productOneFromOwner.statusCode.toString()).toBe("200");
            expect(JSON.parse(productOneFromOwner.body).name).toBe(productOne.name);

            expect(productOneFromAdmin.statusCode.toString()).toBe("200");
            expect(JSON.parse(productOneFromAdmin.body).name).toBe(productOne.name);
            
            expect(forbidden.statusCode.toString()).toBe("403");

            expect(notFound.statusCode.toString()).toBe("404");
        });

        test("Replacing a product", async () => {
            const adminHeader = await buildAdminHeader();
            const productOne = await Product.findOne({ where: { name: "product1"}});
            const productTwo = await Product.findOne({ where: { name: "product2"}});

            if ( !productOne || !productTwo )
                fail("Product one or two not found");

            const admin = await server.inject({
                method: "PUT",
                url: "products/" + productOne.id,
                headers: adminHeader,
                payload: {
                    name: "product1new",
                    imageUrl: "product1"
                }
            });

            const missingFields = await server.inject({
                method: "PUT",
                url: "products/" + productOne.id,
                headers: adminHeader,
                payload: {
                    name: "product1new",
                }
            });

            const conflict = await server.inject({
                method: "PUT",
                url: "products/" + productOne.id,
                headers: adminHeader,
                payload: {
                    name: "product3",
                    imageUrl: productTwo.imageUrl
                }
            });

            const notFound = await server.inject({
                method: "PUT",
                url: "products/0",
                headers: adminHeader,
                payload: {
                    name: "notfound",
                    imageUrl: "notfound"
                }
            });

            const forbidden = await server.inject({
                method: "PUT",
                url: "products/" + productOne.id,
                headers: notAdminHeader,
                payload: {
                    name: "forbidden",
                    imageUrl: "forbidden"
                }
            });
        
            expect(admin.statusCode.toString()).toBe("200");
            expect(JSON.parse(admin.body).name).toBe("product1new");

            expect(missingFields.statusCode.toString()).toBe("400");
            expect(conflict.statusCode.toString()).toBe("409");
            expect(forbidden.statusCode.toString()).toBe("403");
            expect(notFound.statusCode.toString()).toBe("404");
        });

        test("Updating a product", async () => {
            const adminHeader = await buildAdminHeader();
            const productOne = await Product.findOne({ where: { imageUrl: "product1"}});
            const productTwo = await Product.findOne({ where: { name: "product2"}});

            if ( !productOne || !productTwo )
                fail("Product one or two not found");

            const admin = await server.inject({
                method: "PATCH",
                url: "products/" + productOne.id,
                headers: adminHeader,
                payload: {
                    name: "product1new",
                }
            });

            const owner = await server.inject({
                method: "PATCH",
                url: "products/" + productTwo.id,
                headers: await buildUserHeader(userOne),
                payload: {
                    imageUrl: "product2new"
                }
            });
            
            const conflict = await server.inject({
                method: "PATCH",
                url: "products/" + productOne.id,
                headers: adminHeader,
                payload: {
                    name: "product3",
                    imageUrl: "product2new"
                }
            });

            const notFound = await server.inject({
                method: "PATCH",
                url: "products/0",
                headers: adminHeader,
                payload: {
                    name: "notfound",
                    imageUrl: "notfound"
                }
            });

            const forbidden = await server.inject({
                method: "PATCH",
                url: "products/" + productOne.id,
                headers: notAdminHeader,
                payload: {
                    name: "forbidden",
                    imageUrl: "forbidden"
                }
            });
        
            expect(admin.statusCode.toString()).toBe("200");
            expect(JSON.parse(admin.body).name).toBe("product1new");

            expect(owner.statusCode.toString()).toBe("200");
            expect(JSON.parse(owner.body).imageUrl).toBe("product2new");

            expect(conflict.statusCode.toString()).toBe("409");
            expect(forbidden.statusCode.toString()).toBe("403");
            expect(notFound.statusCode.toString()).toBe("404");
        });

        test("Searching product", async () => {
            const results = await server.inject({
                method: "GET",
                url: "products/search/rod",
                headers: await buildAdminHeader()
            });

            const noResult = await server.inject({
                method: "GET",
                url: "products/search/noresult",
                headers: await buildAdminHeader()
            });

            const products: Product[] = JSON.parse(results.body);
            const noResultArray: Product[] = JSON.parse(noResult.body);

            expect(results.statusCode.toString()).toEqual("200");
            expect(products.length).toBeGreaterThanOrEqual(2);

            expect(noResult.statusCode.toString()).toEqual("200");
            expect(noResultArray.length).toEqual(0);
        });
    });
});