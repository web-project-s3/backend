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
});