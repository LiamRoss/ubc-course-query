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
// var testBase64_3: string = null;
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
        // try { testBase64_3 = base64_encode("test/courses.zip"); } catch(e) { Log.trace("e = " + e); }
        // try { testBase64_3 = base64_encode("test/courses_1course.zip"); } catch(e) { Log.trace("e = " + e); }

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
                // Log.trace("err.code = " + err.code + ", err.body = " + JSON.stringify(err.body));
                expect(err.code).to.equal(400);
            });
    });
    
    // PERFORM QUERY TESTS
    
    // Test 6
    // A simple query (from d1 page)
    it("performQuery with a simple query", function () {
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
                        // Log.trace("Test done: " + value.code + ", " + JSON.stringify(value.body));
                        // expect(value.code).to.equal(200);
    
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
    });
    
    
    // Test 7
    // A overlapping NOT query w/ no results
    it("performQuery with overlapping NOT", function () {
        var id: string = "courses";
        this.timeout(10000);
        return insightFacade.addDataset(id, testBase64)
            .then(function (value: InsightResponse) {
                var qr: QueryRequest = {
                    "WHERE": {
                        "NOT": {
                            "OR": [{
                                    "GT": {
                                        "courses_avg":85
                                    }
                                },
                                {
                                    "LT": {
                                        "courses_avg":90
                                    }
                                }
                            ]
                        }
                    },
                    "OPTIONS": {
                        "COLUMNS": [
                            "courses_dept",
                            "courses_avg"
                        ],
                        "ORDER": "courses_avg",
                        "FORM": "TABLE"
                    }
                };
    
                return insightFacade.performQuery(qr)
                    .then(function (value: InsightResponse) {
                        Log.test("Value.code: " + value.code);
                        // expect(value.code).to.equal(204);
                        expect.fail();
                    })
                    .catch(function (err: InsightResponse) {
                        Log.test('ERROR: ' + JSON.stringify(err.body));
                        expect(err.code).to.equal(400);
                    });
            })
            .catch(function (err: InsightResponse) {
                Log.test('ERROR: ' + JSON.stringify(err.body));
                expect.fail();
            });
    });
    
    
    // Test 8
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
                        // Log.trace("Test done: " + value.code + ", " + JSON.stringify(value.body));
                        // expect(value.code).to.equal(200);
    
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
    
    
    // Test 9
    // An AND query w/ no results
    it("performQuery with contradictory AND", function () {
        var id: string = "courses";
        this.timeout(10000);
        return insightFacade.addDataset(id, testBase64)
            .then(function (value: InsightResponse) {
                var qr: QueryRequest = {
                    "WHERE": {
                        "AND": [{
                                "GT": {
                                    "courses_avg":95
                                }
                            },
                            {
                                "LT": {
                                    "courses_avg":90
                                }
                            }
                        ]
                    },
                    "OPTIONS": {
                        "COLUMNS": [
                            "courses_dept",
                            "courses_avg"
                        ],
                        "ORDER": "courses_avg",
                        "FORM": "TABLE"
                    }
                };
    
                return insightFacade.performQuery(qr)
                    .then(function (value: InsightResponse) {
                        Log.test("Value.code: " + value.code);
                        // expect(value.code).to.equal(204);
                        expect.fail();
                    })
                    .catch(function (err: InsightResponse) {
                        Log.test('ERROR: ' + JSON.stringify(err.body));
                        expect(err.code).to.equal(400);
                    });
            })
            .catch(function (err: InsightResponse) {
                Log.test('ERROR: ' + JSON.stringify(err.body));
                expect.fail();
            });
    });
    
    
    // Test 10a
    // 424 testing
    it("performQuery with non-existing datasets", function () {
        var id: string = "courses";
        this.timeout(10000);
        return insightFacade.addDataset(id, testBase64)
            .then(function (value: InsightResponse) {
                var qr: any = {
                    "WHERE": {
                        "IS": {
                            "test1_instructor": "a*"
                        }
                    },
                    "OPTIONS": {
                        "COLUMNS": [
                            "test2_instructor",
                            "courses_avg"
                        ],
                        "ORDER": "courses_avg",
                        "FORM": "TABLE"
                    }
                };
    
                return insightFacade.performQuery(qr)
                    .then(function (value: InsightResponse) {
                        Log.test("ERROR: " + value.code);
                        // expect(value.code).to.equal(204);
                        expect.fail();
                    })
                    .catch(function (err: InsightResponse) {
                        Log.test('err.code: ' + err.code);
                        Log.test('err.body: ' + JSON.stringify(err.body));
                        expect(err.body).to.deep.equal({
                            "missing": ["test1", "test2"]
                        });
                    });
            })
            .catch(function (err: InsightResponse) {
                Log.test('ERROR: ' + err.body);
                expect.fail();
            });
    });
    
    
    // Test 10b
    // 424 testing
    it("performQuery with non-existing datasets and incorrect types", function () {
        var id: string = "courses";
        this.timeout(10000);
        return insightFacade.addDataset(id, testBase64)
            .then(function (value: InsightResponse) {
                var qr: any = {
                    "WHERE": {
                        "IS": {
                            "test1_instructor": 4
                        }
                    },
                    "OPTIONS": {
                        "COLUMNS": [
                            "test2_instructor",
                            "courses_avg"
                        ],
                        "ORDER": "test3_avg",
                        "FORM": "TABLE"
                    }
                };
    
                return insightFacade.performQuery(qr)
                    .then(function (value: InsightResponse) {
                        Log.test("ERROR: " + value.code);
                        // expect(value.code).to.equal(204);
                        expect.fail();
                    })
                    .catch(function (err: InsightResponse) {
                        Log.test('err.code: ' + err.code);
                        Log.test('err.body: ' + JSON.stringify(err.body));
                        expect(err.body).to.deep.equal({
                            "missing": ["test1", "test2", "test3"]
                        });
                    });
            })
            .catch(function (err: InsightResponse) {
                Log.test('ERROR: ' + err.body);
                expect.fail();
            });
    });
    
    
    // Test 12b
    // Specific instructors, full courses string*
    it("full courses specific instructors - *string", function () {
        var id: string = "courses";
        this.timeout(10000);
        return insightFacade.addDataset(id, testBase64)
            .then(function (value: InsightResponse) {
                var qr: QueryRequest = {
                    "WHERE": {
                        "IS": {
                            "courses_instructor": "*dad"
                        }
                    },
                    "OPTIONS": {
                        "COLUMNS": [
                            "courses_instructor",
                            "courses_avg"
                        ],
                        "ORDER": "courses_avg",
                        "FORM": "TABLE"
                    }
                };
    
                return insightFacade.performQuery(qr)
                    .then(function (value: InsightResponse) {
                        Log.test("code: " + value.code);
                        // expect(value.code).to.equal(200);
                        // Log.test(JSON.stringify(value.body));
                        expect(value.body).to.deep.equal({
                            "render": "TABLE",
                            "result": [{
                                    "courses_instructor": "khatirinejad, mahdad",
                                    "courses_avg": 61.36
                                },
                                {
                                    "courses_instructor": "haber, eldad",
                                    "courses_avg": 67.34
                                },
                                {
                                    "courses_instructor": "haber, eldad",
                                    "courses_avg": 76.47
                                },
                                {
                                    "courses_instructor": "haber, eldad",
                                    "courses_avg": 80.8
                                },
                                {
                                    "courses_instructor": "chapariha, mehrdad",
                                    "courses_avg": 83.9
                                },
                                {
                                    "courses_instructor": "haber, eldad",
                                    "courses_avg": 85
                                },
                                {
                                    "courses_instructor": "haber, eldad",
                                    "courses_avg": 85
                                },
                                {
                                    "courses_instructor": "haber, eldad",
                                    "courses_avg": 89.17
                                },
                                {
                                    "courses_instructor": "haber, eldad",
                                    "courses_avg": 89.5
                                },
                                {
                                    "courses_instructor": "haber, eldad",
                                    "courses_avg": 90.33
                                }
                            ]
                        });
    
                        // expect.fail();
                    })
                    .catch(function (err: InsightResponse) {
                        Log.test('ERROR: ' + err.code);
                        // expect(err.code).to.equal(424);
                        expect.fail();
                    });
            })
            .catch(function (err: InsightResponse) {
                Log.test('ERROR: ' + err.body);
                expect.fail();
            });
    });
    
    
    // Test 13b
    // Specific instructors, full courses string
    it("full courses specific instructors - string*", function () {
        var id: string = "courses";
        this.timeout(10000);
        return insightFacade.addDataset(id, testBase64)
            .then(function (value: InsightResponse) {
                var qr: QueryRequest = {
                    "WHERE": {
                        "IS": {
                            "courses_instructor": "ac*"
                        }
                    },
                    "OPTIONS": {
                        "COLUMNS": [
                            "courses_instructor",
                            "courses_avg"
                        ],
                        "ORDER": "courses_avg",
                        "FORM": "TABLE"
                    }
                };
    
                return insightFacade.performQuery(qr)
                    .then(function (value: InsightResponse) {
                        Log.test("code: " + value.code);
                        // expect(value.code).to.equal(200);
    
                        expect(value.body).to.deep.equal({
                            "render": "TABLE",
                            "result": [{
                                    "courses_instructor": "ackerman, paige adrienne",
                                    "courses_avg": 65.17
                                },
                                {
                                    "courses_instructor": "ackerman, paige adrienne",
                                    "courses_avg": 66.83
                                },
                                {
                                    "courses_instructor": "acton, donald",
                                    "courses_avg": 68.54
                                },
                                {
                                    "courses_instructor": "acton, donald",
                                    "courses_avg": 68.79
                                },
                                {
                                    "courses_instructor": "acton, donald",
                                    "courses_avg": 69.24
                                },
                                {
                                    "courses_instructor": "acton, donald",
                                    "courses_avg": 69.25
                                },
                                {
                                    "courses_instructor": "acton, donald",
                                    "courses_avg": 69.26
                                },
                                {
                                    "courses_instructor": "acton, donald",
                                    "courses_avg": 69.53
                                },
                                {
                                    "courses_instructor": "acton, donald",
                                    "courses_avg": 69.65
                                },
                                {
                                    "courses_instructor": "acton, donald",
                                    "courses_avg": 70.5
                                },
                                {
                                    "courses_instructor": "acton, donald",
                                    "courses_avg": 70.66
                                },
                                {
                                    "courses_instructor": "acton, donald",
                                    "courses_avg": 70.7
                                },
                                {
                                    "courses_instructor": "acton, donald",
                                    "courses_avg": 70.87
                                },
                                {
                                    "courses_instructor": "acton, donald",
                                    "courses_avg": 71.04
                                },
                                {
                                    "courses_instructor": "acton, donald",
                                    "courses_avg": 71.05
                                },
                                {
                                    "courses_instructor": "acton, donald",
                                    "courses_avg": 71.33
                                },
                                {
                                    "courses_instructor": "ackerman, paige adrienne",
                                    "courses_avg": 71.5
                                },
                                {
                                    "courses_instructor": "acton, donald",
                                    "courses_avg": 71.59
                                },
                                {
                                    "courses_instructor": "acton, donald",
                                    "courses_avg": 71.72
                                },
                                {
                                    "courses_instructor": "acton, donald",
                                    "courses_avg": 71.75
                                },
                                {
                                    "courses_instructor": "acton, donald",
                                    "courses_avg": 71.81
                                },
                                {
                                    "courses_instructor": "acton, donald",
                                    "courses_avg": 72
                                },
                                {
                                    "courses_instructor": "acton, donald",
                                    "courses_avg": 72
                                },
                                {
                                    "courses_instructor": "acton, donald",
                                    "courses_avg": 72.18
                                },
                                {
                                    "courses_instructor": "acton, donald",
                                    "courses_avg": 72.23
                                },
                                {
                                    "courses_instructor": "ackerman, paige adrienne",
                                    "courses_avg": 73
                                },
                                {
                                    "courses_instructor": "ackerman, paige adrienne",
                                    "courses_avg": 73
                                },
                                {
                                    "courses_instructor": "acton, donald",
                                    "courses_avg": 73.13
                                },
                                {
                                    "courses_instructor": "acton, donald",
                                    "courses_avg": 73.37
                                },
                                {
                                    "courses_instructor": "acton, donald",
                                    "courses_avg": 73.45
                                },
                                {
                                    "courses_instructor": "ackerman, paige adrienne",
                                    "courses_avg": 74.29
                                },
                                {
                                    "courses_instructor": "ackerman, paige adrienne",
                                    "courses_avg": 75.43
                                },
                                {
                                    "courses_instructor": "ackerman, paige adrienne",
                                    "courses_avg": 75.63
                                },
                                {
                                    "courses_instructor": "acton, donald",
                                    "courses_avg": 76.31
                                },
                                {
                                    "courses_instructor": "ackerman, paige adrienne",
                                    "courses_avg": 76.42
                                },
                                {
                                    "courses_instructor": "ackerman, paige adrienne",
                                    "courses_avg": 76.73
                                },
                                {
                                    "courses_instructor": "ackerman, paige adrienne",
                                    "courses_avg": 77.57
                                },
                                {
                                    "courses_instructor": "ackerman, paige adrienne",
                                    "courses_avg": 78.09
                                },
                                {
                                    "courses_instructor": "ackerman, paige adrienne",
                                    "courses_avg": 79.85
                                },
                                {
                                    "courses_instructor": "ackerman, paige adrienne",
                                    "courses_avg": 80.5
                                },
                                {
                                    "courses_instructor": "ackerman, paige adrienne",
                                    "courses_avg": 81.53
                                },
                                {
                                    "courses_instructor": "ackerman, paige adrienne",
                                    "courses_avg": 82
                                },
                                {
                                    "courses_instructor": "ackerman, paige adrienne",
                                    "courses_avg": 82.4
                                },
                                {
                                    "courses_instructor": "acheson, alison",
                                    "courses_avg": 83.25
                                },
                                {
                                    "courses_instructor": "acheson, alison",
                                    "courses_avg": 83.27
                                },
                                {
                                    "courses_instructor": "ackerman, paige adrienne",
                                    "courses_avg": 84.69
                                },
                                {
                                    "courses_instructor": "accili, eric;allan, douglas;kieffer, tim;kurata, harley;luciani, dan;mason, barry",
                                    "courses_avg": 87.75
                                },
                                {
                                    "courses_instructor": "accili, eric;clee, susanne michelle;horne, andrew;kindler, pawel;kwok, yin nam kenny;osborne, salma;tanentzapf, guy",
                                    "courses_avg": 88.14
                                },
                                {
                                    "courses_instructor": "acheson, alison",
                                    "courses_avg": 95
                                }
                            ]
                        });
    
                        // expect.fail();
                    })
                    .catch(function (err: InsightResponse) {
                        Log.test('ERROR: ' + err.code);
                        // expect(err.code).to.equal(424);
                        expect.fail();
                    });
            })
            .catch(function (err: InsightResponse) {
                Log.test('ERROR: ' + err.body);
                expect.fail();
            });
    });
    
    
    // Test 14b
    // Specific instructors, partial strings *string*
    it("specific instructors (full courses) - *string*", function () {
        var id: string = "courses";
        this.timeout(10000);
        return insightFacade.addDataset(id, testBase64)
            .then(function (value: InsightResponse) {
                var qr: QueryRequest = {
                    "WHERE": {
                        "IS": {
                            "courses_instructor": "*abba*"
                        }
                    },
                    "OPTIONS": {
                        "COLUMNS": [
                            "courses_instructor",
                            "courses_avg"
                        ],
                        "ORDER": "courses_avg",
                        "FORM": "TABLE"
                    }
                };
    
                return insightFacade.performQuery(qr)
                    .then(function (value: InsightResponse) {
                        Log.test("code: " + value.code);
                        expect(value.body).to.deep.equal({
                            "render": "TABLE",
                            "result": [{
                                    "courses_instructor": "abbaspour, hesam",
                                    "courses_avg": 57.32
                                },
                                {
                                    "courses_instructor": "abbaspour, hesam",
                                    "courses_avg": 60.58
                                },
                                {
                                    "courses_instructor": "momeni, abbas",
                                    "courses_avg": 69.88
                                }
                            ]
                        });
                        // expect.fail();
                    })
                    .catch(function (err: InsightResponse) {
                        Log.test('ERROR: ' + err.code);
                        // expect(err.code).to.equal(424);
                        expect.fail();
                    });
            })
            .catch(function (err: InsightResponse) {
                Log.test('ERROR: ' + err.body);
                expect.fail();
            });
    });

