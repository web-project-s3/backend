/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    globalSetup: "./tests/beforeTests.ts",
    globalTeardown: "./tests/afterTests.ts"
};