import { Beach } from "../../src/models/beachModel";
import { Restaurant } from "../../src/models/restaurantModel";
import { User } from "../../src/models/userModel";
import { server, buildAdminHeader, buildUserHeader } from "../setup";

describe("Restaurants endpoints test :", () => {
    
    let randomNotAdminUser: User;
    let notAdminHeader: { authorization: string };


    beforeAll(async () => {
        await server;

        const userOne = User.build({
            firstname: "beach1",
            lastname: "beach1",
            email: "beach1@test.com",
            password: "beach1",
            refreshToken: "beach1",
            isAdmin: false
        });

        const userTwo = User.build({
            firstname: "beach2",
            lastname: "beach2",
            email: "beach2@test.com",
            password: "beach2",
            refreshToken: "beach2",
            isAdmin: false
        });

        const userThree = User.build({
            firstname: "beach3",
            lastname: "beach3",
            email: "beach3@test.com",
            password: "beach3",
            refreshToken: "beach3",
            isAdmin: false
        });
        
        const randomUser = User.build({
            firstname: "randomBeach",
            lastname: "randomBeach",
            email: "randomBeach@test.com",
            password: "randomBeach",
            refreshToken: "randomBeach",
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
        test("Creating beaches", async () => {
            const adminHeader = await buildAdminHeader();
            const beachOne = await server.inject({
                method: "POST",
                url: "beaches",
                headers: adminHeader,
                payload: {
                    ownerEmail: "beach1@test.com",
                    beachName: "beach1"
                }
            });

            const beachTwo = await server.inject({
                method: "POST",
                url: "beaches",
                headers: adminHeader,
                payload: {
                    ownerEmail: "beach2@test.com",
                    beachName: "beach2"
                }
            });

            const beachConflict = await server.inject({
                method: "POST",
                url: "beaches",
                headers: adminHeader,
                payload: {
                    ownerEmail: "beach1@test.com",
                    beachName: "beach1"
                }
            });

            const ownerNotFound = await server.inject({
                method: "POST",
                url: "beaches/",
                headers: adminHeader,
                payload: {
                    ownerEmail: "dontexist@test.com",
                    beachName: "beach1"
                }
            });

            const beachThree = await server.inject({
                method: "POST",
                url: "beaches/",
                headers: adminHeader,
                payload: {
                    ownerEmail: "beach3@test.com",
                    beachName: "beach3"
                }
            });

            const forbidden = await server.inject({
                method: "POST",
                url: "beaches/",
                headers: notAdminHeader,
                payload: {
                    ownerEmail: "beach3@test.com",
                    beachName: "beach3"
                }
            });
            
            expect(beachOne.statusCode.toString()).toBe("201");
            expect(JSON.parse(beachOne.body).id).not.toBeNull;
            expect(beachTwo.statusCode.toString()).toBe("201");
            expect(JSON.parse(beachTwo.body).id).not.toBeNull;
            expect(beachThree.statusCode.toString()).toBe("201");
            expect(JSON.parse(beachThree.body).id).not.toBeNull;

            expect(beachConflict.statusCode.toString()).toBe("409");
            expect(ownerNotFound.statusCode.toString()).toBe("404");
            expect(forbidden.statusCode.toString()).toBe("403");
        });

        test("Getting all beaches", async () => {
            const adminHeader = await buildAdminHeader();

            const allBeaches = await server.inject({
                method: "GET",
                url: "beaches",
                headers: adminHeader
            });

            const forbidden = await server.inject({
                method: "GET",
                url: "beaches",
                headers: notAdminHeader
            });
            
            const beaches: Beach[] = JSON.parse(allBeaches.body);

            expect(allBeaches.statusCode.toString()).toBe("200");
            expect(beaches.length).toBeGreaterThanOrEqual(3);

            expect(forbidden.statusCode.toString()).toBe("403");
        });

        test("Getting a beach", async () => {
            const adminHeader = await buildAdminHeader();
            const beachOneOwner = await User.findOne({ where: { email: "beach1@test.com"}});
            if ( !beachOneOwner )
                fail("Couldn't find beach one owner");
            const beachOneOwnerHeader = await buildUserHeader(beachOneOwner);

            const beachOne = await Beach.findOne( { where: { name: "beach1"}});
            const beachTwo = await Beach.findOne( { where: { name: "beach2"}});

            const beachOneFromOwner = await server.inject({
                method: "GET",
                url: "beaches/" + beachOne?.id,
                headers: beachOneOwnerHeader
            });

            const beachOneFromAdmin = await server.inject({
                method: "GET",
                url: "beaches/" + beachOne?.id,
                headers: adminHeader
            });
            
            const forbidden = await server.inject({
                method: "GET",
                url: "beaches/" + beachTwo?.id,
                headers: beachOneOwnerHeader
            });

            const notFound = await server.inject({
                method: "GET",
                url: "beaches/0",
                headers: adminHeader
            });
            
            expect(beachOneFromOwner.statusCode.toString()).toBe("200");
            expect(JSON.parse(beachOneFromOwner.body).name).toBe("beach1");

            expect(beachOneFromAdmin.statusCode.toString()).toBe("200");
            expect(JSON.parse(beachOneFromAdmin.body).name).toBe("beach1");
            
            expect(forbidden.statusCode.toString()).toBe("403");

            expect(notFound.statusCode.toString()).toBe("404");
        });

        test("Replacing a beach", async () => {
            const adminHeader = await buildAdminHeader();
            const beachOne = await Beach.findOne( { where: { name: "beach1"}});
            const beachTwo = await Beach.findOne( { where: { name: "beach2"}});

            const responseBeachOne = await server.inject({
                method: "PUT",
                url: "beaches/" + beachOne?.id,
                headers: adminHeader,
                payload: {
                    name: "beach1",
                    code: "modified1"
                }
            });

            const conflict = await server.inject({
                method: "PUT",
                url: "beaches/" + beachTwo?.id,
                headers: adminHeader,
                payload: {
                    name: "beach2",
                    code: "modified1"
                }
            });

            const missingFields = await server.inject({
                method: "PUT",
                url: "beaches/" + beachTwo?.id,
                headers: adminHeader,
                payload: {
                    name: "beach2",
                }
            });
        
            const forbidden = await server.inject({
                method: "PUT",
                url: "beaches/" + beachTwo?.id,
                headers: notAdminHeader,
                payload: {
                    name: "beach1",
                    code: "modified1"
                }
            });

            const notFound = await server.inject({
                method: "GET",
                url: "beaches/0",
                headers: adminHeader,
                payload: {
                    name: "beach1",
                    code: "modified1"
                }
            });
        
            expect(responseBeachOne.statusCode.toString()).toBe("200");
            expect(JSON.parse(responseBeachOne.body).code).toBe("modified1");

            expect(conflict.statusCode.toString()).toBe("409");
            expect(missingFields.statusCode.toString()).toBe("400");
            expect(forbidden.statusCode.toString()).toBe("403");
            expect(notFound.statusCode.toString()).toBe("404");
        });


        test("Updating own beach", async () => {
            const adminHeader = await buildAdminHeader();
            const beachOneOwner = await User.findOne({ where: { email: "beach1@test.com"}});
            if ( !beachOneOwner )
                fail("Couldn't find beach one owner");
            const beachOneOwnerHeader = await buildUserHeader(beachOneOwner);

            const beachOneNameAndCode = await server.inject({
                method: "PATCH",
                url: "beaches",
                headers: beachOneOwnerHeader,
                payload: {
                    name: "beachOne",
                    code: "test"
                }
            });

            const beachOneNoName = await server.inject({
                method: "PATCH",
                url: "beaches",
                headers: beachOneOwnerHeader,
                payload: {
                    code: "test"
                }
            });

            const beachFromAdmin = await server.inject({
                method: "PATCH",
                url: "beaches",
                headers: adminHeader,
                payload: {
                    name: "unknownBeach"
                }
            });
        
        
            expect(beachOneNameAndCode.statusCode.toString()).toBe("200");
            expect(JSON.parse(beachOneNameAndCode.body).name).toBe("beachOne");
            expect(JSON.parse(beachOneNameAndCode.body).code).not.toBe("test");

            expect(beachOneNoName.statusCode.toString()).toBe("400");
            expect(beachFromAdmin.statusCode.toString()).toBe("404");        
        });

        test("Deleting a beach", async () => {
            const adminHeader = await buildAdminHeader();
            const beachOneOwner = await User.findOne({ where: { email: "beach1@test.com"}});
            if ( !beachOneOwner )
                fail("Couldn't find beach one owner");
            const beachOneOwnerHeader = await buildUserHeader(beachOneOwner);

            const beachOne = await Beach.findOne( { where: { name: "beach1"}});
            const beachTwo = await Beach.findOne( { where: { name: "beach2"}});

            const beachOneFromOwner = await server.inject({
                method: "DELETE",
                url: "beaches/" + beachOne?.id,
                headers: beachOneOwnerHeader
            });

            const beachTwoFromAdmin = await server.inject({
                method: "DELETE",
                url: "beaches/" + beachTwo?.id,
                headers: adminHeader
            });
        
            const forbidden = await server.inject({
                method: "DELETE",
                url: "beaches/" + beachTwo?.id,
                headers: beachOneOwnerHeader
            });

            const notFound = await server.inject({
                method: "DELETE",
                url: "beaches/0",
                headers: adminHeader
            });
        
            expect(beachOneFromOwner.statusCode.toString()).toBe("403");
            expect(await Beach.findByPk(beachOne?.id)).toBeNull();

            expect(beachTwoFromAdmin.statusCode.toString()).toBe("204");
            expect(await Beach.findByPk(beachTwo?.id)).toBeNull();
        
            expect(forbidden.statusCode.toString()).toBe("403");

            expect(notFound.statusCode.toString()).toBe("404");

            await server.inject({
                method: "POST",
                url: "beaches",
                headers: adminHeader,
                payload: {
                    ownerEmail: "beach2@test.com",
                    beachName: "beach2"
                }
            });
        });


        test("Searching beach", async () => {
            const results = await server.inject({
                method: "GET",
                url: "beaches/search/eac",
                headers: await buildAdminHeader()
            });

            const noResult = await server.inject({
                method: "GET",
                url: "beaches/search/noresult",
                headers: await buildAdminHeader()
            });

            const beaches: Beach[] = JSON.parse(results.body);
            const noResultArray: Beach[] = JSON.parse(noResult.body);

            expect(results.statusCode.toString()).toEqual("200");
            expect(beaches.length).toBeGreaterThanOrEqual(3);

            expect(noResult.statusCode.toString()).toEqual("200");
            expect(noResultArray.length).toEqual(0);
        });
    });

    describe("General beaches tests:", () => {

        let restaurantOne: Restaurant;
        let restaurantTwo: Restaurant;
        let beachOne: Beach;
        let beachOwnerOne: User;
        let userRestaurantOne: User;
        let userRestaurantTwo: User;

        beforeAll(async () => {
            await server;

            beachOne = Beach.build({
                name: "beach1TestRestaurant",
                code: "beach1TestRestaurant"
            });

            beachOwnerOne = User.build({
                firstname: "beachRestaurantTest",
                lastname: "beachRestaurantTest",
                email: "beachRestaurantTest@test.com",
                password: "beachRestaurantTest",
                refreshToken: "beachRestaurantTest",
                isAdmin: false
            });

            userRestaurantOne = User.build({
                firstname: "restaurant1",
                lastname: "restaurant1",
                email: "restaurant1test@test.com",
                password: "restaurant1",
                refreshToken: "restaurant1",
                isAdmin: false
            });
            userRestaurantTwo = User.build({
                firstname: "restaurant2",
                lastname: "restaurant2",
                email: "restaurant2test@test.com",
                password: "restaurant2",
                refreshToken: "restaurant2",
                isAdmin: false
            });

            restaurantOne = Restaurant.build({
                name: "restaurant1test",
                code: "restaurant1test"
            });

            restaurantTwo = Restaurant.build({
                name: "restaurant2test",
                code: "restaurant2test"
            });

            beachOwnerOne = await beachOwnerOne.save();
            userRestaurantOne = await userRestaurantOne.save();
            userRestaurantTwo = await userRestaurantTwo.save();
            beachOne = await beachOne.save();
            restaurantOne = await restaurantOne.save();
            restaurantTwo = await restaurantTwo.save();

            await beachOne.$set("owner", beachOwnerOne);
            await restaurantOne.$set("owner", userRestaurantOne);
            await restaurantTwo.$set("owner", userRestaurantTwo);
        });
        
        test("Add a partner", async () => {
            const adminHeader = await buildAdminHeader();
            const admin = await server.inject({
                method: "POST",
                url: "beaches/" + beachOne.id + "/restaurant",
                headers: adminHeader,
                payload: {
                    code: "restaurant1test"
                }
            });

            const allowed = await server.inject({
                method: "POST",
                url: "beaches/" + beachOne.id + "/restaurant",
                headers: await buildUserHeader(beachOwnerOne),
                payload: {
                    code: "restaurant2test"
                }
            });

            const conflict = await server.inject({
                method: "POST",
                url: "beaches/" + beachOne.id + "/restaurant",
                headers: adminHeader,
                payload: {
                    code: "restaurant1test"
                }
            });

            const forbidden = await server.inject({
                method: "POST",
                url: "beaches/" + beachOne.id + "/restaurant",
                headers: await buildUserHeader(userRestaurantOne),
                payload: {
                    code: "restaurant2test"
                }
            });

            const beachNotFound = await server.inject({
                method: "POST",
                url: "beaches/0/restaurant",
                headers: adminHeader,
                payload: {
                    code: "restaurant1test"
                }
            });

            const restaurantNotFound = await server.inject({
                method: "POST", 
                url: "beaches/" + beachOne.id + "/restaurant",
                headers: await buildUserHeader(beachOwnerOne),
                payload: {
                    code: "notfound"
                }
            });

            expect(admin.statusCode.toString()).toBe("200");
            expect(allowed.statusCode.toString()).toBe("200");

            expect(await (await beachOne.reload({ include: { model: Restaurant, as: "partners"}})).partners.length).toBe(2);

            expect(conflict.statusCode.toString()).toBe("409");

            expect(forbidden.statusCode.toString()).toBe("403");

            expect(beachNotFound.statusCode.toString()).toBe("404");
            expect(restaurantNotFound.statusCode.toString()).toBe("404");
        });

        test("Delete a partner", async () => {
            const adminHeader = await buildAdminHeader();

            const admin = await server.inject({
                method: "DELETE",
                url: "beaches/" + beachOne.id + "/restaurant/" + restaurantOne.id,
                headers: adminHeader,
            });

            const allowed = await server.inject({
                method: "DELETE",
                url: "beaches/" + beachOne.id + "/restaurant/" + restaurantTwo.id,
                headers: await buildUserHeader(beachOwnerOne),
            });


            const forbidden = await server.inject({
                method: "DELETE",
                url: "beaches/" + beachOne.id + "/restaurant/" + restaurantTwo.id,
                headers: await buildUserHeader(userRestaurantOne)
            });

            const beachNotFound = await server.inject({
                method: "DELETE",
                url: "beaches/0/restaurant/" + restaurantOne.id,
                headers: adminHeader,
            });

            const restaurantNotFound = await server.inject({
                method: "DELETE", 
                url: "beaches/" + beachOne.id + "/restaurant/0",
                headers: await buildUserHeader(beachOwnerOne)
            });

            expect(admin.statusCode.toString()).toBe("204");
            expect(allowed.statusCode.toString()).toBe("204");

            expect(await (await beachOne.reload({ include: { model: Restaurant, as: "partners"}})).partners.length).toBe(0);
            expect(forbidden.statusCode.toString()).toBe("403");

            expect(beachNotFound.statusCode.toString()).toBe("404");
            expect(restaurantNotFound.statusCode.toString()).toBe("404");
        }); 
    });
});