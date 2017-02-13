/**
 * This is the main programmatic entry point for the project.
 */
import {IInsightFacade, InsightResponse, QueryRequest, Filter, 
    MComparison, SComparison, Options, Section, ReturnJSON, Key} from "./IInsightFacade";

import Log from "../Util";
var fs = require("fs");
var JSZip = require("jszip");

/**
 * Helper interface for HashTables
 * Can now create HashTables via:
 *      var table: HashTable<type> = {};
 * And add to it via:
 *      table["one"] = 1
 */
interface HashTable<T> {
    [key: string]: T;
}

export default class InsightFacade implements IInsightFacade {

    /**
     * Datastructure format:
     * Hashtable to store datasets
     * Stored as such:
     *      <id1, id1's hashtable>,
     *      <id2, id2's hashtable>, ...
     *
     * id1's hashtable will then be as follows:
     *      <course1name(file1name), file1data>,
     *      <course2name(file2name), file2data>, ...
     */
    private dataSets: HashTable<HashTable<Object[]>> = {};

    // array of missing IDs for QueryRequest
    private missingIDs: string[];


    constructor() {
        //Log.trace('InsightFacadeImpl::init()');
    }

    /**
     * Helper function
     * Returns true if the data already exists on disk
     * @param id  The id to be checked
     */
    dataAlreadyExists(id: string): boolean {
        //Log.trace("Checking if this id already exists");
        for(let setId in this.dataSets) {
            if(setId === id) {
                //Log.trace("match found, returning true")
                return true;
            }
        }
        //Log.trace("match not found, returning false");
        return false;
    }

    /**
     * Helper function
     * Creates the .json on disk
     * @param id  Name of the .json file
     */
    writeToDisk(id: string) {
        let that = this;
        fs.writeFileSync(id + ".json", JSON.stringify(that.dataSets[id]));
        //Log.trace(id + ".json created");
    }

    /**
     * Helper function
     * Checks if the given file is valid (contains a "result" key)
     * @param data  The file data to check
     * @returns {boolean}
     */
    isValidFile(data: string): boolean {
        let parsedData = JSON.parse(data);
        return parsedData.hasOwnProperty("result");
    }

    createObject(data: string): Object[] {
        var course: Object[] = [];

        let parsedData = JSON.parse(data);
        for(let i = 0; i < parsedData["result"].length; i++) {
            var sessionData = parsedData["result"][i];

            var dept: string = sessionData.Subject;
            var id: string = sessionData.Course;
            var avg: number = sessionData.Avg;
            var instructor: string = sessionData.Professor;
            var title: string = sessionData.Title;
            var pass: number = sessionData.Pass;
            var fail: number = sessionData.Fail;
            var audit: number = sessionData.Audit;
            var uuid: string = String(sessionData.id);

            course[i] = {dept, id, avg, instructor, title, pass, fail, audit, uuid};
        }

        return course;
    }

    /**
     * Helper function
     * Caches data to the disk
     * @param id  The id of the data being added
     * @param content  The dataset being added in .zip file form
     */
    addToDatabase(id: string, content: string): Promise<any> {
        let that = this;

        return new Promise(function(fulfill, reject) {
            //Log.trace("Inside addToDatabase, adding " + id);

            let zip = new JSZip();
            zip.loadAsync(content, {base64:true})
                .then(function(asyncData: any) {
                    //Log.trace("loadAsync success");

                    var promises: Promise<any>[] = [];

                    // Add the dataset to dataSet
                    var dataHashTable: HashTable<Object[]> = {};
                    that.dataSets[id] = dataHashTable;
                    // Referenced: http://stackoverflow.com/questions/39322964/extracting-zipped-files-using-jszip-in-javascript

                    let fileNames = Object.keys(asyncData.files);
                    for(let i in fileNames) {
                        promises[i] = zip.files[fileNames[i]].async('string');
                    }

                    Promise.all(promises)
                        .then(function(ret: any) {
                            //Log.trace("inside promise.all.then");
                            var shouldWrite: boolean = true;
                            for(let k in ret) {
                                //Log.trace(fileNames[<any>k] + " stored.");
                                let validFile: boolean;
                                try { validFile = that.isValidFile(ret[k]); } catch(e) { /*//Log.trace("validFile e = " + e);*/ }

                                if(validFile == false) {
                                    shouldWrite = false;
                                    reject("file named '" + fileNames[<any>k] + "' (#" + k + ") ( in " + id + " is not a valid file.");
                                } else {
                                    var obj: Object[];
                                    try { obj = that.createObject(ret[k]); } catch(e) { /*//Log.trace("createObject e = " + e); */ }
                                    dataHashTable[fileNames[<any>k]] = obj;
                                }
                            }
                            if(shouldWrite == true) that.writeToDisk(id);
                            fulfill();
                        })
                        .catch(function(err: any) {
                            //Log.trace("Promise.all catch, err = " + err);
                            reject(err);
                        });
                })
                .catch(function(err: any) {
                    //Log.trace("loadAsync(" + id + ") catch, err = " + err);
                    reject(err);
                });
            });
    }

