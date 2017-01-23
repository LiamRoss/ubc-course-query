/**
 * This is the main programmatic entry point for the project.
 */
import {IInsightFacade, InsightResponse, QueryRequest} from "./IInsightFacade";

import Log from "../Util";

export default class InsightFacade implements IInsightFacade {

    // Keeps track of what ids we have
    private ids: string[];

    constructor() {
        Log.trace('InsightFacadeImpl::init()');
    }

    /**
     * Helper function
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
     * Returns true if the data already exists on disk
     * @param id  The id to be checked
     */
    dataAlreadyExists(id: string): boolean {
        Log.trace("Checking if dataAlreadyExists(" + id + ")");
        for(let i of this.ids) {
           if(i == id) return true;
           Log.trace(id + " already exists in ids, returning true");
        }
        Log.trace(id + " does not exist in ids, returning false");
        return false;
    }

    /**
     * Helper function
     * Caches data to the disk
     * @param id  The id of the data being added
     * @param content  The dataset being added in .zip file form
     */
    addToDatabase(id: string, content: string) {
        Log.trace("Adding " + id + " to database with addToDatabase(" + content + ")");
        let jsZip = require("jszip");
        var buffer: ArrayBuffer = this.convertBase64Zip(content);
        var zip = new jsZip();
        zip.loadAsync(buffer)
            .then(function(zip: any) {
                Log.trace("zip.loadAsync(content) call success, zip = " + zip);
                /*
                 * Now, cache the data
                 * localStorage is the browsers cache, see: http://stackoverflow.com/questions/14266730/js-how-to-cache-a-variable
                 * The following line stores the zip contents in the cache at [id]
                 * By using JSON stringify we can convert the data into a JSON structure
                 * Can be read using:
                 *      var data = localStorage[id]
                 *      if(data) {
                 *          parsedData = JSON.parse(id);
                 *      }
                 */
                localStorage[id] = JSON.stringify(zip);
                Log.trace(id + " has been cached.");
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
        return null;
    }

    performQuery(query: QueryRequest): Promise <InsightResponse> {
        Log.trace("Inside performQuery");
        return null;
    }

}
