/**
 * This is the main programmatic entry point for the project.
 */
import {IInsightFacade, InsightResponse, QueryRequest} from "./IInsightFacade";

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
    private dataSets: HashTable<HashTable<string>> = {};


    constructor() {
        Log.trace('InsightFacadeImpl::init()');
    }

    /**
     * Helper function
     * Converts the given base 64 zip string to a .zip
     * Reference: http://stackoverflow.com/questions/28834835/readfile-in-base64-nodejs
     * @param content  The base 64 encoded .zip to be converted
     */
    base64_decode(content: string, file: string) {
        var bitmap = new Buffer(content, "base64");
        fs.writeFile(file, bitmap);
        Log.trace("Base64 string converted and written to " + file);
    }

    /**
     * Helper function
     * Returns true if the data already exists on disk
     * @param id  The id to be checked
     */
    dataAlreadyExists(id: string): boolean {
        let that = this;
        try {
            Object.keys(that.dataSets).forEach(function (setId: any) {
                if(id == setId) {
                    Log.trace(id + " already exists!");
                    return true;
                }
            });
        } catch(e) { Log.trace(e); }
        return false;
    }

    /**
     * Helper function
     * Returns the InsightResponse with the error code, or throws an error if it doesn't exist
     * @param codef  The code of an InsightResponse error
     * @param message  If the InsightResponse requires a message, can be sent, defaults to ""
     * @param missingIDs  If the InsightResponse requires missing ids, they can be sent via array
     *
     * SUCCESS CODES:
     * 200: the query was successfully answered. The result should be sent in JSON according in the response body.
     * 201: the operation was successful and the id already existed (was added in this session or was previously cached).
     * 204: the operation was successful and the id was new (not added in this session or was previously cached).
     * ERROR CODES:
     * 400 - needs message: the operation failed. The body should contain {"error": "my text"} to explain what went wrong.
     * 404: the operation was unsuccessful because the delete was for a resource that was not previously added.
     * 424 - needs missingIDs: the query failed because it depends on a resource that has not been PUT. The body should contain {"missing": ["id1", "id2"...]}.
     */
    insightResponse(codef: number, message: string = "", missingIDs: any[] = []): InsightResponse {
        var ir: InsightResponse = {
            code: codef,
            body: ""
        };

        switch (codef) {
            // SUCCESS CODES:
            case 200:
                ir.body = {};
                break;
            case 201:
                ir.body = {};
                break;
            case 204:
                ir.body = {};
                break;
            // ERROR CODES:
            case 400:
                ir.body = {"error": message};
                break;
            case 404:
                ir.body = {};
                break;
            case 424:
                ir.body = {"missing": missingIDs};
                break;
            // INVALID CODE:
            default:
                ir.body = {"error": "this error code is invalid"};
                break;
        }
        return ir;
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

            // Decode base64 string and save it as a zip into data/
            that.base64_decode(content, "data/" + id + ".zip");

            // Now to unzip
            var zipPath: string = 'data/' + id + '.zip';
            fs.readFile(zipPath, (err: any, data: any) => {
                if(err) reject(err);
                Log.trace("readFile of " + zipPath + " success");

                let zip = new JSZip();
                zip.loadAsync(data)
                    .then(function(asyncData: any) {
                        Log.trace("loadAsync of " + zipPath + " success");

                        var promises: Promise<any>[] = [];

                        // Add the dataset to the dataSet
                        var dataHashTable: HashTable<string> = {};
                        that.dataSets[id] = dataHashTable;
                        // Referenced: http://stackoverflow.com/questions/39322964/extracting-zipped-files-using-jszip-in-javascript

                        let fileNames = Object.keys(asyncData.files);
                        for(let i in fileNames){
                            promises[i] = zip.files[fileNames[i]].async('string');
                        }

                        Promise.all(promises)
                            .then(function(ret: any) {
                                for(let k in ret) {
                                    Log.trace(fileNames[<any>k] + " stored.");
                                    dataHashTable[fileNames[<any>k]] = ret[k];
                                }
                                fulfill("success");
                            })
                            .catch(function(err: any) {
                                Log.trace("Err = " + err);
                            });
                    })
                    .catch(function(err: any) {
                        Log.trace("loadAsync(" + id + ") failed, err = " + err);
                        reject(err);
                    });
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

            if(that.dataAlreadyExists(id)) {
                // Even if the data already exists we want to re-cache it as it may have changed since last cache
                that.addToDatabase(id, content).then(function(str: any) {
                    if(str == "success") {
                        Log.trace("addToDatabase success, fulfilling with fulfill(201)");
                        fulfill(that.insightResponse(201));
                    }
                })
                .catch(function(err: any) {
                    Log.trace("addToDatabase failed, err = " + err);
                    reject(that.insightResponse(400, err));
                });
            } else {
                that.addToDatabase(id, content).then(function(str: any) {
                    if(str == "success") {
                        Log.trace("addToDatabase of " + id + " success, fulfilling with fulfill(204)");
                        fulfill(that.insightResponse(204));
                    }
                })
                .catch(function(err: any) {
                    Log.trace("addToDatabase failed, err = " + err);
                    reject(that.insightResponse(400, err));
                });
            }

            /* Needs to reject the proper errors:
                * 400: the operation failed. The body should contain {"error": "my text"}
                to explain what went wrong.
            */
        });
    }

    removeDataset(id: string): Promise<InsightResponse> {
        Log.trace("Inside removeDataset()");
        let that = this;
        // Remove id from ids[]
        return new Promise(function(fulfill, reject) {
            try {
                delete that.dataSets[id];
                fulfill(that.insightResponse(204));
            } catch(e) {
                Log.trace("Remove unsuccessful, e = " + e);
                reject(that.insightResponse(404, e));
            }
        });
    }

    performQuery(query: QueryRequest): Promise <InsightResponse> {
        Log.trace("Inside performQuery");
        return null;
    }

}