    // Content = zip data
    // id = id of the data being added
    addDataset(id: string, content: string): Promise<InsightResponse> {
        //Log.trace("Inside addDataset()");
        let that = this;

        return new Promise(function(fulfill, reject) {

            /* Fulfill conditions:
                * 201: the operation was successful and the id already existed (was added in
                this session or was previously cached).
                * 204: the operation was successful and the id was new (not added in this
                session or was previously cached).
            */

            if(that.dataAlreadyExists(id) == true) {
                //Log.trace("if");
                // Even if the data already exists we want to re-cache it as it may have changed since last cache
                // So lets remove it first
                that.removeDataset(id)
                    .then(function() {
                        // Now once its removed lets add it again
                        that.addToDatabase(id, content)
                            .then(function() {
                                //Log.trace("addToDatabase success, fulfilling with fulfill(201)");
                                var ir: InsightResponse = {
                                    code: 201,
                                    body: {}
                                };
                                fulfill(ir);
                            })
                            .catch(function(err: any) {
                                //Log.trace("addToDatabase catch, err = " + err);
                                var ir: InsightResponse = {
                                    code: 400,
                                    body: {"error": err}
                                };
                                reject(ir);
                            });
                    })
                    .catch(function(err:any) {
                        //Log.trace("removeFromDatabase catch, err = " + err);
                        var ir: InsightResponse = {
                            code: 400,
                            body: {"error": err}
                        };
                        reject(ir);
                    });
            } else {
                //Log.trace("iff");
                that.addToDatabase(id, content).then(function() {
                    //Log.trace("addToDatabase of " + id + " success, fulfilling with fulfill(204)");
                    var ir: InsightResponse = {
                        code: 204,
                        body: {}
                    };
                    fulfill(ir);
                })
                .catch(function(err: any) {
                    //Log.trace("addToDatabase catch, err = " + err);
                    var ir: InsightResponse = {
                        code: 400,
                        body: {"error": err}
                    };
                    reject(ir);
                });
            }
        });
    }

    removeDataset(id: string): Promise<InsightResponse> {
        //Log.trace("Inside removeDataset()");
        let that = this;
        // Remove id from ids[] and delete its .json
        var ir: InsightResponse = {
            code: 204,
            body: {}
        };
        return new Promise(function(fulfill, reject) {
            try {
                delete that.dataSets[id];
                fs.unlinkSync(id + ".json");
                //Log.trace("Removal(" + id + ") success");

            } catch(err) {
                //Log.trace("Remove(" + id + ") unsuccessful, err = " + err);
                try {
                    fs.unlinkSync(id + ".json");
                } catch(e) {
                    var ir2: InsightResponse = {
                        code: 404,
                        body: {"error": ("the id " + id + " does not exist in the dataset.")}
                    };
                    reject(ir2);
                }
            }
            fulfill(ir);
        });
    }


    /**
     * Perform a query on UBCInsight.
     *
     * @param query  The query to be performed. This is the same as the body of the POST message.
     *
     * @return Promise <InsightResponse>
     *
     * The promise s    hould return an InsightResponse for both fulfill and reject.
     *
     * Fulfill should be for 2XX codes and reject for everything else.
     *
     * Return codes:
     *
     * 200: the query was successfully answered. The result should be sent in JSON according in the response body.
     * 400: the query failed; body should contain {"error": "my text"} providing extra detail.
     * 424: the query failed because it depends on a resource that has not been PUT. The body should contain {"missing": ["id1", "id2"...]}.
     *
     */

    performQuery(query: QueryRequest): Promise <InsightResponse> {
        //Log.trace("Inside performQuery");
        let that = this;
        var ir: InsightResponse = {code: 0, body: {}};
        this.missingIDs = [];

        return new Promise(function(fulfill, reject) {
            that.validQuery(query).then(function() {
                that.retrieveData(query)
                .then(function(validSections: Section[]) {
                    that.formatJsonResponse(query.OPTIONS, validSections)
                    .then(function(response: ReturnJSON) {
                        ir.code = 200;
                        ir.body = response;
                        //Log.trace("formatJsonResponse -> performQuery fulfill");
                        fulfill(ir);
                    })
                    // 3. catch for formatJsonResponse
                    .catch(function() {
                        ir.code = 400;
                        ir.body = {"error": "failed to format JSON response"};
                        //Log.trace("formatJsonResponse -> performQuery reject");
                        reject(ir);
                    })
                })
                // 2. catch for retrieveData
                .catch(function(err: string) {
                    //Log.trace("inside catch for performQuery->retrieveData");
                    //Log.trace("err = " + err);
                    if (err.length === 0) {
                        //Log.trace("err.length = 0");
                        ir.code = 424;
                        ir.body = {"missing": that.missingIDs};
                        //Log.trace("performQuery rejects with 424 + {\"missing\": that.missingIDs}");
                        reject(ir);
                    } else {
                        //Log.trace("err.length !=0");
                        ir.code = 400;
                        //Log.trace("ir.code = " + ir.code);
                        ir.body = {"error": err };
                        //Log.trace("ir.body = " + JSON.stringify(ir.body));
                        reject(ir);
                    }
                })  
            })
            // 1. catch for validQuery
            .catch(function(errors) {
                ir.code = 400;
                ir.body = {"error": "invalid query, error(s): " + errors};
                reject(ir);
            })
        });
    }


