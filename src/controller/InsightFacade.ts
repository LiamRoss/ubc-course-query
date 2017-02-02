/**
 * This is the main programmatic entry point for the project.
 */
import {IInsightFacade, InsightResponse, QueryRequest, Filter, 
    MComparison, SComparison, Options} from "./IInsightFacade";

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
            var uuid: string = sessionData.id;

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
                            for(let k in ret) {
                                //Log.trace(fileNames[<any>k] + " stored.");
                                let validFile: boolean;
                                try { validFile = that.isValidFile(ret[k]); } catch(e) { /*Log.trace("validFile e = " + e);*/ }

                                if(validFile == false) {
                                    reject("file named '" + fileNames[<any>k] + "' (#" + k + ") ( in " + id + " is not a valid file.");
                                } else {
                                    var obj: Object[];
                                    try { obj = that.createObject(ret[k]); } catch(e) { /*Log.trace("createObject e = " + e); */ }
                                    dataHashTable[fileNames[<any>k]] = obj;
                                }
                            }
                            that.writeToDisk(id);
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
        return new Promise(function(fulfill, reject) {
            try {
                delete that.dataSets[id];
                fs.unlinkSync(id + ".json");
                Log.trace("removal success");
                var ir: InsightResponse = {
                    code: 204,
                    body: {}
                };
                fulfill(ir);
            } catch(err) {
                Log.trace("Remove(" + id + ") unsuccessful, err = " + err);
                var ir: InsightResponse = {
                    code: 404,
                    body: {"error": ("the id " + id + " does not exist in the dataset.")}
                };
                reject(ir);
            }
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
                that.retrieveData(query).then(function() {
                    // do something with matching data
                })
                // 2. catch for retrieveData
                .catch(function(missingIDs: string[]) {
                    ir.code = 424;
                    ir.body = {"missing": missingIDs};
                    reject(ir);
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
    validQuery(query: QueryRequest): Promise <any> {
        Log.trace("Inside validQuery");
        let that = this;
        var isValid: boolean = true;
        var errors: string[] = [];

        return new Promise(function(fulfill, reject) {
            //-------------------------------------
            // checking if WHERE exists
            if (query.hasOwnProperty('WHERE')) {
                // check WHERE
                that.checkWhere(query.WHERE).catch(function(s: string) {
                    errors.push(s);
                    isValid = false;
                })
            } else {
                errors.push("no WHERE property");
                isValid = false;
            }
            //-------------------------------------
            // checking if OPTIONS exists
            if (query.hasOwnProperty('OPTIONS')) {
                // check OPTIONS
                that.checkOptions(query.OPTIONS).catch(function(s: string) {
                    errors.push(s);
                    isValid = false;
                })
            } else {
                errors.push("no OPTIONS property");
                isValid = false;
            }
            //-------------------------------------
            // checking to make sure it only has two properties
            if (Object.keys(query).length != 2) {
                errors.push("too many properties in QueryRequest");
                isValid = false;
            }
            //-------------------------------------
            // checks if query is valid, if so fulfills, if
            //  not rejects with string of issues
            if (isValid) {
                fulfill();
            } else {
                var errorsToReturn = errors.join(", ");
                reject(errorsToReturn);
            }

        });
    }

    checkWhere(where: Filter): Promise <any> {
        Log.trace("Inside checkWhere");
        let that = this;
        var isValid: boolean = true;
        var errors: string[] = [];

        return new Promise(function(fulfill, reject) {


            //-------------------------------------
            // checks if WHERE is valid, if so fulfills, if
            //  not rejects with string of issues
            if (isValid) {
                fulfill();
            } else {
                var errorsToReturn = errors.join(", ");
                reject(errorsToReturn);
            }
        });
    }

    checkOptions(options: Options): Promise <any> {
        Log.trace("Inside checkOptions");
        let that = this;
        var isValid: boolean = true;
        var errors: string[] = [];

        return new Promise(function(fulfill, reject) {
            //-------------------------------------
            // checking if COLUMNS exists
            if (options.hasOwnProperty('COLUMNS')) {
                // check if COLUMNS is in an array
                if (options.COLUMNS.constructor === Array) {
                    // check if each member of array is valid key
                    var val;
                    for (val of options.COLUMNS) {
                        var vKey: boolean = that.validKey(val);
                        if (!vKey) {
                            errors.push("invalid key in COLUMNS");
                            isValid = false;
                            break;
                        }
                    }
                } else {
                    errors.push("COLUMNS is not an array");
                    isValid = false;
                }
            } else {
                errors.push("no COLUMNS property");
                isValid = false;
            }
            //-------------------------------------
            // checking if correct number of properties in OPTIONS
            if (Object.keys(options).length == 3) {
                // check if ORDER exists
                if (options.hasOwnProperty('ORDER')) {
                    // check if ORDER is valid key
                    if (!that.validKey(options.ORDER)) {
                        errors.push("invalid key in ORDER");
                        isValid = false;
                    }
                } else {
                    errors.push("no ORDER property");
                    isValid = false;
                }
            } else {
                if (Object.keys(options).length != 2) {
                    errors.push("too many properties in OPTIONS");
                    isValid = false;
                }
            }
            //-------------------------------------
            // check if FORM exists
                if (options.hasOwnProperty('FORM')) {
                    // check if FORM is string "TABLE"
                    if (options.FORM !== "TABLE") {
                        errors.push("FORM is not \"TABLE\"");
                        isValid = false;
                    }
                } else {
                    errors.push("no ORDER property");
                    isValid = false;
                }
            //-------------------------------------
            // checks if OPTIONS is valid, if so fulfills, if
            //  not rejects with string of issues
            if (isValid) {
                fulfill();
            } else {
                var errorsToReturn = errors.join(", ");
                reject(errorsToReturn);
            }
        });
    }
    validKey(key: any): boolean {
        return false;
    }

    // performQuery
    //  |
    //   - retrieveQuery
    retrieveData(query: QueryRequest): Promise <any> {
        Log.trace("Inside retrieveQuery");
        let that = this;

        return new Promise(function(fulfill, reject) {
            
        });
    }

    // performQuery
    //  |
    //   - retrieveQuery
    //      |
    //       - formatJsonResponse
    formatJsonResponse(query: QueryRequest): Promise <any> {
        Log.trace("Inside formatJsonResponse");
        let that = this;

        return new Promise(function(fulfill, reject) {
            try {
                var ir: InsightResponse = {
                    code: 204,
                    body: {}
                };
                fulfill(ir);
            } catch(e) {
                var ir: InsightResponse = {
                    code: 404,
                    body: {"error": ("REPLACE ME WITH PROPER ERROR MESSAGE")}
                };
                reject(ir);
            }
        });
    }

}
