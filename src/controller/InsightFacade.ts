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
        Log.trace('InsightFacadeImpl::init()');
    }

    /**
     * Helper function
     * Returns true if the data already exists on disk
     * @param id  The id to be checked
     */
    dataAlreadyExists(id: string): boolean {
        Log.trace("Checking if this id already exists");
        for(let setId in this.dataSets) {
            if(setId === id) {
                Log.trace("match found, returning true")
                return true;
            }
        }
        Log.trace("match not found, returning false");
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
        Log.trace(id + ".json created");
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
            Log.trace("Inside addToDatabase, adding " + id);

            let zip = new JSZip();
            zip.loadAsync(content, {base64:true})
                .then(function(asyncData: any) {
                    Log.trace("loadAsync success");

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
                            Log.trace("inside promise.all.then");
                            var shouldWrite: boolean = true;
                            for(let k in ret) {
                                //Log.trace(fileNames[<any>k] + " stored.");
                                let validFile: boolean;
                                try { validFile = that.isValidFile(ret[k]); } catch(e) { /*Log.trace("validFile e = " + e);*/ }

                                if(validFile == false) {
                                    shouldWrite = false;
                                    reject("file named '" + fileNames[<any>k] + "' (#" + k + ") ( in " + id + " is not a valid file.");
                                } else {
                                    var obj: Object[];
                                    try { obj = that.createObject(ret[k]); } catch(e) { /*Log.trace("createObject e = " + e); */ }
                                    dataHashTable[fileNames[<any>k]] = obj;
                                }
                            }
                            if(shouldWrite == true) that.writeToDisk(id);
                            fulfill();
                        })
                        .catch(function(err: any) {
                            Log.trace("Promise.all catch, err = " + err);
                            reject(err);
                        });
                })
                .catch(function(err: any) {
                    Log.trace("loadAsync(" + id + ") catch, err = " + err);
                    reject(err);
                });
            });
    }

    // Content = zip data
    // id = id of the data being added
    addDataset(id: string, content: string): Promise<InsightResponse> {
        Log.trace("Inside addDataset()");
        let that = this;

        return new Promise(function(fulfill, reject) {

            /* Fulfill conditions:
                * 201: the operation was successful and the id already existed (was added in
                this session or was previously cached).
                * 204: the operation was successful and the id was new (not added in this
                session or was previously cached).
            */

            if(that.dataAlreadyExists(id) == true) {
                Log.trace("if");
                // Even if the data already exists we want to re-cache it as it may have changed since last cache
                // So lets remove it first
                that.removeDataset(id)
                    .then(function() {
                        // Now once its removed lets add it again
                        that.addToDatabase(id, content)
                            .then(function() {
                                Log.trace("addToDatabase success, fulfilling with fulfill(201)");
                                var ir: InsightResponse = {
                                    code: 201,
                                    body: {}
                                };
                                fulfill(ir);
                            })
                            .catch(function(err: any) {
                                Log.trace("addToDatabase catch, err = " + err);
                                var ir: InsightResponse = {
                                    code: 400,
                                    body: {"error": err}
                                };
                                reject(ir);
                            });
                    })
                    .catch(function(err:any) {
                        Log.trace("removeFromDatabase catch, err = " + err);
                        var ir: InsightResponse = {
                            code: 400,
                            body: {"error": err}
                        };
                        reject(ir);
                    });
            } else {
                Log.trace("iff");
                that.addToDatabase(id, content).then(function() {
                    Log.trace("addToDatabase of " + id + " success, fulfilling with fulfill(204)");
                    var ir: InsightResponse = {
                        code: 204,
                        body: {}
                    };
                    fulfill(ir);
                })
                .catch(function(err: any) {
                    Log.trace("addToDatabase catch, err = " + err);
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
        Log.trace("Inside removeDataset()");
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
                Log.trace("Removal(" + id + ") success");

            } catch(err) {
                Log.trace("Remove(" + id + ") unsuccessful, err = " + err);
                var ir2: InsightResponse = {
                    code: 404,
                    body: {"error": ("the id " + id + " does not exist in the dataset.")}
                };
                reject(ir2);
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
        Log.trace("Inside performQuery");
        let that = this;
        var ir: InsightResponse = {code: 0, body: {}};

        return new Promise(function(fulfill, reject) {
            that.validQuery(query).then(function() {
                that.retrieveData(query).then(function(validSections: Section[]) {
                    that.formatJsonResponse(query.OPTIONS, validSections).then(function(response: ReturnJSON) {
                        ir.code = 200;
                        ir.body = response;
                        fulfill(ir);
                    })
                    // 3. catch for formatJsonResponse
                    .catch(function() {
                        ir.code = 400;
                        ir.body = {"error": "failed to format JSON response"};
                        reject(ir);
                    })
                })
                // 2. catch for retrieveData
                .catch(function(err: any) {
                    if (err.constructor === Array) {
                        ir.code = 424;
                        ir.body = {"missing": err};
                        reject(ir);
                    } else {
                        ir.code = 400;
                        ir.body = {"error": err };
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
        Log.trace("Inside validQuery");
        let that = this;

        return new Promise(function (fulfill, reject) {
            var promises: Promise < any > [] = [];
            Log.trace("query = " + JSON.stringify(query));
            promises[0] = that.validQueryProperties(query);
            promises[1] = that.validWhere(query);
            promises[2] = that.validOptions(query);

            Promise.all(promises)
                .then(function () {
                    Log.trace("validQuery fulfills");
                    fulfill();
                })
                .catch(function (err: string) {
                    reject(err);
                })
        });
    }

    validQueryProperties(query: QueryRequest): Promise <any> {
        Log.trace("Inside validQueryProperties");
        let that = this;

        return new Promise(function(fulfill, reject) {
            //-------------------------------------
            // checking to make sure it only has two properties
            if (Object.keys(query).length != 2) {
                reject("wrong number of properties in QueryRequest"); 
            } else {
                Log.trace("validQueryProperties fulfills");
                fulfill();
            }
        });
    }

    validWhere(query: QueryRequest): Promise <any> {
        Log.trace("Inside validWhere");
        let that = this;

        return new Promise(function(fulfill, reject) {
            //-------------------------------------
            // checking if WHERE exists
            if (query.hasOwnProperty('WHERE')) {
                // check WHERE
                that.checkFilter(query.WHERE).then(function() {
                    Log.trace("validWhere fulfills");
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
        Log.trace("Inside validOptions");
        let that = this;

        return new Promise(function(fulfill, reject) {
            //-------------------------------------
            // checking if OPTIONS exists
            if (query.hasOwnProperty('OPTIONS')) {
                // check OPTIONS
                that.checkOptions(query.OPTIONS).then(function() {
                    Log.trace("validOptions fulfills");
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
        Log.trace("Inside checkFilter");
        let that = this;
        var k = Object.keys(filter);
        Log.trace("k[0] = " + k[0] + ", type = " + (k[0]).constructor.name);

        return new Promise(function(fulfill, reject) {
            // TODO: is this the right way to do it??
            // TODO: instead of filter.AND, should it just be "AND"??
            Log.trace("made it to switch in checkFilter");
            switch (k[0]) {

                // LOGICCOMPARISON
                case "AND":
                    that.checkLogicComparison(filter.AND)
                        .then(function() {
                            Log.trace("checkFilter fulfills");
                            fulfill();
                        })
                        .catch(function(err: string) {
                            reject(err);
                        });
                    break;
                case "OR":
                    that.checkLogicComparison(filter.OR)
                        .then(function() {
                            Log.trace("checkFilter fulfills");
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
                            Log.trace("checkFilter fulfills");
                            fulfill();
                        })
                        .catch(function(err: string) {
                        reject(err);
                    });
                    break;
                case "GT":
                    that.checkMComparison(filter.GT)
                        .then(function() {
                            Log.trace("checkFilter fulfills");
                            fulfill();
                        })
                        .catch(function(err: string) {
                        reject(err); 
                    });
                    break;
                case "EQ":
                    that.checkMComparison(filter.EQ)
                        .then(function() {
                            Log.trace("checkFilter fulfills");
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
                            Log.trace("checkFilter fulfills");
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
                            Log.trace("checkFilter fulfills");
                            fulfill();
                        })
                        .catch(function(err: string) {
                        reject(err);  
                    });
                    break;

                default:
                    Log.trace("checkFilter defaults");
                    reject("WARNING, checkFilter default: invalid Filter property \"" + JSON.stringify(filter) + "\"");
                    break;
            }
        });
    }

    // helper to filter: checks if logic comparison is valid, rejects with string of all errors
    checkLogicComparison(filters: Filter[]): Promise < any > {
        Log.trace("Inside checkLogicComparison");
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
                            Log.trace("checkLogicComparison Promise.all fulfilled");
                            fulfill();
                        })
                        .catch(function (err: string) {
                            Log.trace("checkFilter Promise.all failed");
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
    checkMComparison(mC: MComparison): Promise <any> {
        Log.trace("Inside checkMComparison");
        let that = this;
        var k = Object.keys(mC);
        Log.trace("k[0] = " + k[0] + ", type = " + (k[0]).constructor.name);

        return new Promise(function(fulfill, reject) {
            // checks each MComparison to make sure it's a valid number
            switch (k[0]) {
                case "courses_avg":
                    if (isNaN(mC.courses_avg)) {
                       reject("MComparison " + mC + " is not a number");
                    }
                    break;
                case "courses_pass":
                    if (isNaN(mC.courses_pass)) {
                       reject("MComparison " + mC + " is not a number");
                    }
                    break;
                case "courses_fail":
                    if (isNaN(mC.courses_fail)) {
                       reject("MComparison " + mC + " is not a number");
                    }
                    break;
                case "courses_audit":
                    if (isNaN(mC.courses_audit)) {
                       reject("MComparison " + mC + " is not a number"); 
                    }
                    break;
                default:
                    reject("invalid MComparison property \"" + JSON.stringify(mC) + "\"");
                    break;
            }
            fulfill();
        });
    }

    // helper to filter: checks if string comparison is valid, rejects with string of all errors
    checkSComparison(sC: SComparison): Promise <any> {
        Log.trace("Inside checkSComparison");
        let that = this;
        var k = Object.keys(sC);
        Log.trace("k[0] = " + k[0] + ", type = " + (k[0]).constructor.name);

        return new Promise(function(fulfill, reject) {
            // checks each SComparison to make sure it's a string
            switch (k[0]) {
                case "courses_dept":
                    // TODO: make sure this logic statement works, may not
                    if (typeof sC.courses_dept !== 'string') {
                       reject("MComparison " + sC + " is not a string");
                    }
                    break;
                case "courses_id":
                    if (typeof sC.courses_id !== 'string') {
                       reject("MComparison " + sC + " is not a string");  
                    }
                    break;
                case "courses_instructor":
                    if (typeof sC.courses_instructor !== 'string') {
                       reject("MComparison " + sC + " is not a string"); 
                    }
                    break;
                case "courses_title":
                    if (typeof sC.courses_title !== 'string') {
                       reject("MComparison " + sC + " is not a string"); 
                    }
                    break;
                case "courses_uuid":
                    if (typeof sC.courses_uuid !== 'string') {
                       reject("MComparison " + sC + " is not a string");
                    }
                    break;
                default:
                    reject("invalid SComparison property \"" + sC + "\"");
                    break;
            }
            fulfill();
        });
    }


    // helper: checks if options are valid, rejects with string of all errors
    checkOptions(options: Options): Promise < any > {
        Log.trace("Inside checkOptions");
        let that = this;

        return new Promise(function (fulfill, reject) {
            var promises: Promise < any > [] = [];
            Log.trace("options = " + JSON.stringify(options));
            promises[0] = that.checkColumns(options);
            promises[1] = that.checkOrder(options);
            promises[2] = that.checkForm(options);

            Promise.all(promises).then(function () {
                    Log.trace("checkOptions fulfills");
                    fulfill();
                })
                .catch(function (err: string) {
                    reject(err);
                })
        });
    }

        // helper: checks if options are valid, rejects with error
    checkColumns(options: Options): Promise <any> {
        Log.trace("Inside checkColumns");
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
                                Log.trace("COLUMNS checkOptions Promise.all returned successfully")
                                Log.trace("checkColumns fulfills");
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
        Log.trace("Inside checkOrder");
        let that = this;

        return new Promise(function(fulfill, reject) {
            //-------------------------------------
            // checking if correct number of properties in OPTIONS
            // if 3: check if has ORDER (if not, then should have 2)
            if (Object.keys(options).length == 3) {
                // check if ORDER exists
                if (options.hasOwnProperty('ORDER')) {
                    // check if ORDER is valid key
                    Log.trace("options.ORDER = " + options.ORDER + ", type = " + options.ORDER.constructor.name);
                    that.validKey(options.ORDER).then(function() {
                        for (let key of options.COLUMNS) {
                            if (key === options.ORDER) {   
                                Log.trace("checkOrder fulfills");
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
        Log.trace("Inside checkForm");
        let that = this;

        return new Promise(function(fulfill, reject) {
            //-------------------------------------
            // check if FORM exists
            if (options.hasOwnProperty('FORM')) {
                // check if FORM is string "TABLE"
                Log.trace("options.FORM = " + options.FORM)
                if (options.FORM !== "TABLE") {
                    reject("FORM is not \"TABLE\"");
                } else {
                    Log.trace("checkForm fulfills");
                    fulfill();
                }
            } else {
                reject("no FORM property");
            }
        });
    }

    // helper: validates keys with regex, returns true if valid, false otherwise
    validKey(key: Key): Promise < any > {
        Log.trace("Inside validKey");
        let that = this;

        return new Promise(function (fulfill, reject) {
            if (typeof key === 'string' /* || key instanceof String*/ ) {
                // TODO: check if this regex is ok
                // this one worked on online version:
                //  /(courses_(avg|pass|fail|audit|dept|id|instructor|title|uuid))/test(key)
                if (/(courses_(avg|pass|fail|audit|dept|id|instructor|title|uuid))/.test(key)) {
                    Log.trace("Fancy regex passed");
                    fulfill();
                }
            }
            reject();
        });
    }


    // performQuery
    //  |
    //   - retrieveQuery
    retrieveData(query: QueryRequest): Promise < any > {
        Log.trace("Inside retrieveData");
        let that = this;
        var validSections: Section[];
        // initialize missingIDs
        that.missingIDs = [];

        return new Promise(function (fulfill, reject) {
            // For each data set on disk
            for (let setId in that.dataSets) {
                Log.trace("beginning parsing through: " + setId + ".json");
                Log.trace("*************************************************");

                // Read the data from the file
                var fileData: any = fs.readFileSync(setId + ".json", "utf8");
                let parsedData = JSON.parse(fileData);
                Log.trace("typeOf(fileData) = " + fileData.constructor.name + ", typeOf(parsedData) = " + parsedData.constructor.name);

                // Parse each course in the dataset
                for(let course in parsedData) {
                    Log.trace("Parsing course = " + course + ", type = " + course.constructor.name);

                    // Parse the sections of each course
                    for (let section of parsedData[course]) {
                        Log.trace("s = " + JSON.stringify(section));
                        // TODO: matchesQuery takes type of section, but section here is of type JSON object?
                        if (that.matchesQuery(query, section)) {
                            validSections.push(section);
                        }
                    }
                }
            }
            if (validSections.length == 0) {
                Log.trace("retrieveQuery: validSections.length == 0");
                if (that.missingIDs.length !== 0) {
                    Log.trace("retrieveQuery: that.missingIDs.length != 0");
                    reject(that.missingIDs);
                } else {
                    // TODO: make sure that a no-results query is a fail
                    reject("retrieveQuery: no results from query")
                }
            }
            Log.trace("retrieveQuery fulfilling");
            fulfill(validSections);
        });
    }

    matchesQuery(filter: Filter, section: Section): boolean {
        var compValues: number[];
        var k = Object.keys(filter);
        //Log.trace("k[0] = " + k[0] + ", type = " + (k[0]).constructor.name);

        switch (k[0]) {
            // recursively makes sure section matches all filters
            case "AND":
                Log.trace("AND found");
                for (var element of filter.AND) {
                    var bool: boolean = this.matchesQuery(element, section);
                    if (!bool) {
                        return false;
                    }
                }
                return true;
            // recursively makes sure section matches at least 1 filter
            case "OR":
                Log.trace("OR found");
                var runs: boolean[];
                for (var element of filter.OR) {
                    var bool = this.matchesQuery(element, section);
                    runs.push(bool);
                }
                return runs.includes(true);
            // checks values
            case "LT":
                Log.trace("LT found");
                compValues = this.MCompareToSection(filter.GT, section);
                return(compValues[0] > compValues[1]);
            case "GT":
                Log.trace("GT found");
                compValues = this.MCompareToSection(filter.GT, section);
                return(compValues[0] < compValues[1]);
            case "EQ":
                Log.trace("EQ found");
                compValues = this.MCompareToSection(filter.GT, section);
                return(compValues[0] === compValues[1]);
            // checks strings
            case "IS":
                Log.trace("IS found");
                return(this.SCompareToSection(filter.GT, section));
            // negates recursive call to check filter
            case "NOT":
                Log.trace("NOT found");
                return !this.matchesQuery(filter.NOT, section);
            default:
                break;
        }
        return false;
    }

    MCompareToSection(mC: MComparison, section: Section): number[] {
        var k = Object.keys(mC);
        //Log.trace("k[0] = " + k[0] + ", type = " + (k[0]).constructor.name);

        switch (k[0]) {
            case "courses_avg":
                Log.trace("courses_avg found");
                if (section.hasOwnProperty("avg")) {
                    return [mC.courses_avg, section.avg];
                }
                return [];
            case "courses_pass":
                Log.trace("courses_pass found");
                if (section.hasOwnProperty("pass")) {
                    return [mC.courses_pass, section.pass];
                }
                return [];
            case "courses_fail":
                Log.trace("courses_fail found");
                if (section.hasOwnProperty("fail")) {
                    return [mC.courses_fail, section.fail];
                }
                return [];
            case "courses_audit":
                Log.trace("courses_audit found");
                if (section.hasOwnProperty("audit")) {
                    return [mC.courses_audit, section.audit];
                }
                return [];
            default:
                Log.trace("WARNING: defaulted in valueOfMComparison (should never get here)");
                return [];
        }
    }

    SCompareToSection(sC: SComparison, section: Section): boolean {
        var k = Object.keys(sC);
        //Log.trace("k[0] = " + k[0] + ", type = " + (k[0]).constructor.name);

        switch (k[0]) {
            case "courses_dept":
                if (section.hasOwnProperty("avg")) {
                    return (sC.courses_dept == section.dept);
                }
                return false;
            case "courses_id":
                if (section.hasOwnProperty("id")) {
                    var bool = (sC.courses_id == section.id);
                    if (!bool) {
                        this.missingIDs.push(sC.courses_id);
                    }
                    return bool;
                }
                this.missingIDs.push(sC.courses_id);
                return false;
            case "courses_instructor":
                if (section.hasOwnProperty("instructor")) {
                    return (sC.courses_instructor == section.instructor);
                }
                return false;
            case "courses_title":
                if (section.hasOwnProperty("title")) {
                    return (sC.courses_title == section.title);
                }
                return false;
            case "courses_uuid":
                if (section.hasOwnProperty("uuid")) {
                    return (sC.courses_uuid == section.uuid);
                }
                return false;
            default:
                Log.trace("WARNING: defaulted in valueOfSComparison (should never get here)");
                return null;
        }
    }

    // performQuery
    //  |
    //   - retrieveQuery
    //      |
    //       - formatJsonResponse
    formatJsonResponse(options: Options, validSections: Section[]): Promise < any > {
        Log.trace("Inside formatJsonResponse");
        let that = this;
        var returnJSON: ReturnJSON;
        var result: Key[];

        return new Promise(function (fulfill, reject) {
            // sorts validSections by ORDER key
            validSections.sort(that.sortHelper(options.ORDER));

            var section: any;
            for (section of validSections) {
                var key: any;
                var column: any;
                for (column of options.COLUMNS) {
                    var sectionKey = that.keyToSection(column);
                    key[column] = section[sectionKey];
                }
                result.push(key);
            }
            returnJSON.render = "TABLE";
            returnJSON.result = result;
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
                Log.trace("WARNING: defaulted in sortHelper (should never get here)");
                section = null;
                break;
        }
        return section;
    }

}