    // performQuery
    //  |
    //   - validQuery
    validQuery(query: QueryRequest): Promise < any > {
        //Log.trace("Inside validQuery");
        let that = this;

        return new Promise(function (fulfill, reject) {
            var promises: Promise < any > [] = [];
            //Log.trace("query = " + JSON.stringify(query));
            promises[0] = that.validQueryProperties(query);
            promises[1] = that.validWhere(query);
            promises[2] = that.validOptions(query);

            Promise.all(promises)
                .then(function () {
                    //Log.trace("validQuery fulfills");
                    fulfill();
                })
                .catch(function (err: string) {
                    reject(err);
                })
        });
    }

    validQueryProperties(query: QueryRequest): Promise <any> {
        //Log.trace("Inside validQueryProperties");
        let that = this;

        return new Promise(function(fulfill, reject) {
            //-------------------------------------
            // checking to make sure it only has two properties
            if (Object.keys(query).length != 2) {
                reject("wrong number of properties in QueryRequest"); 
            } else {
                //Log.trace("validQueryProperties fulfills");
                fulfill();
            }
        });
    }

    validWhere(query: QueryRequest): Promise <any> {
        //Log.trace("Inside validWhere");
        let that = this;

        return new Promise(function(fulfill, reject) {
            //-------------------------------------
            // checking if WHERE exists
            if (query.hasOwnProperty('WHERE')) {
                // check WHERE
                that.checkFilter(query.WHERE).then(function() {
                    //Log.trace("validWhere fulfills");
                    fulfill();
                })
                .catch(function(s: string) {
                    reject(s);
                })
            } else {
                reject("no WHERE property");
            }
        });
    }

    validOptions(query: QueryRequest): Promise <any> {
        //Log.trace("Inside validOptions");
        let that = this;

        return new Promise(function(fulfill, reject) {
            //-------------------------------------
            // checking if OPTIONS exists
            if (query.hasOwnProperty('OPTIONS')) {
                // check OPTIONS
                that.checkOptions(query.OPTIONS).then(function() {
                    //Log.trace("validOptions fulfills");
                    fulfill();
                })
                .catch(function(s: string) {
                    reject(s);
                })
            } else {
                reject("no OPTIONS property");
            }
        });
    }

    // helper: checks if filter is valid, rejects with string of all errors
    checkFilter(filter: Filter): Promise <any> {
        //Log.trace("Inside checkFilter");
        let that = this;
        var k = Object.keys(filter);
        //Log.trace("k[0] = " + k[0] + ", type = " + (k[0]).constructor.name);

        return new Promise(function(fulfill, reject) {
            // TODO: is this the right way to do it??
            // TODO: instead of filter.AND, should it just be "AND"??
            //Log.trace("made it to switch in checkFilter");
            switch (k[0]) {

                // LOGICCOMPARISON
                case "AND":
                    that.checkLogicComparison(filter.AND)
                        .then(function() {
                            //Log.trace("checkFilter fulfills");
                            fulfill();
                        })
                        .catch(function(err: string) {
                            reject(err);
                        });
                    break;
                case "OR":
                    that.checkLogicComparison(filter.OR)
                        .then(function() {
                            //Log.trace("checkFilter fulfills");
                            fulfill();
                        })
                        .catch(function(err: string) {
                            reject(err);
                        });
                    break;

                // MCOMPARISON:    
                case "LT":
                    that.checkMComparison(filter.LT)
                        .then(function() {
                            //Log.trace("checkFilter fulfills");
                            fulfill();
                        })
                        .catch(function(err: string) {
                        reject(err);
                    });
                    break;
                case "GT":
                    that.checkMComparison(filter.GT)
                        .then(function() {
                            //Log.trace("checkFilter fulfills");
                            fulfill();
                        })
                        .catch(function(err: string) {
                        reject(err); 
                    });
                    break;
                case "EQ":
                    that.checkMComparison(filter.EQ)
                        .then(function() {
                            //Log.trace("checkFilter fulfills");
                            fulfill();
                        })
                        .catch(function(err: string) {
                        reject(err);  
                    });
                    break;

                // SCOMPARISON:
                case "IS":
                    that.checkSComparison(filter.IS)
                        .then(function() {
                            //Log.trace("checkFilter fulfills");
                            fulfill();
                        })
                        .catch(function(err: string) {
                        reject(err); 
                    });
                    break;

                // NEGATION:
                case "NOT":
                    that.checkFilter(filter.NOT)
                        .then(function() {
                            //Log.trace("checkFilter fulfills");
                            fulfill();
                        })
                        .catch(function(err: string) {
                        reject(err);  
                    });
                    break;

                default:
                    //Log.trace("checkFilter defaults");
                    reject("WARNING, checkFilter default: invalid Filter property \"" + JSON.stringify(filter) + "\"");
                    break;
            }
        });
    }

