/**
 * This is the main programmatic entry point for the project.
 */
import {IInsightFacade, InsightResponse, QueryRequest} from "./IInsightFacade";

import Log from "../Util";

export default class InsightFacade implements IInsightFacade {

    constructor() {
        Log.trace('InsightFacadeImpl::init()');
    }

    addDataset(id: string, content: string): Promise<InsightResponse> {
        Log.trace("Inside addDataset()");
        // Content = zip data
        // id = id of the data being added
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
                    fulfill(htmlString);
                })
                .catch(function(err: any) {
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
