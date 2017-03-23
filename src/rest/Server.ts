/**
 * This is the REST entry point for the project.
 * Restify is configured here.
 */

import restify = require('restify');

import Log from "../Util";
import {InsightResponse} from "../controller/IInsightFacade";
import InsightFacade from "../controller/InsightFacade";
var fs = require('fs');


/**
 * This configures the REST endpoints for the server.
 */
export default class Server {

    private port: number;
    private rest: restify.Server;

    constructor(port: number) {
        Log.info("Server::<init>( " + port + " )");
        this.port = port;
    }

    /**
     * Reference: http://stackoverflow.com/questions/28834835/readfile-in-base64-nodejs
     * @param file
     * @returns {string}
     */
    public static base64_encode(file: any) {
        var bitmap = fs.readFileSync(file);
        return new Buffer(bitmap).toString('base64');
    }

    /**
     * Stops the server. Again returns a promise so we know when the connections have
     * actually been fully closed and the port has been released.
     *
     * @returns {Promise<boolean>}
     */
    public stop(): Promise<boolean> {
        Log.info('Server::close()');
        let that = this;
        return new Promise(function (fulfill) {
            that.rest.close(function () {
                fulfill(true);
            });
        });
    }

    /**
     * Starts the server. Returns a promise with a boolean value. Promises are used
     * here because starting the server takes some time and we want to know when it
     * is done (and if it worked).
     *
     * @returns {Promise<boolean>}
     */
    public start(): Promise<boolean> {
        let that = this;
        return new Promise(function (fulfill, reject) {
            try {
                Log.info('Server::start() - start');

                that.rest = restify.createServer({
                    name: 'insightUBC'
                });

                that.rest.use(restify.bodyParser({mapParams: true, mapFiles: true}));

                that.rest.get('/', restify.serveStatic({
                   directory: __dirname + "/view",
                   default: "index.html"
                }));

                // provides the echo service
                // curl -is  http://localhost:4321/echo/myMessage
                that.rest.get('/echo/:msg', Server.echo);

                // Other endpoints will go here
                // When the url includes the string it calls the specified method

                // GET
                that.rest.get("/", Server.GET);

                // PUT
                that.rest.put("/dataset/:id", Server.PUT);

                // POST
                that.rest.post("/query", Server.POST);

                // DELETE
                that.rest.del("/dataset/:id", Server.DELETE);

                that.rest.listen(that.port, function () {
                    Log.info('Server::start() - restify listening: ' + that.rest.url);
                    fulfill(true);
                });

                that.rest.on('error', function (err: string) {
                    // catches errors in restify start; unusual syntax due to internal node not using normal exceptions here
                    Log.info('Server::start() - restify ERROR: ' + err);
                    reject(err);
                });
            } catch (err) {
                Log.error('Server::start() - ERROR: ' + err);
                reject(err);
            }
        });
    }

    /**
     * TODO
     * Gets the query interface
     * @constructor
     */
    public static GET(req: restify.Request, res: restify.Response, next: restify.Next) {
        let insightFacade: InsightFacade = new InsightFacade();

    }

    /**
     * Adds a dataset to the server
     * @constructor
     */
    public static PUT(req: restify.Request, res: restify.Response, next: restify.Next) {
        let b64_content = null;

        let id = req.params.id;

        let files = req.files;
        let insightFacade: InsightFacade = new InsightFacade();
        let filePath: string = files['body']['path'];

        Log.trace("Server::PUT(..) - id: " + id);
        Log.trace("Server::PUT(..) - filePath: " + filePath);

        try { b64_content = Server.base64_encode(filePath); } catch(e) { Log.trace("Base64 encode failed, e = " + e); }

        insightFacade.addDataset(id, b64_content)
            .then(function(ret: InsightResponse) {
                Log.trace("Server::PUT(..) successful, ret code: " + ret.code + ", ret body: " + JSON.stringify(ret.body));
                res.json(ret.code, ret.body);
                Log.trace(JSON.stringify(res));
                return next();
            })
            .catch(function(err: InsightResponse) {
                Log.trace("Server::PUT(..) error: " + JSON.stringify(err));
                res.json(err.code, err.body);
                return next();
            });
    }

    /**
     * Performs a query on the server
     * @constructor
     */
    public static POST(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace("Server::POST(..) starting...");
        let query = req.params;
        Log.trace("Server::POST(..) query: " + query);

        let insightFacade: InsightFacade = new InsightFacade();

        insightFacade.performQuery(JSON.parse(query))
            .then(function(ret: any) {
                Log.trace("Server::POST(..) successful");
                res.json(ret.code, ret.body);
                return next();
            })
            .catch(function(err: any) {
                Log.trace("Server::POST(..) error: " + JSON.stringify(err));
                res.json(err.code, err.body);
                return next();
            });
    }

    /**
     * TODO
     * Removes a dataset from the server
     * @constructor
     */
    public static DELETE(req: restify.Request, res: restify.Response, next: restify.Next) {
        let id = req.params.id;
        let insightFacade: InsightFacade = new InsightFacade();
        Log.trace("Server::DELETE(..) - id: " + id);


        insightFacade.removeDataset(id)
            .then(function(ret: any) {
                Log.trace("Server::DELETE(..) successful");
                res.json(ret.code, ret.body);
                return next;
            })
            .catch(function(err: any) {
                Log.trace("Server::DELETE(..) error: " + JSON.stringify(err));
                res.json(err.code, err.body);
                return next;
            });
    }

    // The next two methods handle the echo service.
    // These are almost certainly not the best place to put these, but are here for your reference.
    // By updating the Server.echo function pointer above, these methods can be easily moved.

    public static echo(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace('Server::echo(..) - params: ' + JSON.stringify(req.params));
        try {
            let result = Server.performEcho(req.params.msg);
            Log.info('Server::echo(..) - responding ' + result.code);
            res.json(result.code, result.body);
        } catch (err) {
            Log.error('Server::echo(..) - responding 400');
            res.json(400, {error: err.message});
        }
        return next();
    }

    public static performEcho(msg: string): InsightResponse {
        if (typeof msg !== 'undefined' && msg !== null) {
            return {code: 200, body: {message: msg + '...' + msg}};
        } else {
            return {code: 400, body: {error: 'Message not provided'}};
        }
    }

}