    // helper to filter: checks if logic comparison is valid, rejects with string of all errors
    checkLogicComparison(filters: Filter[]): Promise < any > {
        //Log.trace("Inside checkLogicComparison");
        let that = this;

        return new Promise(function (fulfill, reject) {
            // check if filters is in an array
            if (filters.constructor === Array) {
                // check if filters is empty array
                if (filters.length > 0) {
                    // check if each member of array is valid Filter
                    var promises: Promise <any>[] = [];
                    for (let i in filters) {
                        promises[i] = that.checkFilter(filters[i]);
                    }

                    Promise.all(promises)
                        .then(function(value: any) {
                            //Log.trace("checkLogicComparison Promise.all fulfilled");
                            fulfill();
                        })
                        .catch(function (err: string) {
                            //Log.trace("checkFilter Promise.all failed");
                            reject(err);
                        });
                } else {
                    reject("LOGICCOMPARISON array is empty");
                }
            } else {
                reject("LOGICCOMPARISON is not an array");
            }
        });
    }

    // helper to filter: checks if math comparison is valid, rejects with string of all errors
    checkMComparison(mC: any): Promise <any> {
        //Log.trace("Inside checkMComparison");
        let that = this;
        var k = Object.keys(mC);
        var key: string = k[0];
        //Log.trace("k[0] = " + k[0] + ", type = " + (k[0]).constructor.name);
        //Log.trace("key = " + key + ", type = " + (key).constructor.name);
        var value: any = mC[key];
        //Log.trace("value = " + value + ", type = " + (value).constructor.name);
        var keyParts = key.split("_");
        var keyID = keyParts[0];
        Log.trace("keyID = " + keyID + ", type = " + (keyID).constructor.name);
        

        return new Promise(function (fulfill, reject) {
            // checks to see if data exists, if not fulfills,
            //  but adds to array of missingIDs if it doesn't exists
            if (!that.dataAlreadyExists(keyID)) {
                that.missingIDs.push(keyID);
                fulfill();
            }
            // checks each MComparison to make sure it's a number
            // /([A-Za-z]+_(avg|pass|fail|audit|dept|id|instructor|title|uuid))/.test(key)
            if (/([A-Za-z]+_(avg|pass|fail|audit))/.test(key)) {
                if (isNaN(value)) {
                    reject("MComparison " + value + " is not a number");
                } else {
                    fulfill();
                }
            } else {
                reject("invalid NComparison key \"" + key + "\"");
            }
        });
    }

    // helper to filter: checks if string comparison is valid, rejects with string of all errors
    checkSComparison(sC: any): Promise < any > {
        //Log.trace("Inside checkSComparison");
        let that = this;
        var k = Object.keys(sC);
        var key: any = k[0];
        //Log.trace("k[0] = " + k[0] + ", type = " + (k[0]).constructor.name);
        //Log.trace("key = " + key + ", type = " + (key).constructor.name);
        var value: any = sC[key];
        //Log.trace("value = " + value + ", type = " + (value).constructor.name);
        var keyParts = key.split("_");
        var keyID = keyParts[0];
        Log.trace("keyID = " + keyID + ", type = " + (keyID).constructor.name);
        
        return new Promise(function (fulfill, reject) {
            // checks to see if data exists, if not fulfills,
            //  but adds to array of missingIDs if it doesn't exists
            if (!that.dataAlreadyExists(keyID)) {
                that.missingIDs.push(keyID);
                fulfill();
            }
            // checks each SComparison to make sure it's a string
            // /([A-Za-z]+_(avg|pass|fail|audit|dept|id|instructor|title|uuid))/.test(key)
            if (/([A-Za-z]+_(dept|id|instructor|title|uuid))/.test(key)) {
                if (typeof value !== 'string') {
                    reject("SComparison " + value + " is not a string");
                } else {
                    fulfill();
                }
            } else {
                reject("invalid SComparison key \"" + key + "\"");
            }
        });
    }


