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

describe("InsightFacadeD2Spec", function () {

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
        try {
            testBase64 = base64_encode("test/rooms.zip");
        } catch (e) {
            Log.trace("e = " + e);
        }

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

    // // Test 1
    // // Add single rooms set
    // it("addDataset with rooms base64 zip, should return code 204", function () {
    //     var id: string = "rooms";
    //     this.timeout(100000);
    //     return insightFacade.addDataset(id, testBase64)
    //         .then(function (value: InsightResponse) {
    //             Log.test("Value.code: " + value.code);
    //             expect(value.code).to.equal(204);
    //         })
    //         .catch(function (err: InsightResponse) {
    //             Log.test('ERROR: ' + JSON.stringify(err.body));
    //             expect.fail();
    //         });
    // });


    // Test 2
    // A simple query (from d2 page)
    it("performQuery with a simple query A", function () {
        var id: string = "rooms";
        this.timeout(10000);
        return insightFacade.addDataset(id, testBase64)
            .then(function (value: InsightResponse) {
                var qr: any = {
                    "WHERE": {
                        "IS": {
                            "rooms_name": "DMP_*"
                        }
                    },
                    "OPTIONS": {
                        "COLUMNS": [
                            "rooms_name"
                        ],
                        "ORDER": "rooms_name",
                        "FORM": "TABLE"
                    }
                };

                return insightFacade.performQuery(qr)
                    .then(function (value: InsightResponse) {
                        // Log.trace("Test done: " + value.code + ", " + JSON.stringify(value.body));
                        // expect(value.code).to.equal(200);

                        expect(value.body).to.deep.equal({
                            "render": "TABLE",
                            "result": [{
                                "rooms_name": "DMP_101"
                            }, {
                                "rooms_name": "DMP_110"
                            }, {
                                "rooms_name": "DMP_201"
                            }, {
                                "rooms_name": "DMP_301"
                            }, {
                                "rooms_name": "DMP_310"
                            }]
                        });

                    })
                    .catch(function (err: InsightResponse) {
                        Log.trace("Test failed: " + err.code + ", " + JSON.stringify(err.body));
                        expect.fail();
                    })
            })
            .catch(function (err: InsightResponse) {
                Log.test('ERROR: ' + err.body);
                expect.fail();
            });
    });


    // Test 3
    // A simple query (from d2 page)
    it("performQuery with a simple query B", function () {
        var id: string = "rooms";
        this.timeout(10000);
        return insightFacade.addDataset(id, testBase64)
            .then(function (value: InsightResponse) {
                var qr: any = {
                    "WHERE": {
                        "IS": {
                            "rooms_address": "*Agrono*"
                        }
                    },
                    "OPTIONS": {
                        "COLUMNS": [
                            "rooms_address", "rooms_name"
                        ],
                        "FORM": "TABLE"
                    }
                };

                return insightFacade.performQuery(qr)
                    .then(function (value: InsightResponse) {
                        // Log.trace("Test done: " + value.code + ", " + JSON.stringify(value.body));
                        expect(value.code).to.equal(200);

                    })
                    .catch(function (err: InsightResponse) {
                        Log.trace("Test failed: " + err.code + ", " + JSON.stringify(err.body));
                        expect.fail();
                    })
            })
            .catch(function (err: InsightResponse) {
                Log.test('ERROR: ' + err.body);
                expect.fail();
            });
    });

    // Test 3
    // A simple query (from d2 page) with ORDER
    it("performQuery with a simple query B + ORDER", function () {
        var id: string = "rooms";
        this.timeout(10000);
        return insightFacade.addDataset(id, testBase64)
            .then(function (value: InsightResponse) {
                var qr: any = {
                    "WHERE": {
                        "IS": {
                            "rooms_address": "*Agrono*"
                        }
                    },
                    "OPTIONS": {
                        "COLUMNS": [
                            "rooms_address", "rooms_name"
                        ],
                        "ORDER": "rooms_name",
                        "FORM": "TABLE"
                    }
                };

                return insightFacade.performQuery(qr)
                    .then(function (value: InsightResponse) {
                        // Log.trace("Test done: " + value.code + ", " + JSON.stringify(value.body));
                        // expect(value.code).to.equal(200);

                        expect(value.body).to.deep.equal({
                            "render": "TABLE",
                            "result": [{
                                "rooms_address": "6245 Agronomy Road V6T 1Z4",
                                "rooms_name": "DMP_101"
                            },
                            {
                                "rooms_address": "6245 Agronomy Road V6T 1Z4",
                                "rooms_name": "DMP_110"
                            },
                            {
                                "rooms_address": "6245 Agronomy Road V6T 1Z4",
                                "rooms_name": "DMP_201"
                            },
                            {
                                "rooms_address": "6245 Agronomy Road V6T 1Z4",
                                "rooms_name": "DMP_301"
                            },
                            {
                                "rooms_address": "6245 Agronomy Road V6T 1Z4",
                                "rooms_name": "DMP_310"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_1001"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_3002"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_3004"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_3016"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_3018"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_3052"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_3058"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_3062"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_3068"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_3072"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_3074"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_4002"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_4004"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_4016"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_4018"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_4052"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_4058"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_4062"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_4068"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_4072"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_4074"
                            }
                            ]
                        });

                    })
                    .catch(function (err: InsightResponse) {
                        Log.trace("Test failed: " + err.code + ", " + JSON.stringify(err.body));
                        expect.fail();
                    })
            })
            .catch(function (err: InsightResponse) {
                Log.test('ERROR: ' + err.body);
                expect.fail();
            });
    });

    // Test 3B
    // A simple query (from d2 page) with ORDER
    it("performQuery with no WHERE", function () {
        var id: string = "rooms";
        this.timeout(10000);
        return insightFacade.addDataset(id, testBase64)
            .then(function (value: InsightResponse) {
                var qr: any = {
                    "WHERE": {},
                    "OPTIONS": {
                        "COLUMNS": [
                            "rooms_address", "rooms_name"
                        ],
                        "ORDER": "rooms_name",
                        "FORM": "TABLE"
                    }
                };

                return insightFacade.performQuery(qr)
                    .then(function (value: InsightResponse) {
                        // Log.trace("Test done: " + value.code + ", " + JSON.stringify(value.body));
                        expect(value.code).to.equal(200);

                    })
                    .catch(function (err: InsightResponse) {
                        Log.trace("Test failed: " + err.code + ", " + JSON.stringify(err.body));
                        expect.fail();
                    })
            })
            .catch(function (err: InsightResponse) {
                Log.test('ERROR: ' + err.body);
                expect.fail();
            });
    });


    // Test 4
    // A simple query (from d3 page)
    it("performQuery with a simple D3 Query", function () {
        var id: string = "rooms";
        this.timeout(10000);
        return insightFacade.addDataset(id, testBase64)
            .then(function (value: InsightResponse) {
                var qr: any = {
                    "WHERE": {
                        "AND": [{
                            "IS": {
                                "rooms_furniture": "*Tables*"
                            }
                        }, {
                            "GT": {
                                "rooms_seats": 300
                            }
                        }]
                    },
                    "OPTIONS": {
                        "COLUMNS": [
                            "rooms_shortname",
                            "maxSeats"
                        ],
                        "ORDER": {
                            "dir": "DOWN",
                            "keys": ["maxSeats"]
                        },
                        "FORM": "TABLE"
                    },
                    "TRANSFORMATIONS": {
                        "GROUP": ["rooms_shortname"],
                        "APPLY": [{
                            "maxSeats": {
                                "MAX": "rooms_seats"
                            }
                        }]
                    }
                };

                return insightFacade.performQuery(qr)
                    .then(function (value: InsightResponse) {
                        // Log.trace("Test done: " + value.code + ", " + JSON.stringify(value.body));
                        // expect(value.code).to.equal(200);

                        expect(value.body).to.deep.equal({
                            "render": "TABLE",
                            "result": [{
                                "rooms_shortname": "OSBO",
                                "maxSeats": 442
                            }, {
                                "rooms_shortname": "HEBB",
                                "maxSeats": 375
                            }, {
                                "rooms_shortname": "LSC",
                                "maxSeats": 350
                            }]
                        });

                    })
                    .catch(function (err: InsightResponse) {
                        Log.trace("Test failed: " + err.code + ", " + JSON.stringify(err.body));
                        expect.fail();
                    })
            })
            .catch(function (err: InsightResponse) {
                Log.test('ERROR: ' + JSON.stringify(err.body));
                expect.fail();
            });
    });


    // Test 5
    // A simple query B (from d3 page)
    it("performQuery with a simple D3 Query (no WHERE)", function () {
        var id: string = "rooms";
        this.timeout(10000);
        return insightFacade.addDataset(id, testBase64)
            .then(function (value: InsightResponse) {
                var qr: any = {
                    "WHERE": {},
                    "OPTIONS": {
                        "COLUMNS": [
                            "rooms_furniture",
                            "maxSeats"
                        ],
                        "ORDER": "rooms_furniture",
                        "FORM": "TABLE"
                    },
                    "TRANSFORMATIONS": {
                        "GROUP": ["rooms_furniture"],
                        "APPLY": [{
                            "maxSeats": {
                                "MAX": "rooms_seats"
                            }
                        }]
                    }
                };

                return insightFacade.performQuery(qr)
                    .then(function (value: InsightResponse) {
                        Log.trace("Test done: " + value.code + ", " + JSON.stringify(value.body));
                        // expect(value.code).to.equal(200);

                        expect(value.body).to.deep.equal({
                            "render": "TABLE",
                            "result": [{
                                "rooms_furniture": "Classroom-Fixed Tables/Fixed Chairs"
                            }, {
                                "rooms_furniture": "Classroom-Fixed Tables/Movable Chairs"
                            }, {
                                "rooms_furniture": "Classroom-Fixed Tables/Moveable Chairs"
                            }, {
                                "rooms_furniture": "Classroom-Fixed Tablets"
                            }, {
                                "rooms_furniture": "Classroom-Hybrid Furniture"
                            }, {
                                "rooms_furniture": "Classroom-Learn Lab"
                            }, {
                                "rooms_furniture": "Classroom-Movable Tables & Chairs"
                            }, {
                                "rooms_furniture": "Classroom-Movable Tablets"
                            }, {
                                "rooms_furniture": "Classroom-Moveable Tables & Chairs"
                            }, {
                                "rooms_furniture": "Classroom-Moveable Tablets"
                            }]
                        });

                    })
                    .catch(function (err: InsightResponse) {
                        Log.trace("Test failed: " + err.code + ", " + JSON.stringify(err.body));
                        expect.fail();
                    })
            })
            .catch(function (err: InsightResponse) {
                Log.test('ERROR: ' + JSON.stringify(err.body));
                expect.fail();
            });
    });

    // Test 6
    // D2 Query with D3 Sort
    it("D2 Query with D3 Sort", function () {
        var id: string = "rooms";
        this.timeout(10000);
        return insightFacade.addDataset(id, testBase64)
            .then(function (value: InsightResponse) {
                var qr: any = {
                    "WHERE": {
                        "IS": {
                            "rooms_address": "*Agrono*"
                        }
                    },
                    "OPTIONS": {
                        "COLUMNS": [
                            "rooms_address", "rooms_name"
                        ],
                        "ORDER": {
                            "dir": "UP",
                            "keys": ["rooms_name"]
                        },
                        "FORM": "TABLE"
                    }
                };

                return insightFacade.performQuery(qr)
                    .then(function (value: InsightResponse) {
                        // Log.trace("Test done: " + value.code + ", " + JSON.stringify(value.body));
                        // expect(value.code).to.equal(200);

                        expect(value.body).to.deep.equal({
                            "render": "TABLE",
                            "result": [{
                                "rooms_address": "6245 Agronomy Road V6T 1Z4",
                                "rooms_name": "DMP_101"
                            },
                            {
                                "rooms_address": "6245 Agronomy Road V6T 1Z4",
                                "rooms_name": "DMP_110"
                            },
                            {
                                "rooms_address": "6245 Agronomy Road V6T 1Z4",
                                "rooms_name": "DMP_201"
                            },
                            {
                                "rooms_address": "6245 Agronomy Road V6T 1Z4",
                                "rooms_name": "DMP_301"
                            },
                            {
                                "rooms_address": "6245 Agronomy Road V6T 1Z4",
                                "rooms_name": "DMP_310"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_1001"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_3002"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_3004"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_3016"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_3018"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_3052"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_3058"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_3062"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_3068"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_3072"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_3074"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_4002"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_4004"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_4016"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_4018"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_4052"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_4058"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_4062"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_4068"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_4072"
                            },
                            {
                                "rooms_address": "6363 Agronomy Road",
                                "rooms_name": "ORCH_4074"
                            }
                            ]
                        });

                    })
                    .catch(function (err: InsightResponse) {
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
    // 
    it("rooms, but file is named courses (error)", function () {
        var id: string = "courses";
        this.timeout(10000);
        return insightFacade.addDataset(id, testBase64)
            .then(function (value: InsightResponse) {
                var qr: any = {
                    "WHERE": {
                        "IS": {
                            "courses_instructor": "*aci*"
                        }
                    },
                    "OPTIONS": {
                        "COLUMNS": [
                            "courses_instructor",
                            "courses_dept"
                        ],
                        "ORDER": "courses_instructor",
                        "FORM": "TABLE"
                    },
                    "TRANSFORMATIONS": {
                        "GROUP": ["courses_instructor",
                            "courses_dept"],
                        "APPLY": []
                    }
                };

                return insightFacade.performQuery(qr)
                    .then(function (value: InsightResponse) {
                        Log.trace("SHOULD NOT GET HERE: " + value.code + ", " + JSON.stringify(value.body));
                        expect.fail();

                    })
                    .catch(function (err: InsightResponse) {
                        Log.trace("Test failed: " + err.code + ", " + JSON.stringify(err.body));
                        expect(err.code).to.equal(400);
                    })
            })
            .catch(function (err: InsightResponse) {
                Log.test('ERROR: ' + err.body);
                expect.fail();
            });
    });

    // Test 7
    // 
    it("rooms, WITH COUNT", function () {
        var id: string = "courses";
        this.timeout(10000);
        return insightFacade.addDataset(id, testBase64)
            .then(function (value: InsightResponse) {
                var qr: any = {
                    "WHERE": {
                        "AND": [{
                            "IS": {
                                "rooms_furniture": "*Tables*"
                            }
                        }, {
                            "GT": {
                                "rooms_seats": 150
                            }
                        }]
                    },
                    "OPTIONS": {
                        "COLUMNS": [
                            "rooms_shortname",
                            "maxSeats",
                            "runningCount"
                        ],
                        "ORDER": {
                            "dir": "DOWN",
                            "keys": ["maxSeats"]
                        },
                        "FORM": "TABLE"
                    },
                    "TRANSFORMATIONS": {
                        "GROUP": ["rooms_shortname"],
                        "APPLY": [{
                            "maxSeats": {
                                "MAX": "rooms_seats"
                            }
                        },
                        {
                            "runningCount": {
                                "COUNT": "rooms_seats"
                            }
                        }]
                    }
                };

                return insightFacade.performQuery(qr)
                    .then(function (value: InsightResponse) {
                        // Log.trace("success: " + value.code + ", " + JSON.stringify(value.body));
                        expect(value.body).to.deep.equal({
                            "render": "TABLE",
                            "result": [{
                                "rooms_shortname": "OSBO",
                                "maxSeats": 442,
                                "runningCountType": 1
                            }, {
                                "rooms_shortname": "HEBB",
                                "maxSeats": 375,
                                "runningCountType": 1
                            }, {
                                "rooms_shortname": "LSC",
                                "maxSeats": 350,
                                "runningCountType": 1
                            }, {
                                "rooms_shortname": "SRC",
                                "maxSeats": 299,
                                "runningCountType": 1
                            }, {
                                "rooms_shortname": "ANGU",
                                "maxSeats": 260,
                                "runningCountType": 1
                            }, {
                                "rooms_shortname": "PHRM",
                                "maxSeats": 236,
                                "runningCountType": 1
                            }, {
                                "rooms_shortname": "LSK",
                                "maxSeats": 205,
                                "runningCountType": 1
                            }, {
                                "rooms_shortname": "CHBE",
                                "maxSeats": 200,
                                "runningCountType": 1
                            }, {
                                "rooms_shortname": "SWNG",
                                "maxSeats": 190,
                                "runningCountType": 1
                            }, {
                                "rooms_shortname": "DMP",
                                "maxSeats": 160,
                                "runningCountType": 1
                            }, {
                                "rooms_shortname": "FRDM",
                                "maxSeats": 160,
                                "runningCountType": 1
                            }, {
                                "rooms_shortname": "IBLC",
                                "maxSeats": 154,
                                "runningCountType": 1
                            }]
                        });

                    })
                    .catch(function (err: InsightResponse) {
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