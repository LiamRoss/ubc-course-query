/**
 * This is the main programmatic entry point for the project.
 */
import {IInsightFacade, InsightResponse, QueryRequest} from "./IInsightFacade";

import Log from "../Util";

export default class InsightFacade implements IInsightFacade {

    // Keeps track of what ids we have
    private ids: Array<string> = new Array();

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
        if(this.ids.indexOf(id) == -1) {
            Log.trace(id + " not found, returning false");
            return false;
        } else {
            Log.trace(id + " found at index " + this.ids.indexOf(id) + " returning true");
            return true;
        }
    }


    /**
     * Helper function
     * Returns the InsightResponse with the error code, or throws an error if it doesn't exist
     * @param code  The code of an InsightResponse error
     * @param message  If the InsightResponse requires a message, can be sent, defaults to ""
     * @param missingIDs  If the InsightResponse requires missing ids, they can be sent via array
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
     * 400 - needs message: the operation failed. The body should contain {"error": "my text"}
     * to explain what went wrong.
     * 404: the operation was unsuccessful because the delete was for a resource that
     * was not previously added.
     * 424 - needs missingIDs: the query failed because it depends on a resource that has not been PUT.
     * The body should contain {"missing": ["id1", "id2"...]}.
     */
    insightResponse(code: number, message: string = "", missingIDs: any[] = []): InsightResponse {
        var ir: InsightResponse;
        // TODO: Fix this line; its saying that ir is undefined
        ir.code = code;

        switch (code) {
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
                Log.trace("dataAlreadyExists(" + id + ") == false, fulfilling with fulfill('204')");
                that.addToDatabase(id, content);
                fulfill(that.insightResponse(204));
            }

            /* Needs to reject the proper errors:
                * 400: the operation failed. The body should contain {"error": "my text"}
                to explain what went wrong.
            */
        });
    }

    removeDataset(id: string): Promise<InsightResponse> {
        Log.trace("Inside removeDataset()");
        // Remove id from ids[]

        return null;
    }

    performQuery(query: QueryRequest): Promise <InsightResponse> {
        Log.trace("Inside performQuery");
        return null;
    }

}