    // helper: checks if options are valid, rejects with string of all errors
    checkOptions(options: Options): Promise < any > {
        //Log.trace("Inside checkOptions");
        let that = this;

        return new Promise(function (fulfill, reject) {
            var promises: Promise < any > [] = [];
            //Log.trace("options = " + JSON.stringify(options));
            promises[0] = that.checkColumns(options);
            promises[1] = that.checkOrder(options);
            promises[2] = that.checkForm(options);

            Promise.all(promises).then(function () {
                    //Log.trace("checkOptions fulfills");
                    fulfill();
                })
                .catch(function (err: string) {
                    reject(err);
                })
        });
    }

        // helper: checks if options are valid, rejects with error
    checkColumns(options: Options): Promise <any> {
        //Log.trace("Inside checkColumns");
        let that = this;

        return new Promise(function(fulfill, reject) {
            //-------------------------------------
            // checking if COLUMNS exists
            if (options.hasOwnProperty('COLUMNS')) {
                // check if COLUMNS is in an array
                if (options.COLUMNS.constructor === Array) {
                    // check if COLUMNS is empty array
                    if (options.COLUMNS.length > 0) {
                        // check if each member of array is valid key
                        // TODO: make sure this works... could do promise.all before finishing array?
                        var val;
                        var keyArray: Promise <any>[] = [];
                        for (val of options.COLUMNS) {
                            keyArray.push(that.validKey(val));
                        }
                        Promise.all(keyArray)
                            .then(function(value: any) {
                                //Log.trace("COLUMNS checkOptions Promise.all returned successfully")
                                //Log.trace("checkColumns fulfills");
                                fulfill();
                            })
                            .catch(function() {
                                reject("COLUMNS checkOptions Promise.all failed, invalid key in COLUMNS");
                            });
                    } else {
                        reject("COLUMNS is empty");
                    }
                } else {
                    reject("COLUMNS is not an array");
                }
            } else {
                reject("no COLUMNS property");
            }
        });
    }

        // helper: checks if options are valid, rejects with string of all errors
    checkOrder(options: Options): Promise <any> {
        //Log.trace("Inside checkOrder");
        let that = this;

        return new Promise(function(fulfill, reject) {
            //-------------------------------------
            // checking if correct number of properties in OPTIONS
            // if 3: check if has ORDER (if not, then should have 2)
            if (Object.keys(options).length == 3) {
                // check if ORDER exists
                if (options.hasOwnProperty('ORDER')) {
                    // check if ORDER is valid key
                    //Log.trace("options.ORDER = " + options.ORDER + ", type = " + options.ORDER.constructor.name);
                    that.validKey(options.ORDER).then(function() {
                        for (let key of options.COLUMNS) {
                            if (key === options.ORDER) {   
                                //Log.trace("checkOrder fulfills");
                                fulfill();
                            }
                        }
                        reject("key in ORDER not in COLUMNS");
                    }).catch(function() {
                        reject("invalid key in ORDER");
                    })
                } else {
                    reject("no ORDER property");
                }
            } else {
                if (Object.keys(options).length != 2) {
                    reject("too many properties in OPTIONS");
                }
            }
        });
    }

        // helper: checks if options are valid, rejects with string of all errors
    checkForm(options: Options): Promise <any> {
        //Log.trace("Inside checkForm");
        let that = this;

        return new Promise(function(fulfill, reject) {
            //-------------------------------------
            // check if FORM exists
            if (options.hasOwnProperty('FORM')) {
                // check if FORM is string "TABLE"
                //Log.trace("options.FORM = " + options.FORM)
                if (options.FORM !== "TABLE") {
                    reject("FORM is not \"TABLE\"");
                } else {
                    //Log.trace("checkForm fulfills");
                    fulfill();
                }
            } else {
                reject("no FORM property");
            }
        });
    }

    // helper: validates keys with regex, returns true if valid, false otherwise
    validKey(key: Key): Promise < any > {
        //Log.trace("Inside validKey");
        let that = this;

        return new Promise(function (fulfill, reject) {
            if (typeof key === 'string' /* || key instanceof String*/ ) {
                // TODO: check if this regex is ok
                // this one worked on online version:
                // if (/(courses_(avg|pass|fail|audit|dept|id|instructor|title|uuid))/.test(key)){
                if (/([A-Za-z]+_(avg|pass|fail|audit|dept|id|instructor|title|uuid))/.test(key)) {
                    //Log.trace("Fancy regex passed");
                    fulfill();
                }
            }
            reject();
        });
    }


