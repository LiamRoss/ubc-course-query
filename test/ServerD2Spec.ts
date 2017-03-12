// /**
//  * Created by Alice on 22/01/17.
//  */

// import Server from "../src/rest/Server";
// import {
//     expect
// } from 'chai';
// import Log from "../src/Util";
// import {
//     InsightResponse,
//     QueryRequest
// } from "../src/controller/IInsightFacade";
// import InsightFacade from "../src/controller/InsightFacade";
// var fs = require('fs');

// // Global vars
// var testBase64: string = null;
// var insightFacade: InsightFacade = null;

// /**
//  * Reference: http://stackoverflow.com/questions/28834835/readfile-in-base64-nodejs
//  * @param file
//  * @returns {string}
//  */
// function base64_encode(file: any) {
//     var bitmap = fs.readFileSync(file);
//     return new Buffer(bitmap).toString('base64');
// }

// describe("ServerD3Spec", function () {

//     let server: any = null;
//     let port = 4321;
//     let chaiHttp = require('chai-http');
//     let chai = require('chai');
//     chai.use(chaiHttp);

//     before(function () {
//         //Log.test('Before: ' + (<any>this).test.parent.title);
//     });

//     beforeEach(function () {
//         // Initialize zip file
//         try { testBase64 = base64_encode("test/courses.zip"); } catch (e) { Log.trace("e = " + e); }

//         //port = 4321;
//         //server = new Server(port);

//         Log.test('BeforeTest: ' + ( < any > this).currentTest.title);
//     });

//     after(function () {
//         //Log.test('After: ' + (<any>this).test.parent.title);
//     });

//     afterEach(function () {
//         //Log.test('AfterTest: ' + (<any>this).currentTest.title);
//         server = null;
//     });

//     // Test 1
//     // Add single course set
//     it("Simple server PUT with courses.zip", function () {
//         this.timeout(100000);

//         let path: string = "/dataset/courses";
//         let url: string = "http://localhost:" + port;

//         Log.trace("Making put request...");
//         return chai.request(url)
//             .put(path)
//             .attach("body", fs.readFileSync("test/courses.zip"), "courses.zip")
//             .then(function (res: any) {
//                 Log.trace("Test passed, res = " + JSON.stringify(res));
//             })
//             .catch(function (err: any) {
//                 Log.trace("Error! " + err);
//             });
//     });
// });