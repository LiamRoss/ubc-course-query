/**
 * Created by Alice on 22/01/17.
 */

import Server from "../src/rest/Server";
import {expect} from 'chai';
import Log from "../src/Util";
import {InsightResponse, QueryRequest} from "../src/controller/IInsightFacade";
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
/*
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
    });*/

    /**
     * PERFORM QUERY TESTS
     */

    // Test 6
    // A simple query (from d1 page)
    /*it("performQuery with a simple query", function () {
        var id: string = "courses";
        this.timeout(10000);
        return insightFacade.addDataset(id, testBase64)
            .then(function (value: InsightResponse) {
                var qr: QueryRequest =
                    {
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

                return insightFacade.performQuery(qr)
                    .then(function(value: InsightResponse) {
                        Log.trace("Test done: " + value.code + ", " + JSON.stringify(value.body));
                        expect(value.body).to.deep.equal(
                            { render: 'TABLE',
                                result:
                                    [ { courses_dept: 'epse', courses_avg: 97.09 },
                                        { courses_dept: 'math', courses_avg: 97.09 },
                                        { courses_dept: 'math', courses_avg: 97.09 },
                                        { courses_dept: 'epse', courses_avg: 97.09 },
                                        { courses_dept: 'math', courses_avg: 97.25 },
                                        { courses_dept: 'math', courses_avg: 97.25 },
                                        { courses_dept: 'epse', courses_avg: 97.29 },
                                        { courses_dept: 'epse', courses_avg: 97.29 },
                                        { courses_dept: 'nurs', courses_avg: 97.33 },
                                        { courses_dept: 'nurs', courses_avg: 97.33 },
                                        { courses_dept: 'epse', courses_avg: 97.41 },
                                        { courses_dept: 'epse', courses_avg: 97.41 },
                                        { courses_dept: 'cnps', courses_avg: 97.47 },
                                        { courses_dept: 'cnps', courses_avg: 97.47 },
                                        { courses_dept: 'math', courses_avg: 97.48 },
                                        { courses_dept: 'math', courses_avg: 97.48 },
                                        { courses_dept: 'educ', courses_avg: 97.5 },
                                        { courses_dept: 'nurs', courses_avg: 97.53 },
                                        { courses_dept: 'nurs', courses_avg: 97.53 },
                                        { courses_dept: 'epse', courses_avg: 97.67 },
                                        { courses_dept: 'epse', courses_avg: 97.69 },
                                        { courses_dept: 'epse', courses_avg: 97.78 },
                                        { courses_dept: 'crwr', courses_avg: 98 },
                                        { courses_dept: 'crwr', courses_avg: 98 },
                                        { courses_dept: 'epse', courses_avg: 98.08 },
                                        { courses_dept: 'nurs', courses_avg: 98.21 },
                                        { courses_dept: 'nurs', courses_avg: 98.21 },
                                        { courses_dept: 'epse', courses_avg: 98.36 },
                                        { courses_dept: 'epse', courses_avg: 98.45 },
                                        { courses_dept: 'epse', courses_avg: 98.45 },
                                        { courses_dept: 'nurs', courses_avg: 98.5 },
                                        { courses_dept: 'nurs', courses_avg: 98.5 },
                                        { courses_dept: 'epse', courses_avg: 98.58 },
                                        { courses_dept: 'nurs', courses_avg: 98.58 },
                                        { courses_dept: 'nurs', courses_avg: 98.58 },
                                        { courses_dept: 'epse', courses_avg: 98.58 },
                                        { courses_dept: 'epse', courses_avg: 98.7 },
                                        { courses_dept: 'nurs', courses_avg: 98.71 },
                                        { courses_dept: 'nurs', courses_avg: 98.71 },
                                        { courses_dept: 'eece', courses_avg: 98.75 },
                                        { courses_dept: 'eece', courses_avg: 98.75 },
                                        { courses_dept: 'epse', courses_avg: 98.76 },
                                        { courses_dept: 'epse', courses_avg: 98.76 },
                                        { courses_dept: 'epse', courses_avg: 98.8 },
                                        { courses_dept: 'spph', courses_avg: 98.98 },
                                        { courses_dept: 'spph', courses_avg: 98.98 },
                                        { courses_dept: 'cnps', courses_avg: 99.19 },
                                        { courses_dept: 'math', courses_avg: 99.78 },
                                        { courses_dept: 'math', courses_avg: 99.78 } ] }
                        );
                    })
                    .catch(function(err: InsightResponse) {
                        Log.trace("Test failed: " + err.code + ", " + JSON.stringify(err.body));
                        expect.fail();
                    })
            })
            .catch(function (err: InsightResponse) {
                Log.test('ERROR: ' + err.body);
                expect.fail();
            });
    });*/

    // Test 7
    // A complex query (from d1 page)
    it("performQuery with a complex query", function () {
        var id: string = "courses";
        this.timeout(100000);
        return insightFacade.addDataset(id, testBase64)
            .then(function (value: InsightResponse) {
                var qr: QueryRequest =
                    {
                        "WHERE":{
                            "OR":[
                                {
                                    "AND":[
                                        {
                                            "GT":{
                                                "courses_avg":90
                                            }
                                        },
                                        {
                                            "IS":{
                                                "courses_dept":"adhe"
                                            }
                                        }
                                    ]
                                },
                                {
                                    "EQ":{
                                        "courses_avg":95
                                    }
                                }
                            ]
                        },
                        "OPTIONS":{
                            "COLUMNS":[
                                "courses_dept",
                                "courses_id",
                                "courses_avg"
                            ],
                            "ORDER":"courses_avg",
                            "FORM":"TABLE"
                        }
                    };
                return insightFacade.performQuery(qr)
                    .then(function(value: InsightResponse) {
                        Log.trace("Test done: " + value.code + ", " + JSON.stringify(value.body));
                        expect(value.body).to.deep.equal(
                            { render: 'TABLE',
                                result:
                                    [ { courses_dept: 'adhe', courses_id: '329', courses_avg: 90.02 },
                                        { courses_dept: 'adhe', courses_id: '412', courses_avg: 90.16 },
                                        { courses_dept: 'adhe', courses_id: '330', courses_avg: 90.17 },
                                        { courses_dept: 'adhe', courses_id: '412', courses_avg: 90.18 },
                                        { courses_dept: 'adhe', courses_id: '330', courses_avg: 90.5 },
                                        { courses_dept: 'adhe', courses_id: '330', courses_avg: 90.72 },
                                        { courses_dept: 'adhe', courses_id: '329', courses_avg: 90.82 },
                                        { courses_dept: 'adhe', courses_id: '330', courses_avg: 90.85 },
                                        { courses_dept: 'adhe', courses_id: '330', courses_avg: 91.29 },
                                        { courses_dept: 'adhe', courses_id: '330', courses_avg: 91.33 },
                                        { courses_dept: 'adhe', courses_id: '330', courses_avg: 91.33 },
                                        { courses_dept: 'adhe', courses_id: '330', courses_avg: 91.48 },
                                        { courses_dept: 'adhe', courses_id: '329', courses_avg: 92.54 },
                                        { courses_dept: 'adhe', courses_id: '329', courses_avg: 93.33 },
                                        { courses_dept: 'rhsc', courses_id: '501', courses_avg: 95 },
                                        { courses_dept: 'bmeg', courses_id: '597', courses_avg: 95 },
                                        { courses_dept: 'bmeg', courses_id: '597', courses_avg: 95 },
                                        { courses_dept: 'cnps', courses_id: '535', courses_avg: 95 },
                                        { courses_dept: 'cnps', courses_id: '535', courses_avg: 95 },
                                        { courses_dept: 'cpsc', courses_id: '589', courses_avg: 95 },
                                        { courses_dept: 'cpsc', courses_id: '589', courses_avg: 95 },
                                        { courses_dept: 'crwr', courses_id: '599', courses_avg: 95 },
                                        { courses_dept: 'crwr', courses_id: '599', courses_avg: 95 },
                                        { courses_dept: 'crwr', courses_id: '599', courses_avg: 95 },
                                        { courses_dept: 'crwr', courses_id: '599', courses_avg: 95 },
                                        { courses_dept: 'crwr', courses_id: '599', courses_avg: 95 },
                                        { courses_dept: 'crwr', courses_id: '599', courses_avg: 95 },
                                        { courses_dept: 'crwr', courses_id: '599', courses_avg: 95 },
                                        { courses_dept: 'sowk', courses_id: '570', courses_avg: 95 },
                                        { courses_dept: 'econ', courses_id: '516', courses_avg: 95 },
                                        { courses_dept: 'edcp', courses_id: '473', courses_avg: 95 },
                                        { courses_dept: 'edcp', courses_id: '473', courses_avg: 95 },
                                        { courses_dept: 'epse', courses_id: '606', courses_avg: 95 },
                                        { courses_dept: 'epse', courses_id: '682', courses_avg: 95 },
                                        { courses_dept: 'epse', courses_id: '682', courses_avg: 95 },
                                        { courses_dept: 'kin', courses_id: '499', courses_avg: 95 },
                                        { courses_dept: 'kin', courses_id: '500', courses_avg: 95 },
                                        { courses_dept: 'kin', courses_id: '500', courses_avg: 95 },
                                        { courses_dept: 'math', courses_id: '532', courses_avg: 95 },
                                        { courses_dept: 'math', courses_id: '532', courses_avg: 95 },
                                        { courses_dept: 'mtrl', courses_id: '564', courses_avg: 95 },
                                        { courses_dept: 'mtrl', courses_id: '564', courses_avg: 95 },
                                        { courses_dept: 'mtrl', courses_id: '599', courses_avg: 95 },
                                        { courses_dept: 'musc', courses_id: '553', courses_avg: 95 },
                                        { courses_dept: 'musc', courses_id: '553', courses_avg: 95 },
                                        { courses_dept: 'musc', courses_id: '553', courses_avg: 95 },
                                        { courses_dept: 'musc', courses_id: '553', courses_avg: 95 },
                                        { courses_dept: 'musc', courses_id: '553', courses_avg: 95 },
                                        { courses_dept: 'musc', courses_id: '553', courses_avg: 95 },
                                        { courses_dept: 'nurs', courses_id: '424', courses_avg: 95 },
                                        { courses_dept: 'nurs', courses_id: '424', courses_avg: 95 },
                                        { courses_dept: 'obst', courses_id: '549', courses_avg: 95 },
                                        { courses_dept: 'psyc', courses_id: '501', courses_avg: 95 },
                                        { courses_dept: 'psyc', courses_id: '501', courses_avg: 95 },
                                        { courses_dept: 'econ', courses_id: '516', courses_avg: 95 },
                                        { courses_dept: 'adhe', courses_id: '329', courses_avg: 96.11 } ] }
                        );
                    })
                    .catch(function(err: InsightResponse) {
                        Log.trace("Test failed: " + err.code + ", " + JSON.stringify(err.body));
                        expect.fail();
                    })
            })
            .catch(function (err: InsightResponse) {
                Log.test('ERROR: ' + err.body);
                expect.fail();
            });
    });

});

