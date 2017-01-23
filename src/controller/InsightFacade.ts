/**
 * This is the main programmatic entry point for the project.
 */
import {IInsightFacade, InsightResponse, QueryRequest} from "./IInsightFacade";

import Log from "../Util";

export default class InsightFacade implements IInsightFacade {

    // Keeps track of what ids we have
    private ids: any[];

    constructor() {
        Log.trace('InsightFacadeImpl::init()');
    }

    /**
     * Helper function
     * Unused, can be deleted
     * Converts the given base 64 zip string to a .zip
     * Reference: http://stackoverflow.com/questions/24532609/how-to-get-the-zip-file-from-base64-string-in-javascript
     * @param content  The base 64 encoded .zip to be converted
     */
    convertBase64Zip(content: string): ArrayBuffer {
        Log.trace("inside convertBase64Zip()");
        // First convert to an ASCII string
        content = window.atob(content);
        var buffer = new ArrayBuffer(content.length);
        var view = new Uint8Array(buffer);
        for(let i = 0; i < content.length; i++) {
            view[i] = content.charCodeAt(i);
        }
        return buffer;
    }

    /**
     * Helper function
     * TODO: implement this function
     * Takes the data in the zip file to store it to disk in a data structure
     * @param data  The data to be added (contains the files in the zip)
     */
    storeToDisk(data: any) {
        Log.trace("Inside storeToDisk()");
        // Use hashtable to store data as keys/value pairs?
    }

    /**
     * Helper function
     * Returns true if the data already exists on disk
     * @param id  The id to be checked
     */
    dataAlreadyExists(id: string): boolean {
        Log.trace("Checking if dataAlreadyExists(" + id + ")");
        for(let i of this.ids) {
           if(i == id) {
               Log.trace(id + " already exists in ids! Returning true");
               return true;
           }
        }
        Log.trace(id + " does not exist in ids! Returning false");
        return false;
    }


    /**
     * Helper function
     * Returns the InsightResponse with the error code, or throws an error if it doesn't exist
     * @param code  The code of an InsightResponse error
     *
     * Valid codes:
     * 
     * SUCCESS CODES:
     * 200: the query was successfully answered. The result should be sent in JSON according in the response body.
     * 201: the operation was successful and the id already existed (was added in
     * this session or was previously cached).
     * 204: the operation was successful and the id was new (not added in this
     * session or was previously cached).
     * 
     * ERROR CODES:
     * 400: the operation failed. The body should contain {"error": "my text"}
     * to explain what went wrong.
     * 404: the operation was unsuccessful because the delete was for a resource that
     * was not previously added.
     * 424: the query failed because it depends on a resource that has not been PUT. The body should contain {"missing": ["id1", "id2"...]}.
     */
    insightResponseGenerator(code: number): InsightResponse {
        var insightResponse: InsightResponse;
        insightResponse.code = code;
        insightResponse.body = {};
        return insightResponse;
    }


    /**
     * Helper function
     * Caches data to the disk
     * @param id  The id of the data being added
     * @param content  The dataset being added in .zip file form
     */
    addToDatabase(id: string, content: string) {
        Log.trace("Inside addToDatabase, adding " + id);
        // Add the id to ids[]
        this.ids.push(id);
        let that = this;
        let jsZip = require("jszip");
        let fs = require("fs");
        var options = { base64: true };
        var zip = new jsZip();
        zip.loadAsync(content, options)
            .then(function(data: any) {
                Log.trace("zip.loadAsync(content) call success, data = " + data);
                Log.trace("typeOf(files) = " + data.constructor.name);
                // data contains the files in the zip, now store it
                that.storeToDisk(data);
            })
            .catch(function(err: any) {
                Log.trace("zip.loadAsync(content) call failed, err = " + err);
            });
    }

    // Content = zip data
    // id = id of the data being added
    addDataset(id: string, content: string): Promise<InsightResponse> {
        Log.trace("Inside addDataset()");
        let that = this;

        return new Promise(function(fulfill, reject) {
            var rp = require("request-promise-native");
            rp.debug = true;
            var options = {
                json: false,
                uri: content
            };
            rp(options)
                .then(function(htmlString: any) {
                    Log.trace("Promise returned successfully, htmlString = " + htmlString);

                    /* Fulfill conditions:
                        * 201: the operation was successful and the id already existed (was added in
                        this session or was previously cached).
                        * 204: the operation was successful and the id was new (not added in this
                        session or was previously cached).
                    */

                    if(that.dataAlreadyExists(id)) {
                        // Even if the data already exists we want to re-cache it as it may have changed since last cache
                        that.addToDatabase(id, content);
                        Log.trace("dataAlreadyExists(" + id + ") == true, fulfilling with fulfill('201')");
                        fulfill("201");
                    } else {
                        that.addToDatabase(id, content);
                        Log.trace("dataAlreadyExists(" + id + ") == false, fulfilling with fulfill('204')");
                        fulfill("204");
                    }
                })
                .catch(function(err: any) {
                    /* Needs to reject the proper errors:
                        * 400: the operation failed. The body should contain {"error": "my text"}
                        to explain what went wrong.
                    */
                    Log.trace("Promise failed to return, err = " + err);
                    reject(err);
                });
        });
    }

    removeDataset(id: string): Promise<InsightResponse> {
        Log.trace("Inside removeDataset()");
        // Remove id from ids[]
        for(let i of this.ids) {
            if(i == id) {
                this.ids.splice(i, 1);
            }
        }

        return null;
    }

    performQuery(query: QueryRequest): Promise <InsightResponse> {
        Log.trace("Inside performQuery");
        return null;
    }

}
