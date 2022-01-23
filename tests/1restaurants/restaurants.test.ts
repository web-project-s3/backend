import { Beach } from "../../src/models/beachModel";
import { BeachProduct } from "../../src/models/beach_productsModel";
import { Product } from "../../src/models/productModel";
import { Restaurant } from "../../src/models/restaurantModel";
import { User } from "../../src/models/userModel";
import { server, buildAdminHeader, buildUserHeader } from "../setup";

describe("Restaurants endpoints test :", () => {
    
    let randomNotAdminUser: User;
    let notAdminHeader: { authorization: string };


    beforeAll(async () => {
        await server;

        const userOne = User.build({
            firstname: "restaurant1",
            lastname: "restaurant1",
            email: "restaurant1@test.com",
            password: "restaurant1",
            refreshToken: "whatever",
            isAdmin: false
        });

        const userTwo = User.build({
            firstname: "restaurant2",
            lastname: "restaurant2",
            email: "restaurant2@test.com",
            password: "restaurant2",
            refreshToken: "whatever2",
            isAdmin: false
        });

        const userThree = User.build({
            firstname: "restaurant3",
            lastname: "restaurant3",
            email: "restaurant3@test.com",
            password: "restaurant3",
            refreshToken: "whatever3",
            isAdmin: false
        });
        
        const randomUser = User.build({
            firstname: "random",
            lastname: "random",
            email: "random@test.com",
            password: "random",
            refreshToken: "random",
            isAdmin: false
        });

        await userOne.save();
        await userTwo.save();
        await userThree.save();
        await randomUser.save();
            
        randomNotAdminUser = await randomUser.save();
        notAdminHeader = await buildUserHeader(randomNotAdminUser);
    });

    describe("CRUDR endpoints :", () => {
        test("Creating restaurants", async () => {
            const adminHeader = await buildAdminHeader();

            const restaurantOne = await server.inject({
                method: "POST",
                url: "restaurants",
                headers: adminHeader,
                payload: {
                    ownerEmail: "restaurant1@test.com",
                    restaurantName: "restaurant1"
                }
            });

            const restaurantTwo = await server.inject({
                method: "POST",
                url: "restaurants",
                headers: adminHeader,
                payload: {
                    ownerEmail: "restaurant2@test.com",
                    restaurantName: "restaurant2"
                }
            });

            const restaurantConflict = await server.inject({
                method: "POST",
                url: "restaurants",
                headers: adminHeader,
                payload: {
                    ownerEmail: "restaurant1@test.com",
                    restaurantName: "restaurant1"
                }
            });

            const ownerNotFound = await server.inject({
                method: "POST",
                url: "restaurants/",
                headers: adminHeader,
                payload: {
                    ownerEmail: "dontexist@test.com",
                    restaurantName: "restaurant1"
                }
            });

            const restaurantThree = await server.inject({
                method: "POST",
                url: "restaurants/",
                headers: adminHeader,
                payload: {
                    ownerEmail: "restaurant3@test.com",
                    restaurantName: "restaurant3"
                }
            });

            const forbidden = await server.inject({
                method: "POST",
                url: "restaurants/",
                headers: notAdminHeader,
                payload: {
                    ownerEmail: "restaurant3@test.com",
                    restaurantName: "restaurant3"
                }
            });
            
            expect(restaurantOne.statusCode.toString()).toBe("201");
            expect(JSON.parse(restaurantOne.body).id).not.toBeNull;
            expect(restaurantTwo.statusCode.toString()).toBe("201");
            expect(JSON.parse(restaurantTwo.body).id).not.toBeNull;
            expect(restaurantThree.statusCode.toString()).toBe("201");
            expect(JSON.parse(restaurantThree.body).id).not.toBeNull;

            expect(restaurantConflict.statusCode.toString()).toBe("409");
            expect(ownerNotFound.statusCode.toString()).toBe("404");
            expect(forbidden.statusCode.toString()).toBe("403");
        });

        test("Getting all restaurants", async () => {
            const adminHeader = await buildAdminHeader();

            const allRestaurants = await server.inject({
                method: "GET",
                url: "restaurants",
                headers: adminHeader
            });

            const forbidden = await server.inject({
                method: "GET",
                url: "restaurants",
                headers: notAdminHeader
            });
            
            const restaurants: Restaurant[] = JSON.parse(allRestaurants.body);

            expect(allRestaurants.statusCode.toString()).toBe("200");
            expect(restaurants.length).toBeGreaterThanOrEqual(3);

            expect(forbidden.statusCode.toString()).toBe("403");
        });

        test("Getting a restaurant", async () => {
            const adminHeader = await buildAdminHeader();
            const restaurantOneOwner = await User.findOne({ where: { email: "restaurant1@test.com"}});
            if ( !restaurantOneOwner )
                fail("Couldn't find restaurant one owner");
            const restaurantOneOwnerHeader = await buildUserHeader(restaurantOneOwner);

            const restaurantOne = await Restaurant.findOne( { where: { name: "restaurant1"}});
            const restaurantTwo = await Restaurant.findOne( { where: { name: "restaurant2"}});

            const restaurantOneFromOwner = await server.inject({
                method: "GET",
                url: "restaurants/" + restaurantOne?.id,
                headers: restaurantOneOwnerHeader
            });

            const restaurantOneFromAdmin = await server.inject({
                method: "GET",
                url: "restaurants/" + restaurantOne?.id,
                headers: adminHeader
            });
            
            const forbidden = await server.inject({
                method: "GET",
                url: "restaurants/" + restaurantTwo?.id,
                headers: restaurantOneOwnerHeader
            });

            const notFound = await server.inject({
                method: "GET",
                url: "restaurants/0",
                headers: adminHeader
            });
            
            expect(restaurantOneFromOwner.statusCode.toString()).toBe("200");
            expect(JSON.parse(restaurantOneFromOwner.body).name).toBe("restaurant1");

            expect(restaurantOneFromAdmin.statusCode.toString()).toBe("200");
            expect(JSON.parse(restaurantOneFromAdmin.body).name).toBe("restaurant1");
            
            expect(forbidden.statusCode.toString()).toBe("403");

            expect(notFound.statusCode.toString()).toBe("404");
        });

        test("Replacing a restaurant", async () => {
            const adminHeader = await buildAdminHeader();
            const restaurantOne = await Restaurant.findOne( { where: { name: "restaurant1"}});
            const restaurantTwo = await Restaurant.findOne( { where: { name: "restaurant2"}});

            const responseRestaurantOne = await server.inject({
                method: "PUT",
                url: "restaurants/" + restaurantOne?.id,
                headers: adminHeader,
                payload: {
                    name: "restaurant1",
                    code: "modified1"
                }
            });

            const conflict = await server.inject({
                method: "PUT",
                url: "restaurants/" + restaurantTwo?.id,
                headers: adminHeader,
                payload: {
                    name: "restaurant2",
                    code: "modified1"
                }
            });

            const missingFields = await server.inject({
                method: "PUT",
                url: "restaurants/" + restaurantTwo?.id,
                headers: adminHeader,
                payload: {
                    name: "restaurant2",
                }
            });
        
            const forbidden = await server.inject({
                method: "PUT",
                url: "restaurants/" + restaurantTwo?.id,
                headers: notAdminHeader,
                payload: {
                    name: "restaurant1",
                    code: "modified1"
                }
            });

            const notFound = await server.inject({
                method: "GET",
                url: "restaurants/0",
                headers: adminHeader,
                payload: {
                    name: "restaurant1",
                    code: "modified1"
                }
            });
        
            expect(responseRestaurantOne.statusCode.toString()).toBe("200");
            expect(JSON.parse(responseRestaurantOne.body).code).toBe("modified1");

            expect(conflict.statusCode.toString()).toBe("409");
            expect(missingFields.statusCode.toString()).toBe("400");
            expect(forbidden.statusCode.toString()).toBe("403");
            expect(notFound.statusCode.toString()).toBe("404");
        });


        test("Updating own restaurant", async () => {
            const adminHeader = await buildAdminHeader();
            const restaurantOneOwner = await User.findOne({ where: { email: "restaurant1@test.com"}});
            if ( !restaurantOneOwner )
                fail("Couldn't find restaurant one owner");
            const restaurantOneOwnerHeader = await buildUserHeader(restaurantOneOwner);

            const restaurantOneNameAndCode = await server.inject({
                method: "PATCH",
                url: "restaurants",
                headers: restaurantOneOwnerHeader,
                payload: {
                    name: "restaurantOne",
                    code: "test"
                }
            });

            const restaurantOneNoName = await server.inject({
                method: "PATCH",
                url: "restaurants",
                headers: restaurantOneOwnerHeader,
                payload: {
                    code: "test"
                }
            });

            const restaurantFromAdmin = await server.inject({
                method: "PATCH",
                url: "restaurants",
                headers: adminHeader,
                payload: {
                    name: "unknownRestaurant"
                }
            });
        
        
            expect(restaurantOneNameAndCode.statusCode.toString()).toBe("200");
            expect(JSON.parse(restaurantOneNameAndCode.body).name).toBe("restaurantOne");
            expect(JSON.parse(restaurantOneNameAndCode.body).code).not.toBe("test");

            expect(restaurantOneNoName.statusCode.toString()).toBe("400");
            expect(restaurantFromAdmin.statusCode.toString()).toBe("404");        
        });

        test("Deleting a restaurant", async () => {
            const adminHeader = await buildAdminHeader();
            const restaurantOneOwner = await User.findOne({ where: { email: "restaurant1@test.com"}});
            if ( !restaurantOneOwner )
                fail("Couldn't find restaurant one owner");
            const restaurantOneOwnerHeader = await buildUserHeader(restaurantOneOwner);

            const restaurantOne = await Restaurant.findOne( { where: { name: "restaurant1"}});
            const restaurantTwo = await Restaurant.findOne( { where: { name: "restaurant2"}});

            const restaurantOneFromOwner = await server.inject({
                method: "DELETE",
                url: "restaurants/" + restaurantOne?.id,
                headers: restaurantOneOwnerHeader
            });

            const restaurantTwoFromAdmin = await server.inject({
                method: "DELETE",
                url: "restaurants/" + restaurantTwo?.id,
                headers: adminHeader
            });
        
            const forbidden = await server.inject({
                method: "DELETE",
                url: "restaurants/" + restaurantTwo?.id,
                headers: restaurantOneOwnerHeader
            });

            const notFound = await server.inject({
                method: "DELETE",
                url: "restaurants/0",
                headers: adminHeader
            });
        
            expect(restaurantOneFromOwner.statusCode.toString()).toBe("403");
            expect(await Restaurant.findByPk(restaurantOne?.id)).toBeNull();

            expect(restaurantTwoFromAdmin.statusCode.toString()).toBe("204");
            expect(await Restaurant.findByPk(restaurantTwo?.id)).toBeNull();
        
            expect(forbidden.statusCode.toString()).toBe("403");

            expect(notFound.statusCode.toString()).toBe("404");

            await server.inject({
                method: "POST",
                url: "restaurants",
                headers: adminHeader,
                payload: {
                    ownerEmail: "restaurant2@test.com",
                    restaurantName: "restaurant2"
                }
            });
        });


        test("Searching restaurants", async () => {
            const results = await server.inject({
                method: "GET",
                url: "restaurants/search/esta",
                headers: await buildAdminHeader()
            });

            const noResult = await server.inject({
                method: "GET",
                url: "restaurants/search/noresult",
                headers: await buildAdminHeader()
            });

            const restaurants: Restaurant[] = JSON.parse(results.body);
            const noResultArray: Restaurant[] = JSON.parse(noResult.body);

            expect(results.statusCode.toString()).toEqual("200");
            expect(restaurants.length).toBeGreaterThanOrEqual(3);

            expect(noResult.statusCode.toString()).toEqual("200");
            expect(noResultArray.length).toEqual(0);
        });
    });

    describe("General restaurants tests:", () => {

        let beachOne: Beach;
        let beachTwo: Beach;
        let restaurantOne: Restaurant;
        let restaurantOwnerOne: User;
        let userBeachOne: User;
        let userBeachTwo: User;

        beforeAll(async () => {
            await server;

            restaurantOne = Restaurant.build({
                name: "restaurant1testBeach",
                code: "restaurant1TestBeach"
            });

            restaurantOwnerOne = User.build({
                firstname: "restaurantBeachTest",
                lastname: "restaurantBeachTest",
                email: "restaurantBeachTest@test.com",
                password: "restaurantBeachTest",
                refreshToken: "restaurantBeachTest",
                isAdmin: false
            });

            userBeachOne = User.build({
                firstname: "beach1",
                lastname: "beach1",
                email: "beach1test@test.com",
                password: "beach1test",
                refreshToken: "beach1test",
                isAdmin: false
            });
            userBeachTwo = User.build({
                firstname: "beach2",
                lastname: "beach2",
                email: "beach2test@test.com",
                password: "beach2test",
                refreshToken: "beach2test",
                isAdmin: false
            });

            beachOne = Beach.build({
                name: "beach1test",
                code: "beach1test"
            });

            beachTwo = Beach.build({
                name: "beach2test",
                code: "beach2test"
            });

            restaurantOwnerOne = await restaurantOwnerOne.save();
            userBeachOne = await userBeachOne.save();
            userBeachTwo = await userBeachTwo.save();
            restaurantOne = await restaurantOne.save();
            beachOne = await beachOne.save();
            beachTwo = await beachTwo.save();

            await restaurantOne.$set("owner", restaurantOwnerOne);
            await beachOne.$set("owner", userBeachOne);
            await beachTwo.$set("owner", userBeachTwo);
        });
        
        test("Add a partner", async () => {
            const adminHeader = await buildAdminHeader();
            const admin = await server.inject({
                method: "POST",
                url: "restaurants/" + restaurantOne.id + "/beach",
                headers: adminHeader,
                payload: {
                    code: "beach1test"
                }
            });

            const allowed = await server.inject({
                method: "POST",
                url: "restaurants/" + restaurantOne.id + "/beach",
                headers: await buildUserHeader(restaurantOwnerOne),
                payload: {
                    code: "beach2test"
                }
            });

            const conflict = await server.inject({
                method: "POST",
                url: "restaurants/" + restaurantOne.id + "/beach",
                headers: adminHeader,
                payload: {
                    code: "beach1test"
                }
            });

            const forbidden = await server.inject({
                method: "POST",
                url: "restaurants/" + restaurantOne.id + "/beach",
                headers: await buildUserHeader(userBeachOne),
                payload: {
                    code: "beach2test"
                }
            });

            const restaurantNotFound = await server.inject({
                method: "POST",
                url: "restaurants/0/beach",
                headers: adminHeader,
                payload: {
                    code: "beach1test"
                }
            });

            const beachNotFound = await server.inject({
                method: "POST", 
                url: "restaurants/" + restaurantOne.id + "/beach",
                headers: await buildUserHeader(restaurantOwnerOne),
                payload: {
                    code: "notfound"
                }
            });

            expect(admin.statusCode.toString()).toBe("200");
            expect(allowed.statusCode.toString()).toBe("200");

            expect(await (await restaurantOne.reload({ include: { model: Beach, as: "partners"}})).partners.length).toBe(2);

            expect(conflict.statusCode.toString()).toBe("409");

            expect(forbidden.statusCode.toString()).toBe("403");

            expect(restaurantNotFound.statusCode.toString()).toBe("404");
            expect(beachNotFound.statusCode.toString()).toBe("404");
        });

        test("Delete a partner", async () => {
            const adminHeader = await buildAdminHeader();

            const admin = await server.inject({
                method: "DELETE",
                url: "restaurants/" + restaurantOne.id + "/beach/" + beachOne.id,
                headers: adminHeader
            });

            const allowed = await server.inject({
                method: "DELETE",
                url: "restaurants/" + restaurantOne.id + "/beach/" + beachTwo.id,
                headers: await buildUserHeader(restaurantOwnerOne)
            });


            const forbidden = await server.inject({
                method: "DELETE",
                url: "restaurants/" + restaurantOne.id + "/beach/" + beachTwo.id,
                headers: await buildUserHeader(userBeachOne)
            });

            const restaurantNotFound = await server.inject({
                method: "DELETE",
                url: "restaurants/0/beach/" + beachTwo.id,
                headers: adminHeader
            });

            const beachNotFound = await server.inject({
                method: "DELETE", 
                url: "restaurants/" + restaurantOne.id + "/beach/0", 
                headers: await buildUserHeader(restaurantOwnerOne)
            });

            expect(admin.statusCode.toString()).toBe("204");
            expect(allowed.statusCode.toString()).toBe("204");

            expect(await (await restaurantOne.reload({ include: { model: Beach, as: "partners"}})).partners.length).toBe(0);
            expect(forbidden.statusCode.toString()).toBe("403");

            expect(restaurantNotFound.statusCode.toString()).toBe("404");
            expect(beachNotFound.statusCode.toString()).toBe("404");

            await restaurantOne.$add("partners", beachOne);
        });

        describe("Tests related to products :", () => {
            test("Create a product for restaurant", async () => {
                const adminHeader = await buildAdminHeader();

                const admin = await server.inject({
                    method: "POST",
                    url: "restaurants/" + restaurantOne.id + "/product",
                    headers: adminHeader,
                    payload: {
                        name: "createProduct1",
                        imageUrl: "createProduct1"
                    }
                });
    
                const allowed = await server.inject({
                    method: "POST",
                    url: "restaurants/" + restaurantOne.id + "/product",
                    headers: await buildUserHeader(restaurantOwnerOne),
                    payload: {
                        name: "createProductAllowed",
                        imageUrl: "createProductAllowed"
                    }
                });
    
                const conflict = await server.inject({
                    method: "POST",
                    url: "restaurants/" + restaurantOne.id + "/product",
                    headers: adminHeader,
                    payload: {
                        name: "createProductConflict",
                        imageUrl: "createProduct1"
                    }
                });
    
                const forbidden = await server.inject({
                    method: "POST",
                    url: "restaurants/" + restaurantOne.id + "/product",
                    headers: await buildUserHeader(userBeachOne),
                    payload: {
                        name: "createProductForbidden",
                        imageUrl: "createProductForbidden"
                    }
                });
    
                const restaurantNotFound = await server.inject({
                    method: "POST",
                    url: "restaurants/0/beach",
                    headers: adminHeader,
                    payload: {
                        name: "createProduct404",
                        imageUrl: "createProduct404"
                    }
                });

                expect(admin.statusCode.toString()).toBe("201");
                expect(allowed.statusCode.toString()).toBe("201");
    
                expect(await (await restaurantOne.reload({ include: { model: Product, as: "products"}})).products.length).toBeGreaterThanOrEqual(2);
    
                expect(conflict.statusCode.toString()).toBe("409");
    
                expect(forbidden.statusCode.toString()).toBe("403");
    
                expect(restaurantNotFound.statusCode.toString()).toBe("404");    
            });

            test("Getting all products of restaurant : ", async () => {
                const adminHeader = await buildAdminHeader();

                const admin = await server.inject({
                    method: "GET",
                    url: "restaurants/" + restaurantOne.id + "/product",
                    headers: adminHeader
                });
    
                const allowed = await server.inject({
                    method: "GET",
                    url: "restaurants/" + restaurantOne.id + "/product",
                    headers: await buildUserHeader(restaurantOwnerOne)
                });

                const forbidden = await server.inject({
                    method: "GET",
                    url: "restaurants/" + restaurantOne.id + "/product",
                    headers: await buildUserHeader(userBeachOne)
                });
    
                const restaurantNotFound = await server.inject({
                    method: "GET",
                    url: "restaurants/0/product",
                    headers: adminHeader
                });

                expect(admin.statusCode.toString()).toBe("200");
                expect(allowed.statusCode.toString()).toBe("200");
                expect(JSON.parse(admin.body).length).toBeGreaterThanOrEqual(2);
                expect(JSON.parse(allowed.body).length).toEqual(JSON.parse(admin.body).length);
    
                expect(forbidden.statusCode.toString()).toBe("403");
    
                expect(restaurantNotFound.statusCode.toString()).toBe("404");  
            });

            test("Publish a product to a beach", async () => {
                const adminHeader = await buildAdminHeader();
                const productOne = await Product.create({
                    name: "publishProductOne",
                    imageUrl: "publishProductOne",
                    restaurantId: restaurantOne.id
                });

                const productTwo = await Product.create({
                    name: "publishProductTwo",
                    imageUrl: "publishProductTwo",
                    restaurantId: restaurantOne.id
                });

                const admin = await server.inject({
                    method: "PUT",
                    url: "restaurants/" + restaurantOne.id + "/product/" + productOne.id + "/beach/" + beachOne.id,
                    headers: adminHeader,
                    payload: {
                        price: 5
                    }
                });
    
                const allowed = await server.inject({
                    method: "PUT",
                    url: "restaurants/" + restaurantOne.id + "/product/" + productTwo.id + "/beach/" + beachOne.id,
                    headers: adminHeader,
                    payload: {
                        price: 3
                    }
                });

                // Waiting beacause we detect an update if insert and update are at least 1 second apart
                await new Promise((r) => setTimeout(r, 2000));

                const update = await server.inject({
                    method: "PUT",
                    url: "restaurants/" + restaurantOne.id + "/product/" + productTwo.id + "/beach/" + beachOne.id,
                    headers: adminHeader,
                    payload: {
                        price: 6
                    }
                });
    
                const forbidden = await server.inject({
                    method: "PUT",
                    url: "restaurants/" + restaurantOne.id + "/product/" + productTwo.id + "/beach/" + beachOne.id,
                    headers: await buildUserHeader(userBeachOne),
                    payload: {
                        price: 1
                    }
                });
    
                const restaurantNotFound = await server.inject({
                    method: "PUT",
                    url: "restaurants/0/product/" + productTwo.id + "/beach/" + beachOne.id,
                    headers: adminHeader,
                    payload: {
                        name: "createProduct404",
                        imageUrl: "createProduct404"
                    }
                });

                const beachNotFound = await server.inject({
                    method: "PUT",
                    url: "restaurants/" + restaurantOne.id + "/product/" + productTwo.id + "/beach/0",
                    headers: adminHeader,
                    payload: {
                        price: 1
                    }
                });


                const productNotFound = await server.inject({
                    method: "PUT",
                    url: "restaurants/" + restaurantOne.id + "/product/0/beach/" + beachOne.id,
                    headers: adminHeader,
                    payload: {
                        price: 1
                    }
                });

                expect(admin.statusCode.toString()).toBe("201");
                expect(allowed.statusCode.toString()).toBe("201");
                expect(update.statusCode.toString()).toBe("200");

                expect((await BeachProduct.findOne({ where: { 
                    productId: productOne.id,
                    beachId: beachOne.id
                }}))?.price).toEqual(5);
        
                expect((await BeachProduct.findOne({ where: { 
                    productId: productTwo.id,
                    beachId: beachOne.id
                }}))?.price).toEqual(6);

                expect(forbidden.statusCode.toString()).toBe("403");
    
                expect(restaurantNotFound.statusCode.toString()).toBe("404");    
                expect(beachNotFound.statusCode.toString()).toBe("404");    
                expect(productNotFound.statusCode.toString()).toBe("404");    

            });

            test("Get all products published to a beach", async () => {
                const adminHeader = await buildAdminHeader();

                const admin = await server.inject({
                    method: "GET",
                    url: "restaurants/" + restaurantOne.id + "/beach/" + beachOne.id,
                    headers: adminHeader
                });
    
                const allowed = await server.inject({
                    method: "GET",
                    url: "restaurants/" + restaurantOne.id + "/beach/" + beachOne.id,
                    headers: adminHeader
                });

    
                const allowedBeach = await server.inject({
                    method: "GET",
                    url: "restaurants/" + restaurantOne.id + "/beach/" + beachOne.id,
                    headers: await buildUserHeader(userBeachOne)
                });

                const forbidden = await server.inject({
                    method: "GET",
                    url: "restaurants/" + restaurantOne.id + "/beach/" + beachOne.id,
                    headers: await buildUserHeader(userBeachTwo)
                });
    
                const restaurantNotFound = await server.inject({
                    method: "GET",
                    url: "restaurants/0/beach/" + beachOne.id,
                    headers: adminHeader
                });

                const beachNotFound = await server.inject({
                    method: "GET",
                    url: "restaurants/" + restaurantOne.id + "/beach/0",
                    headers: adminHeader
                });


                expect(admin.statusCode.toString()).toBe("200");
                expect(allowed.statusCode.toString()).toBe("200");
                expect(allowedBeach.statusCode.toString()).toBe("200");

                expect(JSON.parse(admin.body).length).toBeGreaterThanOrEqual(2);
                expect(JSON.parse(allowed.body).length).toEqual(JSON.parse(admin.body).length);
                expect(JSON.parse(allowedBeach.body).length).toEqual(JSON.parse(admin.body).length);
    
                expect(forbidden.statusCode.toString()).toBe("403");
    
                expect(restaurantNotFound.statusCode.toString()).toBe("404");    
                expect(beachNotFound.statusCode.toString()).toBe("404");    
            });
            
        });
    });
});