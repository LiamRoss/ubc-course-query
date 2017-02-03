/**
 * Created by Alice on 22/01/17.
 */

import Server from "../src/rest/Server";
import {expect} from 'chai';
import Log from "../src/Util";
import {InsightResponse} from "../src/controller/IInsightFacade";
import InsightFacade from "../src/controller/InsightFacade";
var fs = require('fs');

// Global vars
var testBase64: string = null;
var testBase64_2: string = null;
var insightFacade: InsightFacade = null;

/**
 * Reference: http://stackoverflow.com/questions/28834835/readfile-in-base64-nodejs
 * @param file
 * @returns {string}
 */
function base64_encode(file: any) {
    var bitmap = fs.readFileSync(file);
    return new Buffer(bitmap).toString('base64');
}

describe("InsightFacadeSpec", function () {

    function sanityCheck(response: InsightResponse) {
        expect(response).to.have.property('code');
        expect(response).to.have.property('body');
        expect(response.code).to.be.a('number');
    }

    before(function () {
        // Empty for now
        //Log.test('Before: ' + (<any>this).test.parent.title);
    });

    beforeEach(function () {
        // Initialize zip file
        try { testBase64 = base64_encode("test/courses.zip"); } catch(e) { Log.trace("e = " + e); }
        try { testBase64_2 = base64_encode("test/bad_courses.zip"); } catch(e) { Log.trace("e = " + e); }

        // Initialize InsightFacade instance
        insightFacade = new InsightFacade();
        Log.test('BeforeTest: ' + (<any>this).currentTest.title);
    });

    after(function () {
        //Log.test('After: ' + (<any>this).test.parent.title);
    });

    afterEach(function () {
        //Log.test('AfterTest: ' + (<any>this).currentTest.title);
        insightFacade = null;
    });

    // TODO: test each helper function in InsightFacade.ts

    // Test 1
    // Add single dataset
    it("addDataset with test base64 zip, should return code 204", function () {
        var id: string = "courses";
        this.timeout(10000);
        return insightFacade.addDataset(id, testBase64)
            .then(function (value: InsightResponse) {
                Log.test("Value.code: " + value.code);
                expect(value.code).to.equal(204);
            })
            .catch(function (err: InsightResponse) {
                Log.test('ERROR: ' + err.body);
                expect.fail();
            });
    });

    // Test 2
    // Adding same dataset twice
    it("addDataset with test base64 zip, then addDataSet with same test base64 zip should return code 201", function () {
        var id: string = "courses";
        this.timeout(10000);
        return insightFacade.addDataset(id, testBase64)
            .then(function (value: InsightResponse) {
                Log.test("First add value.code: " + value.code);
                return insightFacade.addDataset(id, testBase64)
                    .then(function (value: InsightResponse) {
                        Log.test("Second add value.code: " + value.code);
                        expect(value.code).to.equal(201);
                    })
                    .catch(function (err: InsightResponse) {
                        Log.test('ERROR: Second add failed, ' + err.body);
                        expect.fail();
                    });
            })
            .catch(function (err: InsightResponse) {
                Log.test('ERROR: First add failed, ' + err.body);
                expect.fail();
            });
    });

    // Test 3
    // Adding dataset and then removing it
    it("addDataset with test base64 zip, then removeDataset on it should return code 204", function () {
        var id: string = "courses";
        this.timeout(10000);
        return insightFacade.addDataset(id, testBase64)
            .then(function (value: InsightResponse) {
                Log.test("First add value.code: " + value.code);
                return insightFacade.removeDataset(id)
                    .then(function (value: InsightResponse) {
                        Log.test("Removal's value.code: " + value.code);
                        expect(value.code).to.equal(204);
                    })
                    .catch(function (err: InsightResponse) {
                        Log.test('ERROR: Removal failed, ' + err.body);
                        expect.fail();
                    });
            })
            .catch(function (err: InsightResponse) {
                Log.test('ERROR: Add failed, ' + err.body);
                expect.fail();
            });
    });

    // Test 4
    // Removing 'courses' which hasn't been added yet
    it("removeDataset at 'courses' before adding it should return error 400", function () {
        var id: string = "courses";
        this.timeout(10000);
        return insightFacade.removeDataset(id)
            .then(function (value: InsightResponse) {
                expect.fail();
            })
            .catch(function (err: InsightResponse) {
                Log.test('Remove failed, ' + JSON.stringify(err.body));
                expect(err.code).to.equal(404);
            });
    });

    // Test 5
    // Testing test base64 zip 2 (which has no proper files)
    it("addDataset with bad base64 zip, should return error code", function () {
        var id: string = "courses_bad";
        this.timeout(10000);
        return insightFacade.addDataset(id, testBase64_2)
            .then(function (value: InsightResponse) {
                expect.fail();
            })
            .catch(function (err: InsightResponse) {
                Log.trace("err.code = " + err.code + ", err.body = " + JSON.stringify(err.body));
                expect(err.code).to.equal(400);
            });
    });

});

