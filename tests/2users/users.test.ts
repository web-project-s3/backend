import { User } from "../../src/models/userModel";
import { server, buildAdminHeader, buildUserHeader } from "../setup";

describe("Users endpoints test :", () => {
    describe("CRUDR endpoints :", () => {
        test("Register non existing user :", async () => {
            const response = await server.inject({
                method: "POST",
                url: "users/register",
                payload: {
                    email: "testt@test.com",
                    firstname: "Arnaud",
                    lastname: "Castelltort", 
                    password: "lapinou"
                }
            });

            const responseTwo = await server.inject({
                method: "POST",
                url: "users/register",
                payload: {
                    email: "user3@test.com",
                    firstname: "Maxime",
                    lastname: "Foucher", 
                    password: "maximefoucher"
                }
            });

            const responseThree = await server.inject({
                method: "POST",
                url: "users/register",
                payload: {
                    email: "user4@test.com",
                    firstname: "Julien",
                    lastname: "Dubois", 
                    password: "juliendubois"
                }
            });

            expect(response.statusCode.toString()).toEqual("201");
            expect(responseTwo.statusCode.toString()).toEqual("201");
            expect(responseThree.statusCode.toString()).toEqual("201");
        });

        test("Register existing user :", async () => {

            const response = await server.inject({
                method: "POST",
                url: "users/register",
                payload: {
                    email: "test@test.com",
                    firstname: "Alexis",
                    lastname: "Bernard", 
                    password: "alcool"
                }
            });

            expect(response.statusCode.toString()).toEqual("409");
        });

        test("Registering with too short of a password :", async () => {

            const response = await server.inject({
                method: "POST",
                url: "users/register",
                payload: {
                    email: "alexis@test.com",
                    firstname: "Alexis",
                    lastname: "Bernard", 
                    password: "oui"
                }
            });

            expect(response.statusCode.toString()).toEqual("400");
        });

        test("Getting all users, authorized", async () => {
            const response = await server.inject({
                method: "GET",
                url: "users/",
                headers: await buildAdminHeader()
            });
            
            const users: User[] = JSON.parse(response.body);
            expect(response.statusCode.toString()).toEqual("200");
            expect(users.length).toEqual(await User.count());
        });

        test("Getting all users, forbidden", async () => {
            const user = await User.findOne({ where: { isAdmin: false}});
            if ( !user )
                return fail("Couldn't find a non admin user");

            const response = await server.inject({
                method: "GET",
                url: "users/",
                headers: await buildUserHeader(user)
            });

            expect(response.statusCode.toString()).toEqual("403");
        });

        test("Getting a user, authorized", async () => {
            const response = await server.inject({
                method: "GET",
                url: "users/2",
                headers: await buildAdminHeader()
            });

            expect(response.statusCode.toString()).toEqual("200");
        });

        test("Getting a user, forbidden", async () => {
            const user = await User.findOne({ where: { isAdmin: false}});
            if ( !user )
                return fail("Couldn't find a non admin user");

            const response = await server.inject({
                method: "GET",
                url: "users/1",
                headers: await buildUserHeader(user)
            });

            expect(response.statusCode.toString()).toEqual("403");
        });

        test("Getting a user, not found", async () => {
            const response = await server.inject({
                method: "GET",
                url: "users/0",
                headers: await buildAdminHeader()
            });

            expect(response.statusCode.toString()).toEqual("404");
        });

        test("Getting self", async () => {
            const user = await User.findOne({ where: { isAdmin: false}});
            if ( !user )
                return fail("Couldn't find a non admin user");

            const response = await server.inject({
                method: "GET",
                url: "users/" + user.id,
                headers: await buildUserHeader(user)
            });

            expect(response.statusCode.toString()).toEqual("200");
        });

        test("Replacing a user, authorized", async () => {
            const response = await server.inject({
                method: "PUT",
                url: "users/2",
                headers: await buildAdminHeader(),
                payload: { 
                    firstname: "Changed",
                    lastname: "Changed",
                    email: "testt@test.com",
                    password: "password",
                    isAdmin: false
                }
            });

            const user = await User.findByPk(2);

            expect(response.statusCode.toString()).toEqual("200");
            expect(user?.firstname).toEqual("Changed");
            expect(user?.lastname).toEqual("Changed");
        });

        test("Replacing a user, forbidden", async () => {
            const user = await User.findByPk(2);
            if ( !user )
                fail("User is null");

            const response = await server.inject({
                method: "PUT",
                url: "users/2",
                headers: await buildUserHeader(user),
                payload: { 
                    firstname: "Same",
                    lastname: "Same",
                    email: "testt@test.com",
                    password: "password",
                    isAdmin: false
                }
            });

            await user.reload();

            expect(response.statusCode.toString()).toEqual("403");
            expect(user?.firstname).toEqual("Changed");
            expect(user?.lastname).toEqual("Changed");
        });

        test("Replacing a user, email already exists", async () => {
            const response = await server.inject({
                method: "PUT",
                url: "users/2",
                headers: await buildAdminHeader(),
                payload: { 
                    firstname: "Changed",
                    lastname: "Changed",
                    email: "test@test.com",
                    password: "password",
                    isAdmin: false
                }
            });

            const user = await User.findByPk(2);

            expect(response.statusCode.toString()).toEqual("409");
            expect(user?.firstname).toEqual("Changed");
            expect(user?.lastname).toEqual("Changed");
        });

        test("Replacing a user, email already exists", async () => {
            const response = await server.inject({
                method: "PUT",
                url: "users/2",
                headers: await buildAdminHeader(),
                payload: { 
                    firstname: "Changed",
                    lastname: "Changed",
                    email: "test@test.com",
                    password: "password",
                    isAdmin: false
                }
            });

            const user = await User.findByPk(2);

            expect(response.statusCode.toString()).toEqual("409");
            expect(user?.firstname).toEqual("Changed");
            expect(user?.lastname).toEqual("Changed");
        });

        test("Deleting a user, authorized", async () => {
            
            const create = await server.inject({
                method: "POST",
                url: "users/register",
                payload: {
                    email: "delete@test.com",
                    firstname: "toDelete",
                    lastname: "toDelete", 
                    password: "toDelete"
                }
            });

            const userId = JSON.parse(create.body).id;
            const response = await server.inject({
                method: "DELETE",
                url: "users/" + userId,
                headers: await buildAdminHeader()
            });

            const user = await User.findByPk(userId);

            expect(response.statusCode.toString()).toEqual("204");
            expect(user).toBeNull();
        });

        test("Deleting a user, forbidden", async () => {
            const auth = await User.findOne({ where: { isAdmin: false}});
            if ( !auth )
                return fail("Couldn't find a non admin user");

            const response = await server.inject({
                method: "DELETE",
                url: "users/2",
                headers: await buildUserHeader(auth)
            });

            const user = await User.findByPk(2);

            expect(response.statusCode.toString()).toEqual("403");
            expect(user).not.toBeNull();
        });

        test("Deleting a user, not found", async () => {
            const response = await server.inject({
                method: "DELETE",
                url: "users/0",
                headers: await buildAdminHeader()
            });

            expect(response.statusCode.toString()).toEqual("404");
        });

        test("Updating a user, authorized", async () => {
            const response = await server.inject({
                method: "PATCH",
                url: "users/2",
                headers: await buildAdminHeader(),
                payload: {
                    firstname: "PATCH", 
                    lastname: "PATCH"
                }
            });

            const user = await User.findByPk(2);

            expect(response.statusCode.toString()).toEqual("200");
            expect(user?.firstname).toEqual("PATCH");
            expect(user?.lastname).toEqual("PATCH");
        });

        test("Updating a user, forbidden", async () => {
            const authUser = await User.findOne({ where: { isAdmin: false }});
            if (!authUser)
                fail("User is null");

            const response = await server.inject({
                method: "PATCH",
                url: "users/2",
                headers: await buildUserHeader(authUser),
                payload: {
                    firstname: "Changed?", 
                    lastname: "Changed?"
                }
            });

            const user = await User.findByPk(2);

            expect(response.statusCode.toString()).toEqual("403");
            expect(user?.firstname).toEqual("PATCH");
            expect(user?.lastname).toEqual("PATCH");
        });

        test("Updating a user, not found", async () => {
            const response = await server.inject({
                method: "PATCH",
                url: "users/0",
                headers: await buildAdminHeader(),
                payload: {
                    firstname: "Self", 
                    lastname: "Self?"
                }
            });

            expect(response.statusCode.toString()).toEqual("404");
        });

        test("Updating self", async () => {
            const user = await User.findOne({ where: { isAdmin: false }});
            if (!user)
                fail("User is null");

            const response = await server.inject({
                method: "PATCH",
                url: "users/" + user.id,
                headers: await buildUserHeader(user),
                payload: {
                    firstname: "Self", 
                    lastname: "Self?"
                }
            });

            await user.reload();

            expect(response.statusCode.toString()).toEqual("200");
            expect(user?.firstname).toEqual("Self");
            expect(user?.lastname).toEqual("Self?");
        });

        test("Searching users, results", async () => {
            const response = await server.inject({
                method: "GET",
                url: "users/s/e",
                headers: await buildAdminHeader()
            });

            const results: User[] = JSON.parse(response.body);

            expect(response.statusCode.toString()).toEqual("200");
            expect(results.length).toBeGreaterThan(0);
        });

        test("Searching users, no results", async () => {
            const response = await server.inject({
                method: "GET",
                url: "users/toospecific/tobefind",
                headers: await buildAdminHeader()
            });

            const results: User[] = JSON.parse(response.body);

            expect(response.statusCode.toString()).toEqual("200");
            expect(results.length).toEqual(0);
        });
        
    });
    
    describe("General user tests:", () => {
        test("Logging in :", async () => {

            const response = await server.inject({
                method: "POST",
                url: "users/login",
                payload: {
                    email: "test@test.com",
                    password: "password"
                }
            });

            const user = await User.findByPk("1");

            expect(response.statusCode.toString()).toEqual("200");
            expect((JSON.parse(response.body) as User).refreshToken).toEqual(user?.refreshToken);
            
        });
    });


});



// 
// method: String,
// url: String,
// query: Object,
// payload: Object,
// headers: Object,
// cookies: Object
//