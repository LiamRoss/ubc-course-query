/**
 * This is the main programmatic entry point for the project.
 */
import {IInsightFacade, InsightResponse, QueryRequest} from "./IInsightFacade";

import Log from "../Util";
var fs = require("fs");
var JSZip = require("jszip");

export default class InsightFacade implements IInsightFacade {

    // Keeps track of what ids we have
    private ids: Array<string> = new Array();

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
        return this.ids.indexOf(id) != -1;
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
    addToDatabase(id: string, content: string) {
        Log.trace("Inside addToDatabase, adding " + id);
        // Add the id to ids[]
        let that = this;
        that.ids.push(id);

        // Decode base64 string and save it as a zip into data/
        that.base64_decode(content, "data/" + id + ".zip");
        // Now to unzip
        var zipPath: string = 'data/' + id + '.zip';
        fs.readFile(zipPath, (err: any, data: any) => {
            if(err) throw(err);
            let zip = new JSZip();
            Log.trace("readFile of " + zipPath + " success");
            zip.loadAsync(data)
                .then(function(asyncData: any) {
                    Log.trace("loadAsync of " + zipPath + " success");

                    // Referenced: http://stackoverflow.com/questions/39322964/extracting-zipped-files-using-jszip-in-javascript
                    Object.keys(asyncData.files).forEach(function(fileName: any) {
                        Log.trace(fileName);
                        zip.files[fileName].async('string')
                            .then(function(fileData: any) {
                                //Log.trace(fileData);
                            })
                            .catch(function(err: any) {
                                Log.trace("Reading" + fileName + "'s data failed, err = " + err);
                            });
                    });
                })
                .catch(function(err: any) {
                    Log.trace("loadAsync(" + id + ") failed, err = " + err);
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
                that.addToDatabase(id, content);
                Log.trace("dataAlreadyExists(" + id + ") == true, fulfilling with fulfill('201')");
            } else {
                Log.trace("dataAlreadyExists(" + id + ") == false, fulfilling with fulfill('204')");
                that.addToDatabase(id, content);

                // Commented out because otherwise it will make the callback think it is finished and not run
                // fulfill(that.insightResponse(204));
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