    // performQuery
    //  |
    //   - retrieveData
    retrieveData(query: QueryRequest): Promise < any > {
        //Log.trace("Inside retrieveData");
        let that = this;
        var validSections: Section[] = [];

        return new Promise(function (fulfill, reject) {
            // For each data set on disk
            for (let setId in that.dataSets) {
                //Log.trace("Query is: " + JSON.stringify(query));
                //Log.trace("beginning parsing through: " + setId + ".json");
                //Log.trace("*************************************************");

                // Read the data from the file
                var fileData: any = fs.readFileSync(setId + ".json", "utf8");
                let parsedData = JSON.parse(fileData);
                //Log.trace("typeOf(fileData) = " + fileData.constructor.name + ", typeOf(parsedData) = " + parsedData.constructor.name);

                // Parse each course in the dataset
                for(let course in parsedData) {
                    //Log.trace("Parsing course = " + course);
                    //Log.trace(course + " has " + parsedData[course].length + " sections");
                    // Parse the sections of each course
                    for (let section of parsedData[course]) {
                        //Log.trace("section = " + JSON.stringify(section));
                        let s: Section = {
                            dept: section["dept"],
                            id: section["id"],
                            avg: section["avg"],
                            instructor: section["instructor"],
                            title: section["title"],
                            pass: section["pass"],
                            fail: section["fail"],
                            audit: section["audit"],
                            uuid: section["uuid"]
                        };
                        if (that.matchesQuery(query["WHERE"], s)) {
                            //Log.trace("adding to validSections");
                            validSections.push(s);
                        }
                    }
                }
            }
            if (validSections.length == 0) {
                //Log.trace("retrieveData: validSections.length == 0");
                if (that.missingIDs.length !== 0) {
                    //Log.trace("retrieveData: that.missingIDs.length != 0");
                    reject("");
                } else {
                    // TODO: make sure that a no-results query is a fail
                    //Log.trace("reject: retrieveData: no results from query");
                    reject("retrieveData: no results from query");
                }
            } else {
                //Log.trace("retrieveData fulfilling");
                fulfill(validSections);
            }
        });
    }

    createMComparison(obj: any): MComparison {
        var mc: MComparison;
        for(let thing in obj) {
            if(thing == "courses_avg") {
                mc = { courses_avg: obj[thing] };
            } else if(thing == "courses_pass") {
                mc = { courses_pass: obj[thing] };
            } else if(thing == "courses_fail") {
                mc = { courses_fail: obj[thing] };
            } else if(thing == "courses_audit") {
                mc = { courses_audit: obj[thing] };
            }
        }
        return mc;
    }

    createSComparison(obj: any): SComparison {
        var sc: SComparison;
        for(let thing in obj) {
            if(thing == "courses_dept") {
                sc = { courses_dept: obj[thing] };
            } else if(thing == "courses_id") {
                sc = { courses_id: obj[thing] };
            } else if(thing == "courses_instructor") {
                sc = { courses_instructor: obj[thing] };
            } else if(thing == "courses_title") {
                sc = { courses_title: obj[thing] };
            } else if(thing == "courses_uuid") {
                sc = { courses_uuid: obj[thing] };
            }
        }
        return sc;
    }

    
    createFilter(filter: any): Filter {
        var f: Filter;
        for(let thing in f) {
            // if(thing == "AND") {
            //     f = { AND: filter[thing] };
            // } else if(thing == "OR") {
            //     f = { OR: filter[thing] };
            // } else 
            if(thing == "LT") {
                f = { LT: this.createMComparison(thing) };
            } else if(thing == "GT") {
                f = { GT: this.createMComparison(thing) };
            } else if(thing == "EQ") {
                f = { EQ: this.createMComparison(thing) };
            } else if(thing == "IS") {
                f = { IS: this.createSComparison(thing) };
            // } else if(thing == "NOT") {
            //     f = {NOT: thing };
            }
        }
        return f;
    }

