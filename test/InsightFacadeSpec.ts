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
        //done();
    });

    beforeEach(function () {
        // Initialize zip file
        try { testBase64 = base64_encode("test/courses.zip"); } catch(e) { Log.trace("e = " + e); }

        // Initialize InsightFacade instance
        insightFacade = new InsightFacade();
        Log.test('BeforeTest: ' + (<any>this).currentTest.title);
        //done();
    });

    after(function () {
        //Log.test('After: ' + (<any>this).test.parent.title);
        //done();
    });

    afterEach(function () {
        //Log.test('AfterTest: ' + (<any>this).currentTest.title);
        //done();
        insightFacade = null;
    });

    // TODO: test each helper function in InsightFacade.ts
    
    // tests addDataset with converted zip file, passing in arbitrary ID "courses", expects code 204
    it("Calling addDataset with test base64 zip, should return code 204", function () {
        var id: string = "courses";

        return insightFacade.addDataset(id, testBase64)
            .then(function (value: InsightResponse) {
                Log.test("Value.code: " + value.code);
                expect(value.code).to.equal(204);
                //done();
            })
            .catch(function (err: InsightResponse) {
                Log.test('Test error: ' + err);
                expect.fail();
                //done();
            });
    });
});

