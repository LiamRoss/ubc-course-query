/**
 * This is the main programmatic entry point for the project.
 */
import {IInsightFacade, InsightResponse, QueryRequest} from "./IInsightFacade";

import Log from "../Util";

export default class InsightFacade implements IInsightFacade {

    // Keeps trak of what ids we have
    private ids: string[];

    constructor() {
        Log.trace('InsightFacadeImpl::init()');
    }

    /**
     * Returns true if the data already exists on disk
     * @param id  the id to be checked
     */
    dataAlreadyExists(id: string): boolean {
        for(let i of this.ids) {
           if(i == id) return true;
           Log.trace(id + " already exists in ids, returning true");
        }
        Log.trace(id + " does not exist in ids, returning false");
        return false;
    }

    // Helper function, needs implementation
    // Writes data to the disk
    addToDatabase(id: string, content: string) {

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
                        fulfill("201");
                    } else {
                        // Unsure if we need to generate an id ourselves or get it from somewhere?
                        that.addToDatabase(id, content);
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