    matchesQuery(filter: Filter, section: Section): boolean {
        //Log.trace("inside matchesQuery");
        let that = this;
        var compValues: number[];
        var k = Object.keys(filter);
        //Log.trace("k[0] = " + k[0] + ", typeof(k[0]) = " + (k[0]).constructor.name);

        // TODO: NEED TO CHECK AND, OR
        switch (k[0]) {
            // recursively makes sure section matches all filters
            case "AND":
                //Log.trace("AND found" + ", Filter.AND = " + JSON.stringify(filter.AND));
                for (var element of filter.AND) {
                    //Log.trace("AND found, element = " + JSON.stringify(element));
                    // var f: Filter = this.createFilter(element);
                    var bool: boolean = this.matchesQuery(element, section);
                    if (!bool) {
                        //Log.trace("went into the false bool for AND");
                        return false;
                    }
                    //Log.trace("finished AND element loop");
                }
                return true;
            // recursively makes sure section matches at least 1 filter
            case "OR":
                //Log.trace("OR found" + ", Filter.OR = " + JSON.stringify(filter.OR));
                var runs: boolean[] = [];
                for (var element of filter.OR) {
                    //Log.trace("OR found, element = " + JSON.stringify(element));
                    // var f: Filter = this.createFilter(element);
                    // var bool = this.matchesQuery(f, section);
                    var bool: boolean = this.matchesQuery(element, section);
                    runs.push(bool);
                }
                for (var run of runs) {
                    if (run === true) {
                        return true;
                    }
                }
                return false;
            // checks values
            case "LT":
                //Log.trace("LT found" + ", Filter.LT = " + JSON.stringify(filter.LT));
                var mc = that.createMComparison(filter.LT);
                compValues = this.MCompareToSection(mc, section);
                if (compValues.length === 0) {
                    //Log.trace("compValues in matchesQuery is empty");
                    return false;
                };
                return(compValues[0] > compValues[1]);
            case "GT":
                //Log.trace("GT found" + ", Filter.GT = " + JSON.stringify(filter.GT));
                var mc = that.createMComparison(filter.GT);
                compValues = this.MCompareToSection(mc, section);
                if (compValues.length === 0) {
                    //Log.trace("compValues in matchesQuery is empty");
                    return false;
                };
                // if(compValues[1] > compValues[0]) { //Log.trace("compValues comparison for GT is true"); }
                return(compValues[1] > compValues[0]);
            case "EQ":
                //Log.trace("EQ found" + ", Filter.EQ = " + JSON.stringify(filter.EQ));
                var mc = that.createMComparison(filter.EQ);
                compValues = this.MCompareToSection(mc, section);
                if (compValues.length === 0) {
                    //Log.trace("compValues in matchesQuery is empty");
                    return false;
                };
                return(compValues[0] == compValues[1]);
            // checks strings
            case "IS":
                //Log.trace("IS found" + ", Filter.IS = " + JSON.stringify(filter.IS));
                var sc = that.createSComparison(filter.IS);
                return(this.SCompareToSection(sc, section));
            // negates recursive call to check filter
            case "NOT":
                //Log.trace("NOT found" + ", Filter.NOT = " + JSON.stringify(filter.NOT));
                // var f: Filter = this.createFilter(filter.NOT);
                //Log.trace("return value of NOT: " + !this.matchesQuery(filter.NOT, section));
                return !this.matchesQuery(filter.NOT, section);
            default:
                break;
        }
        return false;
    }


    MCompareToSection(mC: MComparison, section: Section): number[] {
        //Log.trace("Inside MCompareToSection");
        let identifier: String = "MCompareToSection identifier uninitialized!";
        for(let thing in mC) {
            identifier = thing;
        }
        //Log.trace("identifier set to " + identifier);

        switch (identifier) {
            case "courses_avg":
                //Log.trace("courses_avg found");
                if (section.hasOwnProperty("avg")) {
                    //Log.trace("Returning [" + mC.courses_avg + ", " + section.avg + "]");
                    return [mC.courses_avg, section.avg];
                }
                return [];
            case "courses_pass":
                //Log.trace("courses_pass found");
                if (section.hasOwnProperty("pass")) {
                    return [mC.courses_pass, section.pass];
                }
                return [];
            case "courses_fail":
                //Log.trace("courses_fail found");
                if (section.hasOwnProperty("fail")) {
                    return [mC.courses_fail, section.fail];
                }
                return [];
            case "courses_audit":
                //Log.trace("courses_audit found");
                if (section.hasOwnProperty("audit")) {
                    return [mC.courses_audit, section.audit];
                }
                return [];
            default:
                //Log.trace("WARNING: defaulted in valueOfMComparison (should never get here)");
                return [];
        }
    }

    SCompareToSection(sC: SComparison, section: Section): boolean {
        var k = Object.keys(sC);
        //Log.trace("k[0] = " + k[0] + ", type = " + (k[0]).constructor.name);

        switch (k[0]) {
            case "courses_dept":
                if (section.hasOwnProperty("avg")) {
                    return (this.SCompareToSectionHelper(sC.courses_dept, section.dept));
                }
                return false;
            case "courses_id":
                if (section.hasOwnProperty("id")) {
                    var bool = this.SCompareToSectionHelper(sC.courses_id, section.id);
                    if (!bool) {
                        if (!this.missingIDs.includes(sC.courses_id)) {
                            this.missingIDs.push(sC.courses_id);
                        }
                    }
                    return bool;
                } else {
                    if (!this.missingIDs.includes(sC.courses_id)) {
                        this.missingIDs.push(sC.courses_id);
                    }
                }
                return false;
            case "courses_instructor":
                if (section.hasOwnProperty("instructor")) {
                    return (this.SCompareToSectionHelper(sC.courses_instructor, section.instructor));
                }
                return false;
            case "courses_title":
                if (section.hasOwnProperty("title")) {
                    return (this.SCompareToSectionHelper(sC.courses_title, section.title));
                }
                return false;
            case "courses_uuid":
                if (section.hasOwnProperty("uuid")) {
                    return (this.SCompareToSectionHelper(sC.courses_uuid, section.uuid));
                }
                return false;
            default:
                //Log.trace("WARNING: defaulted in valueOfSComparison (should never get here)");
                return null;
        }
    }

