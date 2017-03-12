/**
 * Created by Alice on 22/01/17.
 */

import Server from "../src/rest/Server";
import {
    expect
} from 'chai';
import Log from "../src/Util";
import {
    InsightResponse,
    QueryRequest
} from "../src/controller/IInsightFacade";
import InsightFacade from "../src/controller/InsightFacade";
import {Response} from "restify";
var fs = require('fs');

// Global vars
var testBase64: string = null;

/**
 * Reference: http://stackoverflow.com/questions/28834835/readfile-in-base64-nodejs
 * @param file
 * @returns {string}
 */
function base64_encode(file: any) {
    var bitmap = fs.readFileSync(file);
    return new Buffer(bitmap).toString('base64');
}

let server: any = null;
let port = 4321;
let chaiHttp = require('chai-http');
let chai = require('chai');
chai.use(chaiHttp);

describe("ServerD3Spec", function () {

    before(function () {
        //Log.test('Before: ' + (<any>this).test.parent.title);
        Log.trace("Starting server");
        port = 4321;
        server = new Server(port);
        server.start();
    });

    beforeEach(function () {
        // Initialize zip file
        try { testBase64 = base64_encode("test/courses.zip"); } catch (e) { Log.trace("e = " + e); }

        Log.test('BeforeTest: ' + ( < any > this).currentTest.title);
    });

    after(function () {
        //Log.test('After: ' + (<any>this).test.parent.title);
        server.stop();
        server = null;
    });

    afterEach(function () {
        //Log.test('AfterTest: ' + (<any>this).currentTest.title);
    });

    // Test 1
    // Add single course set
    it("Simple server PUT with courses.zip", function () {
        this.timeout(100000);

        let path: string = "/dataset/courses";
        let url: string = "http://localhost:" + port;

        Log.trace("Making put request...");
        return chai.request(url)
            .put(path)
            .attach("body", fs.readFileSync("test/courses.zip"), "courses.zip")
            .then(function (res: Response) {
                Log.trace("Test passed, res = " + JSON.stringify(res));
                expect(res.status).to.equal(204);
            })
            .catch(function (err: any) {
                Log.trace(err);
                expect.fail();
            });
    });

    // Test 2
    // Performs a simple query
    it("Simple POST on courses.zip", function () {
        this.timeout(100000);

        let path: string = "/query";
        let url: string = "http://localhost:" + port;

        let queryJSONObect = {
            "WHERE":{
                "GT":{
                    "courses_avg":97
                }
            },
            "OPTIONS":{
                "COLUMNS":[
                    "courses_dept",
                    "courses_avg"
                ],
                "ORDER":"courses_avg",
                "FORM":"TABLE"
            }
        };

        Log.trace("Making post request...");
        return chai.request(url)
            .post(path)
            .send(queryJSONObect)
            .then(function (res: any) {
                Log.trace("Test passed, res = " + JSON.stringify(res));
                // Expect response code of successful query
            })
            .catch(function (err: any) {
                Log.trace(JSON.stringify(err));
                expect.fail();
            });
    });

    // Test 3
    // Deletes courses from the server
    it("DELETE call on courses.zip", function () {
        this.timeout(100000);

        let path: string = "/dataset/courses";
        let url: string = "http://localhost:" + port;

        Log.trace("Making DELETE request...");
        return chai.request(url)
            .del(path)
            .then(function (res: any) {
                Log.trace("Test passed, res = " + JSON.stringify(res));
                expect(res.status).to.equal(204);
            })
            .catch(function (err: any) {
                Log.trace(err);
                expect.fail();
            });
    });

    // Test 4
    // Deletes courses from the server when it is not present
    it("DELETE call again on courses.zip, should return 404", function () {
        this.timeout(100000);

        let path: string = "/dataset/courses";
        let url: string = "http://localhost:" + port;

        Log.trace("Making DELETE request...");
        return chai.request(url)
            .del(path)
            .then(function (res: any) {
                Log.trace("Test failed, res = " + JSON.stringify(res));
                expect.fail();
            })
            .catch(function (err: any) {
                Log.trace(err);
                expect(err.status).to.equal(404);
            });
    });
});