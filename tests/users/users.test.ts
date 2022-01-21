import { server } from "../setup";

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

            expect(response.statusCode.toString()).toEqual("201");
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

        
    });
});


// {
// method: String,
// url: String,
// query: Object,
// payload: Object,
// headers: Object,
// cookies: Object
//   }