    // helper to account for partial string queries
    SCompareToSectionHelper (sCProperty: string, sectionProperty: string): boolean {
        var trimSC: string = sCProperty.replace('*', '');
        if (sCProperty.startsWith("*")) {
            // *string*
            if (sCProperty.endsWith("*")) {
                //Log.trace("Inside *string*");
                var extraTrimSC: string = trimSC.replace('*', '');
                //Log.trace(sectionProperty + " includes " + extraTrimSC + ": " + sectionProperty.includes(sCProperty));
                return(sectionProperty.includes(extraTrimSC));
            } 
            // *string
            else {
                //Log.trace("Inside *string");
                //Log.trace(sectionProperty + " ends with " + trimSC + ": " + sectionProperty.endsWith(sCProperty));
                return(sectionProperty.endsWith(trimSC));
            }
        } 
        else {
            // string*
            if (sCProperty.endsWith("*")) {
                //Log.trace("Inside string*");
                //Log.trace(sectionProperty + " starts with " + trimSC + ": " + sectionProperty.startsWith(sCProperty));
                return(sectionProperty.startsWith(trimSC));
            } 
            // string
            else {
                //Log.trace("Inside string");
                //Log.trace("sectionProperty = sCProperty " + (sectionProperty === sCProperty));
                return(sectionProperty === sCProperty);
            }
        }
    }

    getVal(section: Section, sectionKey: string): any {
        if(sectionKey == "dept") {
            return section.dept;
        } else if(sectionKey == "id") {
            return section.id;
        } else if(sectionKey == "avg") {
            return section.avg;
        } else if(sectionKey == "instructor") {
            return section.instructor;
        } else if(sectionKey == "title") {
            return section.title;
        } else if(sectionKey == "pass") {
            return section.pass;
        } else if(sectionKey == "fail") {
            return section.fail;
        } else if(sectionKey == "audit") {
            return section.audit;
        } else if(sectionKey == "uuid") {
            return section.uuid;
        }
    }

    // performQuery
    //  |
    //   - retrieveData
    //      |
    //       - formatJsonResponse
    formatJsonResponse(options: Options, validSections: Section[]): Promise < any > {
        //Log.trace("Inside formatJsonResponse");
        let that = this;
        var returnJSON: ReturnJSON;
        var result: Object[] = [];

        return new Promise(function (fulfill, reject) {
            // sorts validSections by ORDER key
            validSections.sort(that.sortHelper(options.ORDER));
            //Log.trace("validSections sorted");

            for (let section of validSections) {
                //Log.trace("Creating columns for " + section.dept + section.id);
                let obj: Object = {};
                var key: HashTable<string>;
                for (let column of options.COLUMNS) {
                    var sectionKey: string = that.keyToSection(String(column));
                    let val: any;
                    try{ val = that.getVal(section, sectionKey); } catch(e) { 
                        //Log.trace("e = " + e);
                    }

                    //Log.trace(" ");
                    //Log.trace("    Adding " + column + " column");
                    //Log.trace("    sectionKey = " + sectionKey);
                    //Log.trace("    val = " + val);
                    try{ key[String(column)] = val; } catch(e) { 
                        //Log.trace("ee = " + e); 
                    }

                    try{ (<any>obj)[(String(column))] = val; } catch(e) { 
                        //Log.trace("eee = " + e); 
                    }
                }
                result.push(obj);
                //Log.trace("    All columns created for " + section.dept);
            }
            returnJSON = {
                render: "TABLE",
                result: (result)
            };
            //Log.trace("fulfilling formatJsonResponse...");
            //Log.trace("     - returnJSON render: " + returnJSON.render);
            //Log.trace("     - returnJSON result: " + JSON.stringify(returnJSON.result));
            fulfill(returnJSON);
        });
    }

    sortHelper(courseKey: string): any {
        var key: string;
        key = this.keyToSection(courseKey);
        
        return function (a: any, b: any) {
            var returnSort = (a[key] < b[key]) ? -1 : (a[key] > b[key]) ? 1 : 0;
            return returnSort;
        }
    }

    keyToSection (key: string): string {
        var section: string;

        switch (key) {
            case "courses_avg":
                section = "avg";
                break;
            case "courses_pass":
                section = "pass";
                break;
            case "courses_fail":
                section = "fail";
                break;
            case "courses_audit":
                section = "audit";
                break;
            case "courses_dept":
                section = "dept";
                break;
            case "courses_id":
                section = "id";
                break;
            case "courses_instructor":
                section = "instructor";
                break;
            case "courses_title":
                section = "title";
                break;
            case "courses_uuid":
                section = "uuid";
                break;
            default:
                //Log.trace("WARNING: defaulted in sortHelper (should never get here)");
                section = null;
                break;
        }
        return section;
    }

}
