/**
 * Created by Alice on 22/01/17.
 */

import Server from "../src/rest/Server";
import {expect} from 'chai';
import Log from "../src/Util";
import {InsightResponse} from "../src/controller/IInsightFacade";

describe("EchoSpec", function () {


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
        var testBase64 = data.toString('base64');
        console.log(testBase64);

        Log.test('Before: ' + (<any>this).test.parent.title);
    });

    beforeEach(function () {
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
    
    // converts zip to base64, then tests addDataset, passing in arbitrary ID Number 
    it("Test description", function () {
        





        return math.add([]).then(function (value: number) {
            Log.test('Value: ' + value);
            expect(value).to.equal(0);
        }).catch(function (err) {
            Log.test('Error: ' + err);
            expect.fail();
        })
    });
});

