/**
 * This is the main programmatic entry point for the project.
 */
import {IInsightFacade, InsightResponse, QueryRequest} from "./IInsightFacade";

import Log from "../Util";

export default class InsightFacade implements IInsightFacade {

    // Keeps track of what ids we have so far
    private static ids: number[];

    constructor() {
        Log.trace('InsightFacadeImpl::init()');
    }

    // Helper function, needs implementation
    dataAlreadyExists(id: string) {

    }

    // Helper function, needs implementation
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
