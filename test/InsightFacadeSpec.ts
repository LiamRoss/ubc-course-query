/**
 * Created by Alice on 22/01/17.
 */

import Server from "../src/rest/Server";
import {expect} from 'chai';
import Log from "../src/Util";
import {InsightResponse} from "../src/controller/IInsightFacade";
import InsightFacade from "../src/controller/InsightFacade";

describe("EchoSpec", function () {
    var testBase64: string = null;

    function sanityCheck(response: InsightResponse) {
        expect(response).to.have.property('code');
        expect(response).to.have.property('body');
        expect(response.code).to.be.a('number');
    }

    before(function () {
        // convert the courses.zip file to base64 for testing
        var fs = require('fs'),  
        file = "../courses.zip",
        data = fs.readFileSync(file);
        testBase64 = data.toString('base64')
        // TODO: make catch in case conversion is failing

        Log.test('Before: ' + (<any>this).test.parent.title);
    });

    var insightFacade: InsightFacade = null;
    beforeEach(function () {
        insightFacade = new InsightFacade();

        Log.test('BeforeTest: ' + (<any>this).currentTest.title);
    });

    after(function () {
        Log.test('After: ' + (<any>this).test.parent.title);
    });

    afterEach(function () {
        Log.test('AfterTest: ' + (<any>this).currentTest.title);
    });

    // TODO: test each helper function in InsightFacade.ts

    it("Test ", function () {
        let out = Server.performEcho('echo');
        Log.test(JSON.stringify(out));
        sanityCheck(out);
        expect(out.code).to.equal(200);
        expect(out.body).to.deep.equal({message: 'echo...echo'});
    });
    
    // tests addDataset with converted zip file, passing in arbitrary ID "courses", expects code 201
    it("Calling addDataset with test base64 zip, should return code 201", function () {
        var id = "courses";

        return insightFacade.addDataset(id, testBase64).then(function (value: InsightResponse) {
            Log.test('Value: ' + value.code);
            expect(value).to.equal(201);
        }).catch(function (err: InsightResponse) {
            Log.test('Error: ' + err.code);
            expect.fail();
        })
    });
});