/*
    // Test 15
    // Looks for courses with NOT instructor
    it("performQuery with NOT specific instructor", function () {
        var id: string = "courses";
        this.timeout(10000);
        return insightFacade.addDataset(id, testBase64)
            .then(function (value: InsightResponse) {
                var qr: QueryRequest = {
                    "WHERE": {
                        "NOT": {
                            "OR": [{
                                    "IS": {
                                        "courses_instructor": ""
                                    }
                                },
                                {
                                    "IS": {
                                        "courses_instructor": "*e*"
                                    }
                                },
                                {
                                    "IS": {
                                        "courses_instructor": "*a*"
                                    }
                                },
                                {
                                    "IS": {
                                        "courses_instructor": "*i*"
                                    }
                                }
                            ]
                        }
                    },
                    "OPTIONS": {
                        "COLUMNS": [
                            "courses_dept",
                            "courses_avg",
                            "courses_instructor"
                        ],
                        "ORDER": "courses_avg",
                        "FORM": "TABLE"
                    }
                };

                return insightFacade.performQuery(qr)
                    .then(function (value: InsightResponse) {
                        Log.test('code: ' + value.code);
                        expect(value.body).to.deep.equal({
                            "render": "TABLE",
                            "result": [{
                                    "courses_dept": "math",
                                    "courses_avg": 59.32,
                                    "courses_instructor": "wong, tom"
                                },
                                {
                                    "courses_dept": "math",
                                    "courses_avg": 60.17,
                                    "courses_instructor": "luoto, kurt"
                                },
                                {
                                    "courses_dept": "math",
                                    "courses_avg": 63.14,
                                    "courses_instructor": "luoto, kurt"
                                },
                                {
                                    "courses_dept": "math",
                                    "courses_avg": 66.05,
                                    "courses_instructor": "wong, tom"
                                },
                                {
                                    "courses_dept": "hist",
                                    "courses_avg": 66.59,
                                    "courses_instructor": "thrush, coll"
                                },
                                {
                                    "courses_dept": "hist",
                                    "courses_avg": 67.46,
                                    "courses_instructor": "thrush, coll"
                                },
                                {
                                    "courses_dept": "comm",
                                    "courses_avg": 68.27,
                                    "courses_instructor": "gu, jun"
                                },
                                {
                                    "courses_dept": "musc",
                                    "courses_avg": 68.34,
                                    "courses_instructor": "cook, scott"
                                },
                                {
                                    "courses_dept": "hist",
                                    "courses_avg": 68.42,
                                    "courses_instructor": "thrush, coll"
                                },
                                {
                                    "courses_dept": "biol",
                                    "courses_avg": 68.7,
                                    "courses_instructor": "brock, hugh"
                                },
                                {
                                    "courses_dept": "engl",
                                    "courses_avg": 68.73,
                                    "courses_instructor": "brown, judy"
                                },
                                {
                                    "courses_dept": "econ",
                                    "courses_avg": 68.97,
                                    "courses_instructor": "munro, gordon"
                                },
                                {
                                    "courses_dept": "econ",
                                    "courses_avg": 69.08,
                                    "courses_instructor": "munro, gordon"
                                },
                                {
                                    "courses_dept": "comm",
                                    "courses_avg": 69.22,
                                    "courses_instructor": "gu, jun"
                                },
                                {
                                    "courses_dept": "engl",
                                    "courses_avg": 69.29,
                                    "courses_instructor": "brown, judy"
                                },
                                {
                                    "courses_dept": "hist",
                                    "courses_avg": 69.83,
                                    "courses_instructor": "thrush, coll"
                                },
                                {
                                    "courses_dept": "hist",
                                    "courses_avg": 69.92,
                                    "courses_instructor": "thrush, coll"
                                },
                                {
                                    "courses_dept": "phil",
                                    "courses_avg": 70,
                                    "courses_instructor": "woods, john"
                                },
                                {
                                    "courses_dept": "cpsc",
                                    "courses_avg": 70.29,
                                    "courses_instructor": "vuong, son"
                                },
                                {
                                    "courses_dept": "econ",
                                    "courses_avg": 70.33,
                                    "courses_instructor": "munro, gordon"
                                },
                                {
                                    "courses_dept": "geog",
                                    "courses_avg": 70.58,
                                    "courses_instructor": "brown, loch"
                                },
                                {
                                    "courses_dept": "econ",
                                    "courses_avg": 70.62,
                                    "courses_instructor": "munro, gordon"
                                },
                                {
                                    "courses_dept": "math",
                                    "courses_avg": 70.64,
                                    "courses_instructor": "luoto, kurt"
                                },
                                {
                                    "courses_dept": "math",
                                    "courses_avg": 70.93,
                                    "courses_instructor": "homsy, bud"
                                },
                                {
                                    "courses_dept": "econ",
                                    "courses_avg": 71,
                                    "courses_instructor": "munro, gordon"
                                },
                                {
                                    "courses_dept": "engl",
                                    "courses_avg": 71.26,
                                    "courses_instructor": "brown, judy"
                                },
                                {
                                    "courses_dept": "engl",
                                    "courses_avg": 71.27,
                                    "courses_instructor": "brown, judy"
                                },
                                {
                                    "courses_dept": "econ",
                                    "courses_avg": 71.42,
                                    "courses_instructor": "munro, gordon"
                                },
                                {
                                    "courses_dept": "geog",
                                    "courses_avg": 71.66,
                                    "courses_instructor": "brown, loch"
                                },
                                {
                                    "courses_dept": "geog",
                                    "courses_avg": 71.9,
                                    "courses_instructor": "brown, loch"
                                },
                                {
                                    "courses_dept": "hist",
                                    "courses_avg": 72.24,
                                    "courses_instructor": "thrush, coll"
                                },
                                {
                                    "courses_dept": "engl",
                                    "courses_avg": 72.38,
                                    "courses_instructor": "brown, judy"
                                },
                                {
                                    "courses_dept": "civl",
                                    "courses_avg": 72.64,
                                    "courses_instructor": "sully, john"
                                },
                                {
                                    "courses_dept": "engl",
                                    "courses_avg": 72.7,
                                    "courses_instructor": "brown, judy"
                                },
                                {
                                    "courses_dept": "geog",
                                    "courses_avg": 72.72,
                                    "courses_instructor": "brown, loch"
                                },
                                {
                                    "courses_dept": "engl",
                                    "courses_avg": 72.75,
                                    "courses_instructor": "brown, judy"
                                },
                                {
                                    "courses_dept": "econ",
                                    "courses_avg": 72.8,
                                    "courses_instructor": "munro, gordon"
                                },
                                {
                                    "courses_dept": "hist",
                                    "courses_avg": 72.93,
                                    "courses_instructor": "thrush, coll"
                                },
                                {
                                    "courses_dept": "engl",
                                    "courses_avg": 73,
                                    "courses_instructor": "brown, judy"
                                },
                                {
                                    "courses_dept": "geog",
                                    "courses_avg": 73.04,
                                    "courses_instructor": "brown, loch"
                                },
                                {
                                    "courses_dept": "econ",
                                    "courses_avg": 73.07,
                                    "courses_instructor": "munro, gordon"
                                },
                                {
                                    "courses_dept": "engl",
                                    "courses_avg": 73.11,
                                    "courses_instructor": "brown, judy"
                                },
                                {
                                    "courses_dept": "engl",
                                    "courses_avg": 73.17,
                                    "courses_instructor": "gooch, b"
                                },
                                {
                                    "courses_dept": "engl",
                                    "courses_avg": 73.2,
                                    "courses_instructor": "brown, judy"
                                },
                                {
                                    "courses_dept": "engl",
                                    "courses_avg": 73.28,
                                    "courses_instructor": "brown, judy"
                                },
                                {
                                    "courses_dept": "econ",
                                    "courses_avg": 73.31,
                                    "courses_instructor": "munro, gordon"
                                },
                                {
                                    "courses_dept": "engl",
                                    "courses_avg": 73.34,
                                    "courses_instructor": "brown, judy"
                                },
                                {
                                    "courses_dept": "biol",
                                    "courses_avg": 73.38,
                                    "courses_instructor": "brock, hugh"
                                },
                                {
                                    "courses_dept": "phar",
                                    "courses_avg": 73.4,
                                    "courses_instructor": "wong, judy"
                                },
                                {
                                    "courses_dept": "engl",
                                    "courses_avg": 73.44,
                                    "courses_instructor": "brown, judy"
                                },
                                {
                                    "courses_dept": "comm",
                                    "courses_avg": 73.53,
                                    "courses_instructor": "gu, jun"
                                },
                                {
                                    "courses_dept": "econ",
                                    "courses_avg": 73.56,
                                    "courses_instructor": "munro, gordon"
                                },
                                {
                                    "courses_dept": "comm",
                                    "courses_avg": 73.56,
                                    "courses_instructor": "gu, jun"
                                },
                                {
                                    "courses_dept": "geog",
                                    "courses_avg": 73.69,
                                    "courses_instructor": "brown, loch"
                                },
                                {
                                    "courses_dept": "engl",
                                    "courses_avg": 73.78,
                                    "courses_instructor": "gooch, b"
                                },
                                {
                                    "courses_dept": "geog",
                                    "courses_avg": 73.82,
                                    "courses_instructor": "brown, loch"
                                },
                                {
                                    "courses_dept": "geog",
                                    "courses_avg": 73.86,
                                    "courses_instructor": "brown, loch"
                                },
                                {
                                    "courses_dept": "econ",
                                    "courses_avg": 73.9,
                                    "courses_instructor": "munro, gordon"
                                },
                                {
                                    "courses_dept": "engl",
                                    "courses_avg": 73.91,
                                    "courses_instructor": "brown, judy"
                                },
                                {
                                    "courses_dept": "engl",
                                    "courses_avg": 73.94,
                                    "courses_instructor": "brown, judy"
                                },
                                {
                                    "courses_dept": "econ",
                                    "courses_avg": 74.05,
                                    "courses_instructor": "song, kyungchul"
                                },
                                {
                                    "courses_dept": "engl",
                                    "courses_avg": 74.12,
                                    "courses_instructor": "brown, judy"
                                },
                                {
                                    "courses_dept": "hist",
                                    "courses_avg": 74.12,
                                    "courses_instructor": "thrush, coll"
                                },
                                {
                                    "courses_dept": "econ",
                                    "courses_avg": 74.12,
                                    "courses_instructor": "song, unjy"
                                },
                                {
                                    "courses_dept": "engl",
                                    "courses_avg": 74.12,
                                    "courses_instructor": "brown, judy"
                                },
                                {
                                    "courses_dept": "hist",
                                    "courses_avg": 74.46,
                                    "courses_instructor": "thrush, coll"
                                },
                                {
                                    "courses_dept": "econ",
                                    "courses_avg": 74.5,
                                    "courses_instructor": "song, unjy"
                                },
                                {
                                    "courses_dept": "geog",
                                    "courses_avg": 74.51,
                                    "courses_instructor": "brown, loch"
                                },
                                {
                                    "courses_dept": "geog",
                                    "courses_avg": 74.51,
                                    "courses_instructor": "brown, loch"
                                },
                                {
                                    "courses_dept": "econ",
                                    "courses_avg": 74.61,
                                    "courses_instructor": "munro, gordon"
                                },
                                {
                                    "courses_dept": "math",
                                    "courses_avg": 75.01,
                                    "courses_instructor": "homsy, bud"
                                },
                                {
                                    "courses_dept": "geog",
                                    "courses_avg": 75.03,
                                    "courses_instructor": "brown, loch"
                                },
                                {
                                    "courses_dept": "engl",
                                    "courses_avg": 75.06,
                                    "courses_instructor": "brown, judy"
                                },
                                {
                                    "courses_dept": "econ",
                                    "courses_avg": 75.18,
                                    "courses_instructor": "song, kyungchul"
                                },
                                {
                                    "courses_dept": "econ",
                                    "courses_avg": 75.25,
                                    "courses_instructor": "munro, gordon"
                                },
                                {
                                    "courses_dept": "econ",
                                    "courses_avg": 75.31,
                                    "courses_instructor": "song, kyungchul"
                                },
                                {
                                    "courses_dept": "econ",
                                    "courses_avg": 75.37,
                                    "courses_instructor": "munro, gordon"
                                },
                                {
                                    "courses_dept": "hist",
                                    "courses_avg": 75.59,
                                    "courses_instructor": "thrush, coll"
                                },
                                {
                                    "courses_dept": "hist",
                                    "courses_avg": 75.68,
                                    "courses_instructor": "thrush, coll"
                                },
                                {
                                    "courses_dept": "engl",
                                    "courses_avg": 75.68,
                                    "courses_instructor": "brown, judy"
                                },
                                {
                                    "courses_dept": "econ",
                                    "courses_avg": 75.71,
                                    "courses_instructor": "munro, gordon"
                                },
                                {
                                    "courses_dept": "geog",
                                    "courses_avg": 75.89,
                                    "courses_instructor": "brown, loch"
                                },
                                {
                                    "courses_dept": "econ",
                                    "courses_avg": 75.92,
                                    "courses_instructor": "munro, gordon"
                                },
                                {
                                    "courses_dept": "geog",
                                    "courses_avg": 75.93,
                                    "courses_instructor": "brown, loch"
                                },
                                {
                                    "courses_dept": "geog",
                                    "courses_avg": 75.97,
                                    "courses_instructor": "brown, loch"
                                },
                                {
                                    "courses_dept": "engl",
                                    "courses_avg": 76.06,
                                    "courses_instructor": "brown, judy"
                                },
                                {
                                    "courses_dept": "hist",
                                    "courses_avg": 76.11,
                                    "courses_instructor": "thrush, coll"
                                },
                                {
                                    "courses_dept": "geog",
                                    "courses_avg": 76.11,
                                    "courses_instructor": "zhu, yushu"
                                },
                                {
                                    "courses_dept": "biol",
                                    "courses_avg": 76.15,
                                    "courses_instructor": "brock, hugh"
                                },
                                {
                                    "courses_dept": "mech",
                                    "courses_avg": 76.24,
                                    "courses_instructor": "homsy, bud"
                                },
                                {
                                    "courses_dept": "geog",
                                    "courses_avg": 76.64,
                                    "courses_instructor": "brown, loch"
                                },
                                {
                                    "courses_dept": "comm",
                                    "courses_avg": 76.74,
                                    "courses_instructor": "south, cluny"
                                },
                                {
                                    "courses_dept": "phar",
                                    "courses_avg": 76.79,
                                    "courses_instructor": "wong, judy"
                                },
                                {
                                    "courses_dept": "musc",
                                    "courses_avg": 77.19,
                                    "courses_instructor": "cook, scott"
                                },
                                {
                                    "courses_dept": "comm",
                                    "courses_avg": 77.2,
                                    "courses_instructor": "gu, jun"
                                },
                                {
                                    "courses_dept": "geog",
                                    "courses_avg": 77.47,
                                    "courses_instructor": "brown, loch"
                                },
                                {
                                    "courses_dept": "engl",
                                    "courses_avg": 77.59,
                                    "courses_instructor": "brown, judy"
                                },
                                {
                                    "courses_dept": "engl",
                                    "courses_avg": 77.67,
                                    "courses_instructor": "brown, judy"
                                },
                                {
                                    "courses_dept": "engl",
                                    "courses_avg": 77.71,
                                    "courses_instructor": "brown, judy"
                                },
                                {
                                    "courses_dept": "comm",
                                    "courses_avg": 77.96,
                                    "courses_instructor": "gu, jun"
                                },
                                {
                                    "courses_dept": "mech",
                                    "courses_avg": 77.97,
                                    "courses_instructor": "homsy, bud"
                                },
                                {
                                    "courses_dept": "path",
                                    "courses_avg": 78,
                                    "courses_instructor": "o'kusky, john"
                                },
                                {
                                    "courses_dept": "engl",
                                    "courses_avg": 78.06,
                                    "courses_instructor": "brown, judy"
                                },
                                {
                                    "courses_dept": "geog",
                                    "courses_avg": 78.12,
                                    "courses_instructor": "brown, loch"
                                },
                                {
                                    "courses_dept": "geog",
                                    "courses_avg": 78.67,
                                    "courses_instructor": "zhu, yushu"
                                },
                                {
                                    "courses_dept": "engl",
                                    "courses_avg": 78.71,
                                    "courses_instructor": "brown, judy"
                                },
                                {
                                    "courses_dept": "econ",
                                    "courses_avg": 78.81,
                                    "courses_instructor": "song, kyungchul"
                                },
                                {
                                    "courses_dept": "phar",
                                    "courses_avg": 78.92,
                                    "courses_instructor": "wong, judy"
                                },
                                {
                                    "courses_dept": "engl",
                                    "courses_avg": 79,
                                    "courses_instructor": "brown, judy"
                                },
                                {
                                    "courses_dept": "econ",
                                    "courses_avg": 79.05,
                                    "courses_instructor": "song, kyungchul"
                                },
                                {
                                    "courses_dept": "path",
                                    "courses_avg": 79.29,
                                    "courses_instructor": "o'kusky, john"
                                },
                                {
                                    "courses_dept": "geog",
                                    "courses_avg": 79.72,
                                    "courses_instructor": "brown, loch"
                                },
                                {
                                    "courses_dept": "math",
                                    "courses_avg": 80.08,
                                    "courses_instructor": "homsy, bud"
                                },
                                {
                                    "courses_dept": "path",
                                    "courses_avg": 80.67,
                                    "courses_instructor": "o'kusky, john"
                                },
                                {
                                    "courses_dept": "econ",
                                    "courses_avg": 80.72,
                                    "courses_instructor": "song, unjy"
                                },
                                {
                                    "courses_dept": "econ",
                                    "courses_avg": 80.87,
                                    "courses_instructor": "song, kyungchul"
                                },
                                {
                                    "courses_dept": "geog",
                                    "courses_avg": 81.25,
                                    "courses_instructor": "brown, loch"
                                },
                                {
                                    "courses_dept": "phar",
                                    "courses_avg": 81.62,
                                    "courses_instructor": "wong, judy"
                                },
                                {
                                    "courses_dept": "arch",
                                    "courses_avg": 81.67,
                                    "courses_instructor": "osborn, tony"
                                },
                                {
                                    "courses_dept": "econ",
                                    "courses_avg": 81.72,
                                    "courses_instructor": "song, unjy"
                                },
                                {
                                    "courses_dept": "econ",
                                    "courses_avg": 81.95,
                                    "courses_instructor": "song, unjy"
                                },
                                {
                                    "courses_dept": "econ",
                                    "courses_avg": 82.38,
                                    "courses_instructor": "song, kyungchul"
                                },
                                {
                                    "courses_dept": "econ",
                                    "courses_avg": 82.65,
                                    "courses_instructor": "song, kyungchul"
                                },
                                {
                                    "courses_dept": "phar",
                                    "courses_avg": 83.06,
                                    "courses_instructor": "wong, judy"
                                },
                                {
                                    "courses_dept": "econ",
                                    "courses_avg": 83.4,
                                    "courses_instructor": "song, kyungchul"
                                },
                                {
                                    "courses_dept": "phar",
                                    "courses_avg": 83.44,
                                    "courses_instructor": "wong, judy"
                                },
                                {
                                    "courses_dept": "econ",
                                    "courses_avg": 83.58,
                                    "courses_instructor": "song, kyungchul"
                                },
                                {
                                    "courses_dept": "econ",
                                    "courses_avg": 83.63,
                                    "courses_instructor": "song, unjy"
                                },
                                {
                                    "courses_dept": "cpsc",
                                    "courses_avg": 83.78,
                                    "courses_instructor": "vuong, son"
                                },
                                {
                                    "courses_dept": "econ",
                                    "courses_avg": 83.94,
                                    "courses_instructor": "song, kyungchul"
                                },
                                {
                                    "courses_dept": "econ",
                                    "courses_avg": 84.3,
                                    "courses_instructor": "song, kyungchul"
                                },
                                {
                                    "courses_dept": "phar",
                                    "courses_avg": 84.44,
                                    "courses_instructor": "wong, judy"
                                },
                                {
                                    "courses_dept": "econ",
                                    "courses_avg": 84.57,
                                    "courses_instructor": "song, unjy"
                                },
                                {
                                    "courses_dept": "cnps",
                                    "courses_avg": 84.7,
                                    "courses_instructor": "gofton, lucy"
                                },
                                {
                                    "courses_dept": "obst",
                                    "courses_avg": 84.71,
                                    "courses_instructor": "moon, young"
                                },
                                {
                                    "courses_dept": "phar",
                                    "courses_avg": 84.78,
                                    "courses_instructor": "wong, judy"
                                },
                                {
                                    "courses_dept": "phar",
                                    "courses_avg": 85.29,
                                    "courses_instructor": "wong, judy"
                                },
                                {
                                    "courses_dept": "phar",
                                    "courses_avg": 85.29,
                                    "courses_instructor": "wong, judy"
                                },
                                {
                                    "courses_dept": "cnps",
                                    "courses_avg": 85.57,
                                    "courses_instructor": "mccullough, lucy"
                                },
                                {
                                    "courses_dept": "cnps",
                                    "courses_avg": 85.93,
                                    "courses_instructor": "gofton, lucy"
                                },
                                {
                                    "courses_dept": "hist",
                                    "courses_avg": 86.25,
                                    "courses_instructor": "thrush, coll"
                                },
                                {
                                    "courses_dept": "cnps",
                                    "courses_avg": 86.39,
                                    "courses_instructor": "gofton, lucy"
                                },
                                {
                                    "courses_dept": "mech",
                                    "courses_avg": 86.74,
                                    "courses_instructor": "homsy, bud"
                                },
                                {
                                    "courses_dept": "arch",
                                    "courses_avg": 87.5,
                                    "courses_instructor": "osborn, tony"
                                },
                                {
                                    "courses_dept": "econ",
                                    "courses_avg": 87.89,
                                    "courses_instructor": "song, kyungchul"
                                },
                                {
                                    "courses_dept": "educ",
                                    "courses_avg": 88.67,
                                    "courses_instructor": "krug, don"
                                },
                                {
                                    "courses_dept": "cnps",
                                    "courses_avg": 88.83,
                                    "courses_instructor": "gofton, lucy"
                                },
                                {
                                    "courses_dept": "econ",
                                    "courses_avg": 89.25,
                                    "courses_instructor": "song, unjy"
                                },
                                {
                                    "courses_dept": "edcp",
                                    "courses_avg": 90.57,
                                    "courses_instructor": "krug, don"
                                },
                                {
                                    "courses_dept": "edcp",
                                    "courses_avg": 90.67,
                                    "courses_instructor": "krug, don"
                                },
                                {
                                    "courses_dept": "epse",
                                    "courses_avg": 90.8,
                                    "courses_instructor": "zumbo, bruno"
                                },
                                {
                                    "courses_dept": "edcp",
                                    "courses_avg": 91.47,
                                    "courses_instructor": "krug, don"
                                },
                                {
                                    "courses_dept": "epse",
                                    "courses_avg": 91.64,
                                    "courses_instructor": "zumbo, bruno"
                                },
                                {
                                    "courses_dept": "epse",
                                    "courses_avg": 91.65,
                                    "courses_instructor": "zumbo, bruno"
                                },
                                {
                                    "courses_dept": "educ",
                                    "courses_avg": 92,
                                    "courses_instructor": "krug, don"
                                },
                                {
                                    "courses_dept": "phys",
                                    "courses_avg": 92.2,
                                    "courses_instructor": "ng, john"
                                },
                                {
                                    "courses_dept": "epse",
                                    "courses_avg": 93.68,
                                    "courses_instructor": "zumbo, bruno"
                                },
                                {
                                    "courses_dept": "epse",
                                    "courses_avg": 94.14,
                                    "courses_instructor": "zumbo, bruno"
                                },
                                {
                                    "courses_dept": "epse",
                                    "courses_avg": 94.44,
                                    "courses_instructor": "zumbo, bruno"
                                },
                                {
                                    "courses_dept": "epse",
                                    "courses_avg": 94.47,
                                    "courses_instructor": "zumbo, bruno"
                                },
                                {
                                    "courses_dept": "epse",
                                    "courses_avg": 94.69,
                                    "courses_instructor": "zumbo, bruno"
                                },
                                {
                                    "courses_dept": "epse",
                                    "courses_avg": 95,
                                    "courses_instructor": "zumbo, bruno"
                                }
                            ]
                        })
                        // expect.fail();
                    })
                    .catch(function (value: InsightResponse) {
                        Log.test('code: ' + value.code);
                        expect(value.code).to.equal(400);
                        // expect.fail();
                    });
            })
            .catch(function (err: InsightResponse) {
                Log.test('ERROR: ' + err.body);
                expect.fail();
            });
    });


    // Test 17
    // tries Complex query with AND, EQ, and GT
    it("Complex query with AND, EQ, and GT", function () {
        var id: string = "courses";
        this.timeout(10000);
        return insightFacade.addDataset(id, testBase64)
            .then(function (value: InsightResponse) {
                var qr: QueryRequest = {
                    "WHERE": {
                        "AND": [{
                                "EQ": {
                                    "courses_avg": 91.33
                                }
                            },
                            {
                                "GT": {
                                    "courses_avg": 90
                                }
                            }
                        ]
                    },
                    "OPTIONS": {
                        "COLUMNS": [
                            "courses_dept",
                            "courses_id",
                            "courses_avg"
                        ],
                        "ORDER": "courses_avg",
                        "FORM": "TABLE"
                    }
                };

                return insightFacade.performQuery(qr)
                    .then(function (value: InsightResponse) {
                        Log.test("code: " + value.code);
                        // Log.test("body: " + JSON.stringify(value.body));
                        // expect(value.code).to.equal(200);
                        // expect(value.code).to.equal(200);
                        
                        expect(value.body).to.deep.equal({
                            "render": "TABLE",
                            "result": [{
                                    "courses_dept": "epse",
                                    "courses_id": "526",
                                    "courses_avg": 91.33
                                },
                                {
                                    "courses_dept": "adhe",
                                    "courses_id": "330",
                                    "courses_avg": 91.33
                                },
                                {
                                    "courses_dept": "audi",
                                    "courses_id": "593",
                                    "courses_avg": 91.33
                                },
                                {
                                    "courses_dept": "audi",
                                    "courses_id": "593",
                                    "courses_avg": 91.33
                                },
                                {
                                    "courses_dept": "chem",
                                    "courses_id": "533",
                                    "courses_avg": 91.33
                                },
                                {
                                    "courses_dept": "chem",
                                    "courses_id": "533",
                                    "courses_avg": 91.33
                                },
                                {
                                    "courses_dept": "cnps",
                                    "courses_id": "524",
                                    "courses_avg": 91.33
                                },
                                {
                                    "courses_dept": "cnps",
                                    "courses_id": "524",
                                    "courses_avg": 91.33
                                },
                                {
                                    "courses_dept": "cnps",
                                    "courses_id": "586",
                                    "courses_avg": 91.33
                                },
                                {
                                    "courses_dept": "cnps",
                                    "courses_id": "594",
                                    "courses_avg": 91.33
                                },
                                {
                                    "courses_dept": "cnps",
                                    "courses_id": "594",
                                    "courses_avg": 91.33
                                },
                                {
                                    "courses_dept": "eece",
                                    "courses_id": "597",
                                    "courses_avg": 91.33
                                },
                                {
                                    "courses_dept": "epse",
                                    "courses_id": "431",
                                    "courses_avg": 91.33
                                },
                                {
                                    "courses_dept": "epse",
                                    "courses_id": "431",
                                    "courses_avg": 91.33
                                },
                                {
                                    "courses_dept": "adhe",
                                    "courses_id": "330",
                                    "courses_avg": 91.33
                                },
                                {
                                    "courses_dept": "epse",
                                    "courses_id": "526",
                                    "courses_avg": 91.33
                                },
                                {
                                    "courses_dept": "epse",
                                    "courses_id": "606",
                                    "courses_avg": 91.33
                                },
                                {
                                    "courses_dept": "etec",
                                    "courses_id": "510",
                                    "courses_avg": 91.33
                                },
                                {
                                    "courses_dept": "hunu",
                                    "courses_id": "505",
                                    "courses_avg": 91.33
                                },
                                {
                                    "courses_dept": "hunu",
                                    "courses_id": "505",
                                    "courses_avg": 91.33
                                },
                                {
                                    "courses_dept": "math",
                                    "courses_id": "425",
                                    "courses_avg": 91.33
                                },
                                {
                                    "courses_dept": "math",
                                    "courses_id": "425",
                                    "courses_avg": 91.33
                                },
                                {
                                    "courses_dept": "nurs",
                                    "courses_id": "338",
                                    "courses_avg": 91.33
                                },
                                {
                                    "courses_dept": "nurs",
                                    "courses_id": "338",
                                    "courses_avg": 91.33
                                },
                                {
                                    "courses_dept": "phys",
                                    "courses_id": "508",
                                    "courses_avg": 91.33
                                },
                                {
                                    "courses_dept": "phys",
                                    "courses_id": "508",
                                    "courses_avg": 91.33
                                },
                                {
                                    "courses_dept": "psyc",
                                    "courses_id": "542",
                                    "courses_avg": 91.33
                                },
                                {
                                    "courses_dept": "psyc",
                                    "courses_id": "542",
                                    "courses_avg": 91.33
                                }
                            ]
                        })
                        
                        // expect.fail();
                    })
                    .catch(function (err: InsightResponse) {
                        Log.test('ERROR: ' + err.code);
                        // expect(err.code).to.equal(400);
                        expect.fail();
                    });
            })
            .catch(function (err: InsightResponse) {
                Log.test('ERROR: ' + err.body);
                expect.fail();
            });
    });


    // Test 18
    // A query with sort not in columns
    it("performQuery with SORT not in COLUMNS", function () {
        var id: string = "courses";
        this.timeout(10000);
        return insightFacade.addDataset(id, testBase64)
            .then(function (value: InsightResponse) {
                var qr: QueryRequest = {
                    "WHERE": {
                        "NOT": {
                            "OR": [{
                                    "GT": {
                                        "courses_avg":85
                                    }
                                },
                                {
                                    "LT": {
                                        "courses_avg":99
                                    }
                                }
                            ]
                        }
                    },
                    "OPTIONS": {
                        "COLUMNS": [
                            "courses_dept",
                            "courses_professor"
                        ],
                        "ORDER": "courses_avg",
                        "FORM": "TABLE"
                    }
                };

                return insightFacade.performQuery(qr)
                    .then(function (value: InsightResponse) {
                        Log.test("Value.code: " + value.code);
                        // expect(value.code).to.equal(204);
                        expect.fail();
                    })
                    .catch(function (err: InsightResponse) {
                        Log.test('ERROR: ' + JSON.stringify(err.body));
                        expect(err.code).to.equal(400);
                    });
            })
            .catch(function (err: InsightResponse) {
                Log.test('ERROR: ' + JSON.stringify(err.body));
                expect.fail();
            });
    });


    // Test 19
    // Query with non-string keys in WHERE
    it("performQuery with non-string keys in WHERE", function () {
        var id: string = "courses";
        this.timeout(10000);
        return insightFacade.addDataset(id, testBase64)
            .then(function (value: InsightResponse) {
                var qr: any = {
                    "WHERE": {
                        "AND": [{
                                "GT": {
                                    2:0
                                }
                            },
                            {
                                "LT": {
                                    "courses_avg":100
                                }
                            }
                        ]
                    },
                    "OPTIONS": {
                        "COLUMNS": [
                            "courses_dept",
                            "courses_avg"
                        ],
                        "ORDER": "courses_avg",
                        "FORM": "TABLE"
                    }
                };

                return insightFacade.performQuery(qr)
                    .then(function (value: InsightResponse) {
                        Log.test("Value.code: " + value.code);
                        // expect(value.code).to.equal(204);
                        expect.fail();
                    })
                    .catch(function (err: InsightResponse) {
                        Log.test('valid body: ' + JSON.stringify(err.body));
                        expect(err.code).to.equal(400);
                    });
            })
            .catch(function (err: InsightResponse) {
                Log.test('addDataset ERROR: ' + JSON.stringify(err.body));
                expect.fail();
            });
    });


    // Test 20
    // Query with non-string keys in OPTIONS
    it("performQuery with non-string keys in OPTIONS", function () {
        var id: string = "courses";
        this.timeout(10000);
        return insightFacade.addDataset(id, testBase64)
            .then(function (value: InsightResponse) {
                var qr: QueryRequest = {
                    "WHERE": {
                        "AND": [{
                                "GT": {
                                    "courses_avg":95
                                }
                            },
                            {
                                "LT": {
                                    "courses_avg":90
                                }
                            }
                        ]
                    },
                    "OPTIONS": {
                        "COLUMNS": [
                            2,
                            "courses_avg"
                        ],
                        "ORDER": "courses_avg",
                        "FORM": "TABLE"
                    }
                };

                return insightFacade.performQuery(qr)
                    .then(function (value: InsightResponse) {
                        Log.test("Value.code: " + value.code);
                        // expect(value.code).to.equal(204);
                        expect.fail();
                    })
                    .catch(function (err: InsightResponse) {
                        Log.test('ERROR: ' + JSON.stringify(err.body));
                        expect(err.code).to.equal(400);
                    });
            })
            .catch(function (err: InsightResponse) {
                Log.test('ERROR: ' + err.body);
                expect.fail();
            });
    });


    // Test 21
    // Query with non-valid property in query (no WHERE)
    it("performQuery with non-valid property in query (no WHERE)", function () {
        var id: string = "courses";
        this.timeout(10000);
        return insightFacade.addDataset(id, testBase64)
            .then(function (value: InsightResponse) {
                var qr: any = {
                    "HERE": {
                        "AND": [{
                                "GT": {
                                    "courses_avg":95
                                }
                            },
                            {
                                "LT": {
                                    "courses_avg":90
                                }
                            }
                        ]
                    },
                    "OPTIONS": {
                        "COLUMNS": [
                            "courses_dept",
                            "courses_avg"
                        ],
                        "ORDER": "courses_avg",
                        "FORM": "TABLE"
                    }
                };

                return insightFacade.performQuery(qr)
                    .then(function (value: InsightResponse) {
                        Log.test("Value.code: " + value.code);
                        // expect(value.code).to.equal(204);
                        expect.fail();
                    })
                    .catch(function (err: InsightResponse) {
                        Log.test('ERROR: ' + JSON.stringify(err.body));
                        expect(err.code).to.equal(400);
                    });
            })
            .catch(function (err: InsightResponse) {
                Log.test('ERROR: ' + err.body);
                expect.fail();
            });
    });
*/
});

