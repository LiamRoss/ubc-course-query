/**
 * This is the main programmatic entry point for the project.
 */
import {
    InsightResponse,
    ReturnJSON,
    QueryRequest,
    Filter,
    MComparison,
    SComparison,
    Options,
    Sort,
    Transformations,
    ApplyKey,
    ApplyToken,
    Key,
    Section,
    Room,
    IInsightFacade,
    Group
} from "./IInsightFacade";

import Log from "../Util";
import { stringify } from "querystring";
import { Hash } from "crypto";
import { type } from "os";
var fs = require("fs");
var JSZip = require("jszip");
var parse5 = require('parse5');

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

    // array of missing IDs for QueryRequest
    private missingIDs: string[];

    private currRooms: HashTable<Object[]> = {};

    // the active dataset of the current query, enforces one
    //  active dataset per query rule
    private activeDataset: string = "";

    // valid buildings
    private validBuildings: string[] = [];

    constructor() {
        //Log.trace('InsightFacadeImpl::init()');
    }

    /**
     * Helper function
     * Returns true if the data already exists on disk
     * @param id  The id to be checked
     */
    dataAlreadyExists(id: string): boolean {
        //Log.trace("Checking if this id already exists");
        //Log.trace("checking for id: " + id)
        for (let setId in this.dataSets) {
            if (setId === id) {
                //Log.trace("match found, returning true")
                return true;
            }
        }
        //Log.trace("match not found, returning false");
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
        //Log.trace(id + ".json created");
    }

    /**
     * Helper function
     * Checks if the given file is a valid JSON file (contains a "result" key)
     * @param data  The file data to check
     * @returns {boolean}
     */
    isValidJsonFile(data: string): boolean {
        try {
            let parsedData = JSON.parse(data);
            return parsedData.hasOwnProperty("result");
        } catch (e) {
            return false;
        }
    }

    /**
     * Helper function
     * Checks if the given file is parseable via parse5
     * @param data  The file data to check
     * @returns {boolean}
     */
    isValidHtmFile(data: string): boolean {
        try {
            let parsedData = parse5.parse(data);
            return parsedData.childNodes[0].nodeName == "#documentType";
        } catch (e) {
            return false;
        }
    }

    /**
     * Helper function
     * Creates an object for each course
     * @param data A JSON string
     * @returns {Object[]}
     */
    createJsonObject(data: string): Object[] {
        var obj: Object[] = [];

        let parsedData = JSON.parse(data);
        for (let i = 0; i < parsedData["result"].length; i++) {
            var sessionData = parsedData["result"][i];

            var dept: string = sessionData.Subject;
            var id: string = sessionData.Course;
            var avg: number = sessionData.Avg;
            var instructor: string = sessionData.Professor;
            var title: string = sessionData.Title;
            var pass: number = sessionData.Pass;
            var fail: number = sessionData.Fail;
            var audit: number = sessionData.Audit;
            var uuid: string = String(sessionData.id);
            // year property added in d2:
            var year: number = sessionData.year;
            if (sessionData.Section == "overall") year = 1900;

            obj[i] = {
                dept,
                id,
                avg,
                instructor,
                title,
                pass,
                fail,
                audit,
                uuid,
                year
            };
        }

        return obj;
    }


    hasTbody(div: any): boolean {
        for (let i in div.childNodes) {
            if (div.childNodes[i].nodeName == "table") {
                return true;
            }
        }
        return false;
    }

    /**
     * Helper function
     * @param div  The div to check
     * @returns {string}  The value of 'value' nested inside the div's attrs
     */
    getDivAttrsValue(div: any) {
        for (let divChilds in div.attrs) {
            return div.attrs[divChilds].value;
        }
    }

    /**
     * Helper function
     * Converts the given address to a web-fetching friendly format, IE:
     *      6245 Agronomy Road V6T 1Z4
     *             converts to:
     *      6245%20Agronomy%20Road%20V6T%201Z4
     * @param address  The address to convert
     */
    webify(address: string): string {
        return encodeURI(address);
    }

    /**
     * Helper function
     * Parses a div with attrs value "view-content"
     * @param div  the div to parse
     * @param fileName  the name of the file containing the div
     */
    parseViewContent(div: Node, fileName: string): any {
        let that = this;
        //Log.trace("                        Parsing it...");
        var rooms: Object[] = [];
        /*
         * Format of data:
         *  Room number
         *  Capacity
         *  Furniture type
         *  Room type
         */
        for (let i in div.childNodes) {
            if (div.childNodes[i].nodeName == "table") {
                for (let j in div.childNodes[i].childNodes) {
                    if (div.childNodes[i].childNodes[j].nodeName == "tbody") {
                        //Log.trace("                            found a tbody, lets check it for room information...");
                        for (let k in div.childNodes[i].childNodes[j].childNodes) {
                            if (div.childNodes[i].childNodes[j].childNodes[k].nodeName == "tr") {
                                /*
                                 * Each 'tr' tag contains a room with 'td' tagged properties that need to be extracted
                                 */
                                let tr = div.childNodes[i].childNodes[j].childNodes[k];

                                /*
                                 * Declaring properties before they're set (to ensure types)
                                 */
                                let name: string;
                                let number: string;
                                let seats: number;
                                let href: string;
                                let furniture: string;
                                let type: string;

                                let room = {};

                                for (let l in tr.childNodes) {
                                    if (tr.childNodes[l].nodeName == "td") {
                                        let td = tr.childNodes[l];
                                        let tdVal = that.getDivAttrsValue(td);

                                        switch (tdVal) {
                                            case "views-field views-field-field-room-number":
                                                /*
                                                 * This part contains the href as well as the room number
                                                 */
                                                for (let c in td.childNodes) {
                                                    if (td.childNodes[c].nodeName == "a") {
                                                        href = that.getDivAttrsValue(td.childNodes[c]);
                                                        //Log.trace("                            href found: " + href);
                                                        for (let d in td.childNodes[c].childNodes) {
                                                            if (td.childNodes[c].childNodes[d].nodeName == "#text") {
                                                                number = (<any>(td.childNodes[c].childNodes[d])).value;
                                                                name = (fileName.replace(/^.*[\\\/]/, '')).concat("_").concat(number);
                                                                //Log.trace("                            room number found: " + number + ", setting its name to: " + name);
                                                            }
                                                        }
                                                    }
                                                }
                                                break;

                                            case "views-field views-field-field-room-capacity":
                                                for (let c in td.childNodes) {
                                                    if (td.childNodes[c].nodeName == "#text") {
                                                        seats = parseInt((<any>(td.childNodes[c])).value);
                                                        //Log.trace("                            seats found: " + seats);
                                                    }
                                                }
                                                break;

                                            case "views-field views-field-field-room-furniture":
                                                for (let c in td.childNodes) {
                                                    if (td.childNodes[c].nodeName == "#text") {
                                                        furniture = ((<any>(td.childNodes[c])).value).trim();
                                                        //Log.trace("                            furniture found: " + furniture);
                                                    }
                                                }
                                                break;

                                            case "views-field views-field-field-room-type":
                                                for (let c in td.childNodes) {
                                                    if (td.childNodes[c].nodeName == "#text") {
                                                        type = ((<any>(td.childNodes[c])).value).trim();
                                                        //Log.trace("                            type found: " + type);
                                                    }
                                                }
                                                break;
                                            // parser for index.htm file, oushes each to list of validBuildings
                                            case "views-field views-field-field-building-code":
                                                for (let c in td.childNodes) {
                                                    if (td.childNodes[c].nodeName == "#text") {
                                                        var buildingCode: string = ((<any>(td.childNodes[c])).value).trim();
                                                        //Log.trace("------------>buildingCode = " + buildingCode);
                                                        this.validBuildings.push(buildingCode);
                                                    }
                                                }
                                                break;
                                        }
                                    }
                                }
                                room = {
                                    name,
                                    number,
                                    seats,
                                    href,
                                    furniture,
                                    type
                                };
                                rooms.push(room);
                            }
                        }
                    }
                }
            }
        }
        return new Promise(function (fulfill) {
            fulfill(rooms);
        });
    }

    /**
     * Helper function
     * Gets the lat-lon from an address in the form of an array [lat, lon]
     * @param address  The address to get the lat-lon for
     * @returns {Promise<T>}
     */
    getLatLon(address: string): Promise<any> {
        let that = this;
        //Log.trace("                            making request for latlon...");

        return new Promise(function (fulfill, reject) {

            let http = require('http');

            let teamNumber: string = "46";
            let webAddress = that.webify(address);
            let addressPath: string = "/api/v1/team".concat(teamNumber).concat("/").concat(webAddress);

            let options = {
                host: 'skaha.cs.ubc.ca',
                port: 11316,
                path: addressPath,
                method: 'GET'
            };

            http.get(options, (res: any) => {
                //Log.trace("In http.get callback");

                let statusCode = res.statusCode;
                let contentType = res.headers['content-type'];
                let error;

                if (statusCode !== 200) {
                    error = new Error("lat-lon request failed. Status code: " + statusCode);
                } else if (!/^application\/json/.test(contentType)) {
                    error = new Error("Invalid content type.");
                }

                if (error) {
                    //Log.trace(error.message);
                    res.resume();
                    reject(error.message);
                }

                res.setEncoding('utf8');
                let rawData = '';

                res.on('data', (chunk: any) => rawData += chunk);
                res.on('end', () => {
                    try {
                        //Log.trace(JSON.stringify(rawData));
                        fulfill(rawData);
                    } catch (ee) {
                        //Log.trace("Error in latlon promise, e = " + ee.message);
                        reject(ee.message);
                    }
                });
            }).on('error', (e: any) => {
                //Log.trace("Got error " + e.message);
                reject(e);
            });
        });
    }

    /**
     * Helper function
     * Parses a div with attrs value "building-info"
     * @param div  the div to parse
     * @param fileName  the name of the file containing the div
     */
    parseBuildingInfo(div: Node, fileName: string): any {
        let that = this;
        //Log.trace("                        Parsing it...");

        let building: Object = {};

        /*
         * Building properties:
         * fullname:  Full building name (e.g., "Hugh Dempster Pavilion")
         * shortname: Short building name (e.g., "DMP")
         * address: The building address. (e.g., "6245 Agronomy Road V6T 1Z4").
         * lat: The latitude of the building
         * lon: The longitude of the building
         */

        let fullname: string;
        let shortname: string = fileName.replace(/^.*[\\\/]/, '');
        let address: string;
        let lat: number;
        let lon: number;

        for (let i in div.childNodes) {
            let divValueParent = that.getDivAttrsValue(div.childNodes[i]);
            if (divValueParent == "building-field") {
                //Log.trace("                            building-field found!");
                for (let j in div.childNodes[i].childNodes) {
                    let divValueChild = that.getDivAttrsValue(div.childNodes[i].childNodes[j]);
                    if (divValueChild == "field-content") {
                        //Log.trace("                                field-content found!");
                        for (let k in div.childNodes[i].childNodes[j].childNodes) {
                            let textDiv = div.childNodes[i].childNodes[j].childNodes[k];
                            switch (textDiv.nodeName) {
                                case "#text":
                                    /*
                                     * Printing of building-info such as address, hours, href
                                     */
                                    let text = (<any>(textDiv)).value;
                                    //Log.trace("                            text found, it's data is... " + text + (text.indexOf("hours") >= 0) + (text.indexOf("Hours") >= 0));
                                    if (text.indexOf("hours") < 0 && text.indexOf("Hours") < 0 && text.indexOf("TBD") < 0 && text.indexOf("construction") < 0) {
                                        /*
                                         * Contains the address
                                         */
                                        address = text;
                                        //Log.trace("                                data identified as an address");
                                    }
                                    break;
                                case "a":
                                    /*
                                     * Contains the href
                                     * Not actually used for now...
                                     */
                                    let url = that.getDivAttrsValue(textDiv);
                                    //Log.trace("                            href found, it's data is... " + url);
                            }
                        }
                    }
                }
            } else if (div.childNodes[i].nodeName == "h2") {
                for (let j in div.childNodes[i].childNodes) {
                    if (div.childNodes[i].childNodes[j].nodeName == "span") {
                        for (let k in div.childNodes[i].childNodes[j].childNodes) {
                            if (div.childNodes[i].childNodes[j].childNodes[k].nodeName == "#text") {
                                fullname = (<any>(div.childNodes[i].childNodes[j].childNodes[k])).value;
                                //Log.trace("                            fullname found, it's data is... " + fullname);
                            }
                        }
                    }
                }
            }
        }

        return new Promise(function (fulfill, reject) {
            if (that.isValidBuilding(shortname)) {
                if (address.indexOf("construction") < 0 && address.indexOf("TBD") < 0) {


                    //Log.trace("valid building in getlatlon!" + shortname);
                    that.getLatLon(address)
                        .then(function (body: any) {
                            let parsedData = JSON.parse(body);
                            //Log.trace("that.getLatLon(address) success.");
                            lat = parsedData['lat'];
                            //Log.trace("lat set to... " + lat);
                            lon = parsedData['lon'];
                            //Log.trace("lon set to... " + lon);

                            building = {
                                fullname,
                                shortname,
                                address,
                                lat,
                                lon,
                            };

                            fulfill(building);
                        })
                        .catch(function (err: any) {
                            //Log.trace("that.getLatLon(address) error: " + err + ", rejecting with it...");
                            reject(err + ", on file: " + fileName + ", with address = " + address);
                        });
                } else {
                    //Log.trace("invalid building in getlatlon " + shortname);

                    // Remove it from the list of valid buildings
                    let index = that.validBuildings.indexOf(shortname);
                    that.validBuildings.splice(index, 1);

                    //Log.trace("removed it from validBuildings, validBuildints = " + that.validBuildings);

                    lat = 0;
                    lon = 1;
                    building = {
                        fullname,
                        shortname,
                        address,
                        lat,
                        lon,
                    };
                    fulfill(building);
                }
            } else {
                //Log.trace("invalid building in getlatlon " + shortname);
                lat = 0;
                lon = 1;
                building = {
                    fullname,
                    shortname,
                    address,
                    lat,
                    lon,
                };
                fulfill(building);
            }
        });
    }

    /**
     * Helper function
     * Recursively checks the divs to find the ones we want
     * @param div  The div to check
     * @param fileName  The name of the file that the div belongs to
     */
    private foundDivs: HashTable<any[]> = {};
    checkChilds(div: any, fileName: string) {
        let that = this;

        if (that.getDivAttrsValue(div) == "building-info") {
            //Log.trace("FBI");
            that.foundDivs[fileName].push(div);
        } else if (that.getDivAttrsValue(div) == "view-content") {
            if (that.hasTbody(div)) {
                //Log.trace("FVC with table");
                that.foundDivs[fileName].push(div);
            }
        }

        if (div.childNodes) {
            for (let x in div.childNodes) {
                that.checkChilds(div.childNodes[x], fileName);
            }
        }
    }


    /**
     * Helper function
     * @param div The full-width-container div to check and parse if it has the correct sub divs
     * @param fileName  The name of the file that the div belongs to
     * @param id  The id of the dataset being added
     */
    parseFullWidthContainerDiv(div: any, fileName: string, id: string): Promise<any> {
        let that = this;
        var dataHashTable: HashTable<any> = {};
        that.dataSets[id] = dataHashTable;

        let promises: Promise<any>[] = [];

        // Initialize it
        that.foundDivs[fileName] = [];
        that.checkChilds(div, fileName);
        //Log.trace("Checking " + that.foundDivs[fileName]);

        /*
         * Parse the found divs
         */
        for (let k in that.foundDivs[fileName]) {
            if (that.getDivAttrsValue(that.foundDivs[fileName][k]) == "building-info") {
                let p: Promise<any> = that.parseBuildingInfo(that.foundDivs[fileName][k], fileName);
                promises.push(p);
            } else if (that.getDivAttrsValue(that.foundDivs[fileName][k]) == "view-content") {
                let p: Promise<any> = that.parseViewContent(that.foundDivs[fileName][k], fileName);
                promises.push(p);
            }
        }

        return new Promise(function (fulfill, reject) {
            Promise.all(promises)
                .then(function (ret: any) {
                    //Log.trace("Success!");

                    let rooms: Object[] = [];
                    let building: any = {};
                    for (let k in ret) {
                        if (ret[k].constructor.name == "Array") {
                            // This means it contains the array of room objects
                            rooms = ret[k];
                        } else if (ret[k].constructor.name == "Object") {
                            // This means it is the building object
                            building = ret[k];
                        }
                    }

                    // Now add the rooms array to the building object
                    building["rooms"] = rooms;
                    //Log.trace("Rooms added to building for " + fileName + "successfully!");

                    // Now add it to the dataSets global var
                    if (that.isValidBuilding(building['shortname'])) {
                        //Log.trace("=============> id for dataset: " + id);
                        //Log.trace("=============> fileName for dataset: " + fileName);
                        that.dataSets[id][fileName] = building;
                        //Log.trace("And " + fileName + " stored in the global var, fulfilling...");
                        //Log.trace("Valid buildings = " + that.validBuildings)
                        fulfill(building);
                    } else {
                        //Log.trace(fileName + " not in the index.htm file so does not need to be added");
                        fulfill();
                    }

                })
                .catch(function (err) {
                    //Log.trace("parseFullWidthContainerDiv's Promise.all failed, error: " + err);
                    reject(err)
                });
        });
    }

    /**
     * Helper function
     * Checks if the building is stored in the array of buildings found in index.htm
     * @param shortName
     * @returns {boolean}
     */
    isValidBuilding(shortName: any) {
        let that = this;

        for (var s of that.validBuildings) {
            if (s == shortName) {
                //Log.trace("=============> building " + shortName + " is valid");
                return true;
            }
        }
        return false;
    }

    /**
     * Helper function
     * Creates an object for each room
     * @param data in html string
     * @param fileName  the name of the file holding data
     * @returns {Object[]}
     */
    createHtmObject(data: string, fileName: string, id: string): Promise<any> {
        let that = this;

        let document = parse5.parse(data);

        return new Promise(function (fulfill, reject) {
            for (let i in document.childNodes) {
                if (document.childNodes[i].nodeName == "html") {
                    /*
                     * html of file found
                     */
                    //Log.trace("    Found html...");
                    for (let j in document.childNodes[i].childNodes) {
                        //Log.trace("        " + document.childNodes[i].childNodes[j].nodeName);
                        if (document.childNodes[i].childNodes[j].nodeName == "body") {
                            /*
                             * body of html found
                             */
                            //Log.trace("        Found body...");
                            for (let k in document.childNodes[i].childNodes[j].childNodes) {
                                if (document.childNodes[i].childNodes[j].childNodes[k].nodeName == "div") {
                                    /*
                                     * div found in body of html
                                     */
                                    //Log.trace("            Found div...");
                                    //Log.trace("            Div type: " + that.getDivAttrsValue(document.childNodes[i].childNodes[j].childNodes[k]))
                                    if (that.getDivAttrsValue(document.childNodes[i].childNodes[j].childNodes[k]) == "full-width-container") {
                                        /*
                                         * div identified as full-width-container
                                         */
                                        //Log.trace("                It has value = full-width-container...");
                                        //Log.trace("                Beginning recursive div search on it...");
                                        // Pass it into the helper function to recursively check it for the information we want
                                        that.parseFullWidthContainerDiv(document.childNodes[i].childNodes[j].childNodes[k], fileName, id)
                                            .then(function (ret: any) {
                                                //Log.trace("that.parseFullWidthContainerDiv success.");
                                                fulfill(ret);
                                            })
                                            .catch(function (err: any) {
                                                //Log.trace("that.parseFullWidthContainerDiv error: " + err);
                                                reject(err);
                                            });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Helper function
     * Caches data to the disk
     * @param id  The id of the data being added
     * @param content  The dataset being added in .zip file form
     */
    addToDatabase(id: string, content: string): Promise<any> {
        let that = this;

        return new Promise(function (fulfill, reject) {
            //Log.trace("Inside addToDatabase, adding " + id);

            let zip = new JSZip();
            zip.loadAsync(content, { base64: true })
                .then(function (asyncData: any) {
                    //Log.trace("loadAsync success");

                    var promises: Promise<any>[] = [];

                    // Add the dataset to dataSet
                    var dataHashTable: HashTable<Object[]> = {};
                    that.dataSets[id] = dataHashTable;
                    // Referenced: http://stackoverflow.com/questions/39322964/extracting-zipped-files-using-jszip-in-javascript

                    let fileNames = Object.keys(asyncData.files);
                    for (let i in fileNames) {
                        promises[i] = zip.files[fileNames[i]].async('string');
                    }

                    Promise.all(promises)
                        .then(function (ret: any) {
                            var promisesHtm: Promise<any>[] = [];
                            var shouldWrite: boolean = true;
                            var isJsonWrite: boolean = false;
                            var isHtmWrite: boolean = false;

                            // Parse valid buildings if there is an index html file
                            for (let x in ret) {
                                if (fileNames[<any>x].includes("index.htm")) {
                                    that.createHtmObject(ret[x], fileNames[<any>x], id);
                                }
                            }

                            for (let k in ret) {
                                //Log.trace(fileNames[<any>k] + " stored.");
                                // Check if the file is a valid JSON file
                                let isJson: boolean = that.isValidJsonFile(ret[k]);
                                if (isJson == false) {

                                    // If not, check if it is a valid htm/html file
                                    let isHtm: boolean = that.isValidHtmFile(ret[k]);
                                    if (isHtm == false) {

                                        // Ignore the "error" if the item being analyzed is a directory/folder
                                        if (fileNames[<any>k].slice(-1) != "/") {

                                            // Now make sure its not a .DS_Store file
                                            if (!fileNames[<any>k].includes(".DS_Store")) {
                                                shouldWrite = false;
                                                reject("file named '" + fileNames[<any>k] + "' (#" + k + " in '" + id + "') is not a valid file.");
                                            }
                                        }
                                    } else {
                                        //Log.trace(fileNames[<any>k] + " is a valid html file");
                                        isHtmWrite = true;
                                        try {
                                            if (!fileNames[<any>k.includes("index")]) {
                                                //Log.trace("Creating htm object for " + fileNames[<any>k] + ":");
                                                let p: Promise<any> = that.createHtmObject(ret[k], fileNames[<any>k], id);
                                                promisesHtm.push(p);
                                            }
                                        } catch (e) {
                                            //Log.trace("createHtmObject e = " + e);
                                        }
                                    }
                                } else {
                                    isJsonWrite = true;
                                    var obj: Object[];
                                    try {
                                        obj = that.createJsonObject(ret[k]);
                                    } catch (e) { /*//Log.trace("createJSONObject e = " + e); */ }
                                    dataHashTable[fileNames[<any>k]] = obj;
                                }
                            }
                            //Log.trace("htmWrite = " + isHtmWrite + ", jsonWrite = " + isJsonWrite);
                            if (shouldWrite == true && isJsonWrite) {
                                try { that.writeToDisk(id); } catch (e) {
                                    //Log.trace("Error while writing to disk, error: " + e);
                                }
                                fulfill();
                            } else if (shouldWrite == true && isHtmWrite) {
                                Promise.all(promisesHtm)
                                    .then(function (ret) {
                                        //Log.trace("done?! ... ret = " + JSON.stringify(ret));

                                        //Log.trace("stuff to write: " + JSON.stringify(that.dataSets[id]));

                                        try { that.writeToDisk(id); } catch (e) {
                                            //Log.trace("Error while writing to disk, error: " + e);
                                        }
                                        fulfill();
                                    })
                                    .catch(function (err) {
                                        //Log.trace("addToDataBase Promise.all failed, error: " + err);
                                        reject(err);
                                    });
                            }
                        })
                        .catch(function (err: any) {
                            //Log.trace("Promise.all catch, err = " + err);
                            reject(err);
                        });
                })
                .catch(function (err: any) {
                    //Log.trace("loadAsync(" + id + ") catch, err = " + err);
                    reject(err);
                });
        });
    }

    // Content = zip data
    // id = id of the data being added
    addDataset(id: string, content: string): Promise<InsightResponse> {
        //Log.trace("Inside addDataset()");
        let that = this;

        return new Promise(function (fulfill, reject) {

            /* Fulfill conditions:
             * 201: the operation was successful and the id already existed (was added in
             this session or was previously cached).
             * 204: the operation was successful and the id was new (not added in this
             session or was previously cached).
             */

            if (that.dataAlreadyExists(id) == true) {
                //Log.trace("if");
                // Even if the data already exists we want to re-cache it as it may have changed since last cache
                // So lets remove it first
                that.removeDataset(id)
                    .then(function () {
                        // Now once its removed lets add it again
                        that.addToDatabase(id, content)
                            .then(function () {
                                //Log.trace("addToDatabase success, fulfilling with fulfill(201)");
                                var ir: InsightResponse = { code: 201, body: {} };
                                fulfill(ir);
                            })
                            .catch(function (err: any) {
                                //Log.trace("addToDatabase catch, err = " + err);
                                var ir: InsightResponse = { code: 400, body: { "error": err } };
                                reject(ir);
                            });
                    })
                    .catch(function (err: any) {
                        //Log.trace("removeFromDatabase catch, err = " + err);
                        var ir: InsightResponse = { code: 400, body: { "error": err } };
                        reject(ir);
                    });
            } else {
                //Log.trace("iff");
                that.addToDatabase(id, content).then(function () {
                    //Log.trace("addToDatabase of " + id + " success, fulfilling with fulfill(204)");
                    var ir: InsightResponse = { code: 204, body: {} };
                    fulfill(ir);
                })
                    .catch(function (err: any) {
                        //Log.trace("addToDatabase catch, err = " + err);
                        var ir: InsightResponse = { code: 400, body: { "error": err } };
                        reject(ir);
                    });
            }
        });
    }


    removeDataset(id: string): Promise<InsightResponse> {
        //Log.trace("Inside removeDataset()");
        let that = this;
        // Remove id from ids[] and delete its .json
        var ir: InsightResponse = {
            code: 204,
            body: {}
        };
        return new Promise(function (fulfill, reject) {
            try {
                delete that.dataSets[id];
                fs.unlinkSync(id + ".json");
                //Log.trace("Removal(" + id + ") success");

            } catch (err) {
                //Log.trace("Remove(" + id + ") unsuccessful, err = " + err);
                try {
                    fs.unlinkSync(id + ".json");
                } catch (e) {
                    var ir2: InsightResponse = {
                        code: 404,
                        body: {
                            "error": ("the id " + id + " does not exist in the dataset.")
                        }
                    };
                    reject(ir2);
                }
            }
            fulfill(ir);
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
    performQuery(query: QueryRequest): Promise<InsightResponse> {
        //Log.trace("Inside performQuery");
        let that = this;
        var ir: InsightResponse = {
            code: 0,
            body: {}
        };
        // initialize missingIDs array
        this.missingIDs = [];
        // initialize current dataset
        this.activeDataset = "";

        return new Promise(function (fulfill, reject) {
            // check if query is valid
            that.validQuery(query).then(function () {
                // that.retrieveData(query)
                //     .then(function (validSections: Section[] | Room[]) {
                //         that.formatJsonResponse(query, validSections)
                //             .then(function (response: ReturnJSON) {
                //                 ir.code = 200;
                //                 ir.body = response;
                //                 //Log.trace("ReturnJSON: " + JSON.stringify(response));
                //                 //Log.trace("formatJsonResponse -> performQuery fulfill");
                //                 fulfill(ir);
                //             })
                //             // 3. catch for formatJsonResponse
                //             .catch(function () {
                //                 ir.code = 400;
                //                 ir.body = {
                //                     "error": "failed to format JSON response"
                //                 };
                //                 //Log.trace("formatJsonResponse -> performQuery reject");
                //                 reject(ir);
                //             })
                //     })
                //     // 2. catch for retrieveData
                //     .catch(function (err: string) {
                //         //Log.trace("err.length !=0");
                //         ir.code = 400;
                //         //Log.trace("ir.code = " + ir.code);
                //         ir.body = {
                //             "error": err
                //         };
                //         //Log.trace("ir.body = " + JSON.stringify(ir.body));
                //         reject(ir);
                //     })
            })
                // 1. catch for validQuery
                .catch(function (error) {
                    if (that.missingIDs.length === 0) {
                        ir.code = 400;
                        ir.body = {
                            "error": error
                        };
                        reject(ir);
                    } else {
                        ir.code = 424;
                        ir.body = {
                            "missing": that.missingIDs
                        };
                        reject(ir);
                    }
                })
        });
    }


    // performQuery
    //  |
    //   - validQuery
    validQuery(query: QueryRequest): Promise<any> {
        //Log.trace("Inside validQuery");
        return new Promise((fulfill, reject) => {
            // remove the following until next comment...
            reject("testing timeout issues, remove this later");
        });
    }
            /*
            var promises: Promise<any>[] = [];
            //Log.trace("query = " + JSON.stringify(query));
            // checks if query only has two properties
            promises[0] = this.validQueryProperties(query);
            promises[1] = this.validWhere(query);
            promises[2] = this.validOptions(query);
            if (Object.keys(query).length === 3) {
                promises[3] = this.validTransformations(query);
            }

            Promise.all(promises)
                .then(() => {
                    // if one or more IDs is invalid but query is valid (could remove?)
                    if (this.missingIDs.length === 0) {
                        fulfill();
                    } else {
                        reject();
                    }
                })
                .catch((err: string) => {
                    reject(err);
                })
        });
    }
    // validQuery helper #1
    validQueryProperties(query: QueryRequest): Promise<any> {
        //Log.trace("Inside validQueryProperties");
        let that = this;

        return new Promise(function (fulfill, reject) {
            //-------------------------------------
            // checking to make sure it only has two properties
            if (Object.keys(query).length === 2) {
                //Log.trace("validQueryProperties fulfills with 2 properties");
                fulfill();
            } else if (Object.keys(query).length === 3) {
                //Log.trace("validQueryProperties fulfills with 3 properties");
                fulfill();
            } else {
                reject("wrong number of properties in QueryRequest");
            }
        });
    }
    // validQuery helper #2
    validWhere(query: QueryRequest): Promise<any> {
        //Log.trace("Inside validWhere");
        return new Promise((fulfill, reject) => {
            // checking if WHERE exists
            if (query.hasOwnProperty('WHERE')) {
                // check if WHERE is empty
                // FIXME: IMPORTANT!!!! empty WHERE is valid, same as "all true"
                if (Object.keys(query.WHERE).length === 0 && query.WHERE.constructor === Object) {
                    //Log.trace("query.WHERE is empty and is an object, fulfills");
                    fulfill();
                }
                // else check WHERE internals
                else {
                    this.checkFilter(query.WHERE).then(() => {
                        //Log.trace("validWhere fulfills");
                        fulfill();
                    })
                        .catch((s: string) => {
                            reject(s);
                        })
                }
            } else {
                reject("no WHERE property");
            }
        });
    }
    // validQuery helper #3
    validOptions(query: QueryRequest): Promise<any> {
        //Log.trace("Inside validOptions");
        return new Promise((fulfill, reject) => {
            //-------------------------------------
            // checking if OPTIONS exists
            if (query.hasOwnProperty('OPTIONS')) {
                // check OPTIONS
                this.checkOptions(query)
                    .then(() => {
                        //Log.trace("validOptions fulfills");
                        fulfill();
                    })
                    .catch((s: string) => {
                        reject(s);
                    })
            } else {
                reject("no OPTIONS property");
            }
        });
    }
    // validQuery helper #4
    validTransformations(query: QueryRequest): Promise<any> {
        // FIXME: implement validTransformations
        //Log.trace("Inside validTransformations");
        return new Promise((fulfill, reject) => {
            //-------------------------------------
            // checking if TRANSFORMATIONS exists
            if (query.hasOwnProperty('TRANSFORMATIONS')) {
                // check TRANSFORMATIONS
                this.checkTransformations(query.TRANSFORMATIONS)
                    .then(() => {
                        //Log.trace("validOptions fulfills");
                        fulfill();
                    })
                    .catch((s: string) => {
                        reject(s);
                    })
            } else {
                reject("no TRANSFORMATIONS property");
            }
        });
    }

    // helper: checks if filter is valid, rejects with string of all errors
    checkFilter(filter: Filter): Promise<any> {
        //Log.trace("Inside checkFilter");
        let that = this;
        var k = Object.keys(filter);
        var key = k[0];
        //Log.trace("k[0] = " + k[0] + ", type = " + (k[0]).constructor.name);

        return new Promise(function (fulfill, reject) {
            //Log.trace("made it to switch in checkFilter");
            if (typeof key === "string") {
                switch (k[0]) {

                    // LOGICCOMPARISON
                    case "AND":
                        that.checkLogicComparison(filter.AND)
                            .then(function () {
                                //Log.trace("checkFilter fulfills");
                                fulfill();
                            })
                            .catch(function (err: string) {
                                reject(err);
                            });
                        break;
                    case "OR":
                        that.checkLogicComparison(filter.OR)
                            .then(function () {
                                //Log.trace("checkFilter fulfills");
                                fulfill();
                            })
                            .catch(function (err: string) {
                                reject(err);
                            });
                        break;

                    // MCOMPARISON:    
                    case "LT":
                        that.checkMComparison(filter.LT)
                            .then(function () {
                                //Log.trace("checkFilter fulfills");
                                fulfill();
                            })
                            .catch(function (err: string) {
                                reject(err);
                            });
                        break;
                    case "GT":
                        //Log.trace("checkFilter" + ", Filter.GT = " + JSON.stringify(filter.GT));
                        that.checkMComparison(filter.GT)
                            .then(function () {
                                //Log.trace("checkFilter fulfills");
                                fulfill();
                            })
                            .catch(function (err: string) {
                                reject(err);
                            });
                        break;
                    case "EQ":
                        that.checkMComparison(filter.EQ)
                            .then(function () {
                                //Log.trace("checkFilter fulfills");
                                fulfill();
                            })
                            .catch(function (err: string) {
                                reject(err);
                            });
                        break;

                    // SCOMPARISON:
                    case "IS":
                        that.checkSComparison(filter.IS)
                            .then(function () {
                                //Log.trace("checkFilter fulfills");
                                fulfill();
                            })
                            .catch(function (err: string) {
                                reject(err);
                            });
                        break;

                    // NEGATION:
                    case "NOT":
                        //Log.trace("filter.NOT (in checkFilter): " + JSON.stringify(filter.NOT));
                        that.checkFilter(filter.NOT)
                            .then(function () {
                                //Log.trace("checkFilter fulfills");
                                fulfill();
                            })
                            .catch(function (err: string) {
                                reject(err);
                            });
                        break;

                    default:
                        //Log.trace("checkFilter defaults");
                        reject("WARNING, checkFilter default: invalid Filter property \"" + JSON.stringify(filter) + "\"");
                        break;
                }
            } else {
                reject("filter key is not a string");
            }
        });
    }
    // checkFilter helper: checks if logic comparison is valid, rejects with string of all errors
    checkLogicComparison(filters: Filter[]): Promise<any> {
        //Log.trace("Inside checkLogicComparison");
        let that = this;

        return new Promise(function (fulfill, reject) {
            // check if filters is in an array
            if (filters.constructor === Array) {
                // check if filters is empty array
                if (filters.length > 0) {
                    // check if each member of array is valid Filter
                    var promises: Promise<any>[] = [];
                    for (let i in filters) {
                        promises[i] = that.checkFilter(filters[i]);
                    }

                    Promise.all(promises)
                        .then(function (value: any) {
                            //Log.trace("checkLogicComparison Promise.all fulfilled");
                            fulfill();
                        })
                        .catch(function (err: string) {
                            //Log.trace("checkFilter Promise.all failed");
                            reject(err);
                        });
                } else {
                    reject("LOGICCOMPARISON array is empty");
                }
            } else {
                reject("LOGICCOMPARISON is not an array");
            }
        });
    }
    // checkFilter helper: checks if math comparison is valid, rejects with string of all errors
    checkMComparison(mC: MComparison): Promise<any> {
        //Log.trace("Inside checkMComparison");
        let that = this;
        var k = Object.keys(mC);
        var key: string = k[0];
        //Log.trace("k[0] = " + k[0] + ", type = " + (k[0]).constructor.name);
        //Log.trace("key = " + key + ", type = " + (key).constructor.name);
        var value: any = mC[key];
        //Log.trace("value = " + value + ", type = " + (value).constructor.name);


        return new Promise(function (fulfill, reject) {
            that.validKey(key)
                // TODO: check if key name is one that deals with numbers
                .then(function () {
                    // checks each MComparison to make sure it's a number
                    if (isNaN(value)) {
                        reject("MComparison " + value + " is not a number");
                    } else {
                        //Log.trace("fulfill checkMComparison");
                        fulfill();
                    }
                })
                .catch(function (e: string) {
                    reject(e);
                })
        });
    }
    // checkFilter helper: checks if string comparison is valid, rejects with string of all errors
    checkSComparison(sC: SComparison): Promise<any> {
        //Log.trace("Inside checkSComparison");
        let that = this;
        var k = Object.keys(sC);
        var key: any = k[0];
        //Log.trace("k[0] = " + k[0] + ", type = " + (k[0]).constructor.name);
        //Log.trace("key = " + key + ", type = " + (key).constructor.name);
        var value: any = sC[key];
        //Log.trace("value = " + value + ", type = " + (value).constructor.name);

        return new Promise(function (fulfill, reject) {
            that.validKey(key)
                // TODO: check if key name is one that deals with strings
                .then(function () {
                    // checks each SComparison to make sure it's a string
                    if (typeof value !== 'string') {
                        reject("SComparison " + value + " is not a string");
                    } else {
                        //Log.trace("fulfill checkMComparison");
                        fulfill();
                    }
                })
                .catch(function (e: string) {
                    reject(e);
                })
        });
    }

    // helper: checks if options are valid, rejects with string of all errors
    checkOptions(query: QueryRequest): Promise<any> {
        //Log.trace("Inside checkOptions");
        let that = this;

        return new Promise(function (fulfill, reject) {
            var promises: Promise<any>[] = [];
            //Log.trace("options = " + JSON.stringify(query.OPTIONS));
            promises[0] = that.checkColumns(query);
            promises[1] = that.checkOrder(query.OPTIONS);
            promises[2] = that.checkForm(query.OPTIONS);

            Promise.all(promises).then(function () {
                //Log.trace("checkOptions fulfills");
                fulfill();
            })
                .catch(function (err: string) {
                    reject(err);
                })
        });
    }

    // checkOptions helper #1
    checkColumns(query: QueryRequest): Promise<any> {
        //Log.trace("Inside checkColumns");
        var options: Options = query.OPTIONS

        return new Promise((fulfill, reject) => {
            //-------------------------------------
            // checking if COLUMNS exists
            if (options.hasOwnProperty('COLUMNS')) {
                // check if COLUMNS is in an array
                if (options.COLUMNS.constructor === Array) {
                    // check if COLUMNS is empty array
                    if (options.COLUMNS.length > 0) {
                        // check if each member of array is valid key
                        // FIXME: can also be a string, if there is a transformations
                        var val: any;
                        var keyArray: Promise<any>[] = [];
                        // if TRANSFORMATIONS exists
                        if (query.hasOwnProperty("TRANSFORMATIONS")) {
                            for (val of options.COLUMNS) {
                                keyArray.push(this.validKeyWithGroup(val, query));
                            }
                        }
                        // else must be normal keys
                        else {
                            for (val of options.COLUMNS) {
                                keyArray.push(this.validKey(val));
                            }
                        }
                        Promise.all(keyArray)
                            .then((value: any) => {
                                //Log.trace("COLUMNS checkOptions Promise.all returned successfully")
                                //Log.trace("checkColumns fulfills");
                                fulfill();
                            })
                            .catch((e) => {
                                reject("invalid key in COLUMNS: " + e);
                            });
                    } else {
                        reject("COLUMNS is empty");
                    }
                } else {
                    reject("COLUMNS is not an array");
                }
            } else {
                reject("no COLUMNS property");
            }
        });
    }
    // checkOptions helper #2
    checkOrder(options: Options): Promise<any> {
        //Log.trace("Inside checkOrder");
        return new Promise((fulfill, reject) => {
            //-------------------------------------
            // checking if correct number of properties in OPTIONS
            // if 3: check if has ORDER (if not, then should have 2)
            if (Object.keys(options).length == 3) {
                // check if ORDER exists
                if (options.hasOwnProperty('ORDER')) {
                    // check if ORDER is string
                    if (typeof options.ORDER == 'string') {
                        // check if ORDER is valid key
                        //Log.trace("options.ORDER = " + options.ORDER + ", type = " + options.ORDER.constructor.name);
                        this.validKey(options.ORDER).then(() => {
                            // check if ORDER is in COLUMNS, if not is invalid
                            for (let key of options.COLUMNS) {
                                if (key == options.ORDER) {
                                    //Log.trace("checkOrder fulfills");
                                    fulfill();
                                }
                            }
                            //Log.trace("key in ORDER not in COLUMNS");
                            reject("key in ORDER not in COLUMNS");
                        }).catch(() => {
                            //Log.trace("invalid key in ORDER");
                            reject("invalid key in ORDER");
                        })
                    }
                    // ORDER is not string, therefore has to be Sort
                    else {
                        // FIXME: verify SORT validity
                        this.checkSort(options.ORDER).then(() => {
                            fulfill();
                        }).catch((err: string) => {
                            reject(err);
                        })
                    }
                } else {
                    reject("no ORDER property");
                }
            } else {
                if (Object.keys(options).length != 2) {
                    reject("too many properties in OPTIONS");
                } else {
                    fulfill();
                }
            }
        });
    }
    // FIXME: implement checkSort
    // checkOrder helper
    checkSort(sort: Sort): Promise<any> {
        //Log.trace("Inside checkSort");
        //Log.trace("sort in checkSort: " + JSON.stringify(sort));
        return new Promise((fulfill, reject) => {
            // check if sort is Object
            if (sort.constructor === Object) {
                // check if sort has two keys
                if (Object.keys(sort).length === 2) {
                    // check if sort has "dir" and "keys"
                    if (Object.keys(sort).indexOf("dir") !== -1 &&
                        Object.keys(sort).indexOf("keys") !== -1) {
                        // check if dir is either "UP" or "DOWN"
                        if (sort.dir === "UP" || sort.dir === "DOWN") {
                            // check if sort.keys is array
                            if (Array.isArray(sort.keys)) {
                                // check if each member of array is a string
                                for (let s of sort.keys) {
                                    if (typeof s !== 'string') {
                                        reject("member of sort is not string: " + String(s));
                                    }
                                }
                                //Log.trace("checkSort is valid, fulfills");
                                fulfill();
                            } else {
                                //Log.trace("sort is not an array");
                                reject("sort is not an array");
                            }
                        } else {
                            //Log.trace("dir is not UP or DOWN, it is: " + sort.dir);
                            reject("dir is not UP or DOWN, it is: " + sort.dir);
                        }
                    } else {
                        //Log.trace("sort doesn't have one of dir or keys");
                        reject("sort doesn't have one of dir or keys");
                    }
                } else {
                    //Log.trace("SORT " + JSON.stringify(sort) + " does not have two keys");
                    reject("SORT " + JSON.stringify(sort) + " does not have two keys");
                }
            } else {
                //Log.trace("ORDER is not a string or Object (\"SORT\")");
                reject("ORDER is not a string or Object (\"SORT\")");
            }
        });
    }
    // checkOptions helper #3
    checkForm(options: Options): Promise<any> {
        //Log.trace("Inside checkForm");
        let that = this;

        return new Promise(function (fulfill, reject) {
            //-------------------------------------
            // check if FORM exists
            if (options.hasOwnProperty('FORM')) {
                // check if FORM is string "TABLE"
                //Log.trace("options.FORM = " + options.FORM)
                if (options.FORM !== "TABLE") {
                    reject("FORM is not \"TABLE\"");
                } else {
                    //Log.trace("checkForm fulfills");
                    fulfill();
                }
            } else {
                reject("no FORM property");
            }
        });
    }

    // helper: checks if transformations are valid, rejects with string of all errors
    checkTransformations(transformations: Transformations): Promise<any> {
        //Log.trace("inside checkTransformations");
        return new Promise((fulfill, reject) => {
            // FIXME: implement checkTransformations
            if (transformations.constructor === Object) {
                // check if sort has two keys
                if (Object.keys(transformations).length === 2) {
                    // check if sort has "GROUP" and "APPLY"
                    if (Object.keys(transformations).indexOf("GROUP") !== -1 &&
                        Object.keys(transformations).indexOf("APPLY") !== -1) {
                        // check if GROUP is array
                        if (Array.isArray(transformations.GROUP)) {
                            // check to make sure each GROUP key is validKey name
                            let promisesGroup: Promise<any>[] = [];
                            let key: string;
                            for (key of transformations.GROUP) {
                                let pG: Promise<any> = this.validKey(key);
                                promisesGroup.push(pG);
                            }
                            Promise.all(promisesGroup).then(() => {
                                // check if APPLY is Array
                                if (Array.isArray(transformations.APPLY)) {
                                    // check to make sure each member of apply array is valid ApplyKey
                                    let promisesApply: Promise<any>[] = [];
                                    let applyKey: ApplyKey;
                                    for (applyKey of transformations.APPLY) {
                                        let pA: Promise<any> = this.validApplyKey(applyKey);
                                        promisesApply.push(pA);
                                    }
                                    Promise.all(promisesApply).then(() => {
                                        //Log.trace("fulfilled checkTransformations");
                                        fulfill();
                                    }).catch((err: string) => {
                                        //Log.trace("error in promise.all in checkTransformations: " + err);
                                        reject(err);
                                    })
                                } else {
                                    //Log.trace("APPLY not an array");
                                    reject("APPLY not an array");
                                }
                            }).catch((err: string) => {
                                //Log.trace(err);
                                reject(err);
                            })
                        } else {
                            //Log.trace("GROUP not an array");
                            reject("GROUP not an array");
                        }
                    } else {
                        //Log.trace("TRANSFORMATIONS doesn't have one of GROUP or APPLY");
                        reject("TRANSFORMATIONS doesn't have one of GROUP or APPLY");
                    }
                } else {
                    //Log.trace("TRANSFORMATIONS does not have two keys");
                    reject("TRANSFORMATIONS does not have two keys");
                }
            } else {
                //Log.trace("TRANSFORMATIONS is not Object");
                reject("TRANSFORMATIONS is not Object");
            }
        })
    }
    // helper to checkTransformations
    validApplyKey(applyKey: ApplyKey): Promise<any> {
        //Log.trace("inside validApplyKey");
        return new Promise((fulfill, reject) => {
            // FIXME: implement validApplyKey
            // check if applyKey is Object
            if (applyKey.constructor === Object) {
                let key: string = Object.keys(applyKey)[0];
                //Log.trace("key in apply key: " + key);
                //Log.trace("typeof key: " + typeof key);
                // check if key in applyKey is string
                if (typeof key === 'string') {
                    // check if key contains underscore, if so is invalid
                    if (key.indexOf("_") !== -1) {
                        //Log.trace("applyKey " + JSON.stringify(applyKey) + " key contains underscore");
                        reject("applyKey " + JSON.stringify(applyKey) + " key contains underscore");
                    }
                    // else is valid
                    else {
                        if (applyKey[key].constructor === Object) {
                            let applyToken: ApplyToken = applyKey[key];
                            let at: string = Object.keys(applyToken)[0];
                            //Log.trace("at in applyToken keys: " + at);
                            //Log.trace("typeof at: " + typeof at);
                            if (["MAX", "MIN", "AVG", "COUNT", "SUM"].indexOf(at) !== -1) {
                                this.validKey(applyToken[at]).then(() => {
                                    // TODO: check if type of key matches numerical value for ApplyToken
                                    //Log.trace("validApplyKey fulfills");
                                    fulfill();
                                }).catch(() => {
                                    //Log.trace("key of ApplyToken " + JSON.stringify(applyToken) + " is invalid");
                                    reject("key of ApplyToken " + JSON.stringify(applyToken) + " is invalid");
                                })
                            } else {
                                //Log.trace(JSON.stringify(applyToken) + " ApplyToken key is not valid");
                                reject(JSON.stringify(applyToken) + " ApplyToken key is not valid");
                            }
                        } else {
                            //Log.trace("applyKey " + JSON.stringify(applyKey) + " ApplyToken is not an Object");
                            reject("applyKey " + JSON.stringify(applyKey) + " ApplyToken is not an Object");
                        }
                    }
                } else {
                    //Log.trace("applyKey " + JSON.stringify(applyKey) + " key is not string");
                    reject("applyKey " + JSON.stringify(applyKey) + " key is not string");
                }
            } else {
                //Log.trace("applyKey " + JSON.stringify(applyKey) + " is not an object");
                reject("applyKey " + JSON.stringify(applyKey) + " is not an object");
            }
        })
    }

    // helper: validates keys with regex, fulfills if true, rejects otherwise
    validKey(key: string): Promise<any> {
        //Log.trace("Inside validKey");
        return new Promise((fulfill, reject) => {
            //Log.trace("key: " + key + " - type of key: " + typeof key);
            //Log.trace("typeof key === string? " + String(typeof key === 'string'));
            if (typeof key === 'string' &&
                /(.+_(avg|pass|fail|audit|year|dept|id|instructor|title|uuid|lat|lon|seats|fullname|shortname|number|name|address|type|furniture|href))/.test(key)) {
                var keyParts = key.split("_");
                var keyID = keyParts[0];
                // adds to array of missingIDs if it doesn't exists
                if (!this.dataAlreadyExists(keyID)) {
                    //Log.trace("validKey: pushing keyID into missingIDs, keyID = " + keyID);
                    if (this.missingIDs.indexOf(keyID) === -1) {
                        this.missingIDs.push(keyID);
                    }
                    //Log.trace("inside validKey, no dataset");
                }
                // try, catch if key is not valid string
                //Log.trace("keyID = " + keyID + ", type = " + (keyID).constructor.name);
                try {
                    if (/(courses_(avg|pass|fail|audit|year|dept|id|instructor|title|uuid))/.test(key) ||
                        /(rooms_(lat|lon|seats|fullname|shortname|number|name|address|type|furniture|href))/.test(key)) {
                        // sets activeDataset if not already set
                        if (this.activeDataset.length === 0) {
                            this.activeDataset = keyID;
                        } else if (this.activeDataset !== keyID) {
                            reject("unmatching IDs for key values");
                        }
                        //Log.trace("Fancy regex passed");
                        fulfill();
                    } else {
                        //Log.trace("validKey, " + String(key) + " is an invalid key");
                        reject("validKey, " + String(key) + " is an invalid key");
                    }
                } catch (e) {
                    //Log.trace("validKey error: " + e);
                    //Log.trace("validKey, " + String(key) + " failed try");
                    reject("validKey, " + String(key) + " failed try");
                }
            } else {
                //Log.trace("validKey, " + String(key) + " is not a string");
                reject(String(key) + " is not a string, or is invalid format");
            }

        });
    }

    validKeyWithGroup(key: string, query: QueryRequest): Promise<any> {
        //Log.trace("Inside validKeyWithGroup");

        return new Promise((fulfill, reject) => {
            //Log.trace("key: " + key + " - type of key: " + typeof key);
            //Log.trace("typeof key === string? " + String(typeof key === 'string'));
            if (typeof key === 'string' &&
                /(.+_(avg|pass|fail|audit|year|dept|id|instructor|title|uuid|lat|lon|seats|fullname|shortname|number|name|address|type|furniture|href))/.test(key)) {
                var keyParts = key.split("_");
                var keyID = keyParts[0];
                // adds to array of missingIDs if it doesn't exists
                if (!this.dataAlreadyExists(keyID)) {
                    //Log.trace("validKey: pushing keyID into missingIDs, keyID = " + keyID);
                    if (this.missingIDs.indexOf(keyID) === -1) {
                        this.missingIDs.push(keyID);
                    }
                    //Log.trace("inside validKey, no dataset");
                }
                // try, catch if key is not valid string
                //Log.trace("keyID = " + keyID + ", type = " + (keyID).constructor.name);
                try {
                    if (/(courses_(avg|pass|fail|audit|year|dept|id|instructor|title|uuid))/.test(key) ||
                        /(rooms_(lat|lon|seats|fullname|shortname|number|name|address|type|furniture|href))/.test(key)) {
                        // sets activeDataset if not already set
                        if (this.activeDataset.length === 0) {
                            this.activeDataset = keyID;
                        } else if (this.activeDataset !== keyID) {
                            reject("unmatching IDs for key values");
                        }
                        //Log.trace("Fancy regex passed");
                        // check if key is in GROUP
                        if (query.TRANSFORMATIONS.GROUP.indexOf(key) === -1) {
                            //Log.trace("Underscored key " + key + " not in GROUP");
                            reject("Underscored key " + key + " not in GROUP");
                        } else {
                            //Log.trace("validKeyWithGroup passed, key in GROUP");
                            fulfill();
                        }
                    } else {
                        //Log.trace("validKey, " + String(key) + " is an invalid key");
                        reject("validKey, " + String(key) + " is an invalid key");
                    }
                } catch (e) {
                    //Log.trace("validKey error: " + e);
                    //Log.trace("validKey, " + String(key) + " failed try");
                    reject("validKey, " + String(key) + " failed try");
                }
            } else {
                if (typeof key === 'string') {
                    // FIXME: check if it is in APPLY
                    let applyKey: ApplyKey;
                    // check each ApplyKey, see if key matches any of them
                    for (applyKey of query.TRANSFORMATIONS.APPLY) {
                        //Log.trace("applyKey in APPLY: " + JSON.stringify(applyKey));
                        if (Object.keys(applyKey)[0] === key) {
                            //Log.trace("validKeyWithGroup passed, key in APPLY");
                            fulfill();
                        }
                    }
                    //Log.trace("Non-underscored key " + key + " not in APPLY");
                    reject("Non-underscored key " + key + " not in APPLY");
                } else {
                    //Log.trace("key " + String(key) + " is not a string");
                    reject("key " + String(key) + " is not a string");
                }
            }

        });
    }


    // performQuery
    //  |
    //   - retrieveData
    retrieveData(query: QueryRequest): Promise<any> {
        //Log.trace("Inside retrieveData");
        var validSections: any[] = [];

        return new Promise((fulfill, reject) => {
            //Log.trace("Query is: " + JSON.stringify(query));
            let setId: string = this.activeDataset;
            //Log.trace("beginning parsing through: " + setId + ".json");
            //Log.trace("*************************************************");

            //Log.trace("setId: " + setId + ", going into courses or rooms");
            // ID = COURSES
            if (setId === "courses") {
                //Log.trace("setId = courses");
                // Read the data from the file
                var fileData: any = fs.readFileSync("courses.json", "utf8");
                let parsedData = JSON.parse(fileData);
                // Parse each course in the dataset
                for (let course in parsedData) {
                    //Log.trace("Parsing course = " + course);
                    //Log.trace(course + " has " + parsedData[course].length + " sections");
                    // Parse the sections of each course
                    for (let section of parsedData[course]) {
                        //Log.trace("section = " + JSON.stringify(section));
                        let s: Section = {
                            dept: section["dept"],
                            id: section["id"],
                            avg: section["avg"],
                            instructor: section["instructor"],
                            title: section["title"],
                            pass: section["pass"],
                            fail: section["fail"],
                            audit: section["audit"],
                            uuid: section["uuid"],
                            year: section["year"]
                        };
                        // FIXME: empty WHERE retrieves all rows, is true for all sections
                        if (this.matchesQuery(query["WHERE"], s)) {
                            //Log.trace("adding to validSections");
                            validSections.push(s);
                        }
                    }
                }

                // ID = ROOMS
            } else if (setId === "rooms") {
                //Log.trace("setId = rooms");
                // Read the data from the file
                var fileData: any = fs.readFileSync("rooms.json", "utf8");
                let parsedData = JSON.parse(fileData);
                // Parse each building in the dataset
                for (let building in parsedData) {
                    //Log.trace("Parsing building = " + building);
                    // Parse the rooms of each building
                    var rooms = parsedData[building]["rooms"];
                    if (rooms.length === 0) {
                        //Log.trace("Building has no rooms");
                    } else {
                        for (let room of rooms) {
                            let r: Room = {
                                fullname: parsedData[building]["fullname"],
                                shortname: parsedData[building]["shortname"],
                                number: room["number"],
                                name: room["name"],
                                address: parsedData[building]["address"],
                                lat: parsedData[building]["lat"],
                                lon: parsedData[building]["lon"],
                                seats: room["seats"],
                                type: room["type"],
                                furniture: room["furniture"],
                                href: room["href"]
                            };
                            //Log.trace("=======> room: " + JSON.stringify(room));
                            //Log.trace("=======> parsed name: " + r.name);
                            // FIXME: empty WHERE retrieves all rows, is true for all rooms
                            if (this.matchesQuery(query["WHERE"], r)) {
                                //Log.trace("adding to validSections: " + r.name);
                                validSections.push(r);
                            }
                        }
                    }
                }
            } else {
                //Log.trace("reject: retrieveData: invalid setId");
                reject("retrieveData: invalid setId");
            }
            if (validSections.length == 0) {
                ////Log.trace("reject: retrieveData: no results from query");
                reject("retrieveData: no results from query");
            } else {
                ////Log.trace("retrieveData fulfilling");
                fulfill(validSections);
            }
        });
    }

    matchesQuery(filter: Filter, section: Section | Room): boolean {
        //Log.trace("inside matchesQuery");
        //Log.trace("filter in matchesQuery: " + JSON.stringify(filter));
        // FIXME: if WHERE is an empty object, all match query
        if (Object.keys(filter).length === 0 && filter.constructor === Object) {
            //Log.trace("filter is empty and is an object, returns true in matchesQuery");
            return true;
        }
        var compValues: number[];
        var k = Object.keys(filter);
        //Log.trace("k[0] = " + k[0] + ", typeof(k[0]) = " + (k[0]).constructor.name);

        switch (k[0]) {
            // recursively makes sure section matches all filters
            case "AND":
                //Log.trace("AND found" + ", Filter.AND = " + JSON.stringify(filter.AND));
                for (var element of filter.AND) {
                    //Log.trace("AND found, element = " + JSON.stringify(element));
                    var bool: boolean = this.matchesQuery(element, section);
                    if (!bool) {
                        //Log.trace("went into the false bool for AND");
                        return false;
                    }
                    //Log.trace("finished AND element loop");
                }
                return true;
            // recursively makes sure section matches at least 1 filter
            case "OR":
                //Log.trace("OR found" + ", Filter.OR = " + JSON.stringify(filter.OR));
                var runs: boolean[] = [];
                for (var element of filter.OR) {
                    //Log.trace("OR found, element = " + JSON.stringify(element));
                    var bool: boolean = this.matchesQuery(element, section);
                    runs.push(bool);
                }
                for (var run of runs) {
                    if (run === true) {
                        return true;
                    }
                }
                return false;
            // checks values
            case "LT":
                //Log.trace("LT found" + ", Filter.LT = " + JSON.stringify(filter.LT));
                compValues = this.MCompareToSection(filter.LT, section);
                if (compValues.length === 0) {
                    //Log.trace("compValues in matchesQuery is empty");
                    return false;
                };
                return (compValues[0] > compValues[1]);
            case "GT":
                //Log.trace("GT found" + ", Filter.GT = " + JSON.stringify(filter.GT));
                compValues = this.MCompareToSection(filter.GT, section);
                if (compValues.length === 0) {
                    //Log.trace("compValues in matchesQuery is empty");
                    return false;
                };
                return (compValues[1] > compValues[0]);
            case "EQ":
                //Log.trace("EQ found" + ", Filter.EQ = " + JSON.stringify(filter.EQ));
                compValues = this.MCompareToSection(filter.EQ, section);
                if (compValues.length === 0) {
                    //Log.trace("compValues in matchesQuery is empty");
                    return false;
                };
                return (compValues[0] == compValues[1]);
            // checks strings
            case "IS":
                //Log.trace("IS found" + ", Filter.IS = " + JSON.stringify(filter.IS));
                return (this.SCompareToSection(filter.IS, section));
            // negates recursive call to check filter
            case "NOT":
                //Log.trace("filter.NOT (in matchesQuery): " + JSON.stringify(filter.NOT));
                //Log.trace("return value of NOT: " + !this.matchesQuery(filter.NOT, section));
                var b: boolean = this.matchesQuery(filter.NOT, section);
                return !b;
            default:
                break;
        }
        return false;
    }

    MCompareToSection(mC: any, section: Section | Room): number[] {
        //Log.trace("Inside MCompareToSection");
        var k = Object.keys(mC);
        var key = k[0];
        try {
            if (/((courses|rooms)_(avg|pass|fail|audit|year|lat|lon|seats))/.test(key)) {
                var keyType = this.keyToSection(key);
                if (section.hasOwnProperty(keyType)) {
                    return [mC[key], section[keyType]];
                }
                return [];
            }
        } catch (e) {
            //Log.trace("MCompareToSection error: " + e);
            //Log.trace("MCompareToSection " + String(key) + " is not a string");
        }
        return [];
    }

    SCompareToSection(sC: SComparison, section: Section | Room): boolean {
        var k = Object.keys(sC);
        var key = k[0];
        //Log.trace("k[0] = " + k[0] + ", type = " + (k[0]).constructor.name);
        try {
            if (/((courses|rooms)_(dept|id|instructor|title|uuid|fullname|shortname|number|name|address|type|furniture|href))/.test(key)) {
                var keyType: string = this.keyToSection(key);
                if (section.hasOwnProperty(keyType)) {
                    return (this.SCompareToSectionHelper(sC[key], section[keyType]));
                }
                return false;
            }
        } catch (e) {
            //Log.trace("SCompareToSection error: " + e);
            //Log.trace("SCompareToSection " + String(key) + " is not a string");
        }
        return false;
    }

    // helper to account for partial string queries
    SCompareToSectionHelper(sCProperty: string, sectionProperty: string): boolean {
        // var trimSC: string = sCProperty.replace('*', '');
        var trimSC: string = sCProperty;
        while (trimSC.indexOf("*") !== -1) {
            trimSC = trimSC.replace('*', '');
        }
        //Log.trace("sCProperty: " + sCProperty);
        //Log.trace("Testing string (should be 0)" + String(sCProperty.indexOf("*")));
        if (sCProperty.indexOf("*") == 0) {
            // *string*
            //Log.trace("Testing *string (should not be -1)" + String(sCProperty.indexOf("*")));
            if (sCProperty.indexOf("*", sCProperty.length - "*".length) !== -1) {
                //Log.trace("Inside *string*");
                return (sectionProperty.indexOf(trimSC) !== -1);
            }
            // *string
            else {
                //Log.trace("Inside *string");
                //Log.trace(sectionProperty + " ends with " + trimSC + ": " + sectionProperty.endsWith(sCProperty));
                return (sectionProperty.indexOf(trimSC, sectionProperty.length - trimSC.length) !== -1);
            }
        } else {
            // string*
            //Log.trace("Testing string* (should not be -1)" + String(sCProperty.indexOf("*")));
            if (sCProperty.indexOf("*", sCProperty.length - "*".length) !== -1) {
                //Log.trace("Inside string*");
                //Log.trace(sectionProperty + " starts with " + trimSC + ": " + sectionProperty.startsWith(sCProperty));
                return (sectionProperty.indexOf(trimSC) == 0);
            }
            // string
            else {
                //Log.trace("Inside string");
                //Log.trace("sectionProperty = sCProperty " + (sectionProperty === sCProperty));
                return (sectionProperty === sCProperty);
            }
        }
    }

    // performQuery
    //  |
    //   - retrieveData
    //      |
    //       - formatJsonResponse
    formatJsonResponse(query: QueryRequest, incomingSections: any[]): Promise<any> {
        //Log.trace("Inside formatJsonResponse");
        let options = query.OPTIONS;
        var returnJSON: ReturnJSON;
        var result: Object[] = [];
        let validSections: any[];

        return new Promise((fulfill, reject) => {
            this.dataTransformer(query, incomingSections).then((groups: Group[]) => {
                validSections = groups;
                // reforms validSections if TRANSFORMATIONS exists
                // sorts validSections by ORDER key
                if (options.hasOwnProperty('ORDER')) {
                    validSections.sort(this.sortHelper(options.ORDER, query));
                    //Log.trace("validSections (ordered): " + JSON.stringify(validSections));
                }
                //Log.trace("---> validSections sorted: " + JSON.stringify(validSections));
                let section: Section | Room | Group;
                //Log.trace("validSection length: " + validSections.length);
                for (section of validSections) {
                    //Log.trace("section: " + JSON.stringify(section));
                    let obj: Object = {};
                    var key: HashTable<string>;
                    // FIXME: case where column is ApplyKey
                    for (let column of options.COLUMNS) {
                        //Log.trace("column: " + column);
                        // if query has property TRANSFORMATIONS, don't trim key
                        var sectionKey: string;
                        if (query.hasOwnProperty("TRANSFORMATIONS")) {
                            sectionKey = column;
                        } else {
                            sectionKey = this.keyToSection(column);
                        }
                        //Log.trace("sectionKey: " + sectionKey);
                        try {
                            var val = section[sectionKey];
                            //Log.trace("val: " + val);
                        } catch (e) {
                            //Log.trace("e = " + e);
                        }
                        try {
                            (<any>obj)[(String(column))] = val;
                        } catch (e) {
                            //Log.trace("ee = " + e);
                        }
                    }
                    result.push(obj);
                }
                returnJSON = {
                    render: "TABLE",
                    result: (result)
                };
                //Log.trace("fulfilling formatJsonResponse...");
                //Log.trace("     - returnJSON render: " + returnJSON.render);
                //Log.trace("     - returnJSON result: " + JSON.stringify(returnJSON.result));
                fulfill(returnJSON);
            }).catch((err: string) => {
                reject(err);
            })
        });
    }
    // data transformer
    dataTransformer(query: QueryRequest, validSections: any[]): Promise<Group[]> {
        //Log.trace("inside dataTransformer");
        return new Promise((fulfill, reject) => {
            // FIXME: implement dataTransformer
            let groups: Group[] = [];
            if (!query.hasOwnProperty("TRANSFORMATIONS")) {
                fulfill(validSections);
            }
            // for each valid section
            for (let section of validSections) {
                //Log.trace("section: " + JSON.stringify(section));
                // check against each group in groups
                if (groups.length !== 0) {
                    //Log.trace("groups is not empty");
                    var foundMatchingGroup: boolean = false;
                    for (let group of groups) {
                        //Log.trace("group: " + JSON.stringify(group));
                        // for each key of GROUP
                        var sectionMatches: boolean = true;
                        for (let key of query.TRANSFORMATIONS.GROUP) {
                            //Log.trace("key: " + key);
                            if (group.hasOwnProperty(key)) {
                                // if section doesn't match groups value, section doesn't match
                                //Log.trace("section[this.keyToSection(key)]: " + section[this.keyToSection(key)]);
                                //Log.trace("group[key]: " + group[key]);
                                if (section[this.keyToSection(key)] !== group[key]) {
                                    //Log.trace("section doesn't match group property");
                                    sectionMatches = false;
                                    break;
                                } else {
                                    //Log.trace("section matches group property");
                                }
                            } else {
                                //Log.trace("group " + JSON.stringify(group) + " does not have property " + key);
                                //Log.trace("SHOULD NEVER EVER EVER EVER GET HERE!!!");
                                sectionMatches = false;
                            }
                        }
                        if (sectionMatches) {
                            //Log.trace("section matches group, merging into group");
                            // merge into group
                            foundMatchingGroup = true;
                            var groupIndex = groups.indexOf(group);
                            if (groupIndex !== -1) {
                                var returnedMerge: Group | string = this.mergeSectionGroup(section, {}, query.TRANSFORMATIONS);
                                if (typeof returnedMerge === 'string') {
                                    reject(returnedMerge);
                                } else {
                                    groups[groupIndex] = returnedMerge;
                                }
                            } else {
                                //Log.trace("group not found in groups, SHOULD NEVER GET HERE!!!!!");
                            }
                            break;
                        }
                    }
                    if (!foundMatchingGroup) {
                        var returnedMerge: Group | string = this.mergeSectionGroup(section, {}, query.TRANSFORMATIONS);
                        if (typeof returnedMerge === 'string') {
                            reject(returnedMerge);
                        } else {
                            groups.push(returnedMerge);
                        }
                    }
                }
                // groups is empty, add section to a group
                else {
                    //Log.trace("groups is empty, pushing new mergeSectionGroup");
                    var returnedMerge: Group | string = this.mergeSectionGroup(section, {}, query.TRANSFORMATIONS);
                    if (typeof returnedMerge === 'string') {
                        reject(returnedMerge);
                    } else {
                        groups.push(returnedMerge);
                    }
                }

            }
            //Log.trace("dataTransformer returns");
            fulfill(groups);
        });
    }
    // dataTransformer helper, merges section to group, or create new group if passed group is {}
    // returns a string error message if there is an error
    mergeSectionGroup(section: Section | Room, group: any, transformations: Transformations): Group | string {
        //Log.trace("inside mergeSectionGroup");

        // if group is empty
        let returnGroup: Group;

        if (Object.keys(group).length === 0 && group.constructor === Object) {
            //Log.trace("group is empty object, creating new group");
            returnGroup = {
                sum: 0,
                count: 0
            };
            // for each GROUP
            for (let groupKey of transformations.GROUP) {
                //Log.trace("groupKey: " + groupKey);
                let sectionGroupKey = this.keyToSection(groupKey);
                //Log.trace("group[" + groupKey + "] = " + section[sectionGroupKey]);
                returnGroup[groupKey] = section[sectionGroupKey];
            }
        }
        // else group exists
        else {
            //Log.trace("group is not empty object, already exists");
            returnGroup = group;
        }
        // for each applyKey
        for (let applyKey of transformations.APPLY) {
            //Log.trace("APPLY, applyKey = " + JSON.stringify(applyKey));
            // key gets ApplyKey key
            let key: string = Object.keys(applyKey)[0];
            //Log.trace("key: " + key);
            // applyToken gets ApplyKey ApplyToken
            let applyToken: string = Object.keys(applyKey[key])[0];
            //Log.trace("applyToken: " + applyToken);
            // sectionKey gets ApplyToken value
            let sectionKey: string = this.keyToSection(applyKey[key][applyToken]);
            //Log.trace("sectionKey: " + sectionKey);
            returnGroup.sum = returnGroup.sum + section[sectionKey];
            returnGroup.count = returnGroup.count + 1;
            switch (applyToken) {
                case "MAX":
                    //Log.trace("case: MAX");
                    // check if is numbers
                    if (isNaN(section[sectionKey])) {
                        return ("MAX key must be a number");
                    }
                    if (returnGroup.hasOwnProperty(key)) {
                        //Log.trace("section[sectionKey] " + section[sectionKey] + " > " + "returnGroup[key] " + returnGroup[key]);
                        if (section[sectionKey] > returnGroup[key]) {
                            returnGroup[key] = section[sectionKey];
                        }
                    } else {
                        //Log.trace("returnGroup[key] = section[sectionKey]: " + section[sectionKey]);
                        returnGroup[key] = section[sectionKey];
                    }
                    break;
                case "MIN":
                    //Log.trace("case: MIN");
                    // check if is numbers
                    if (isNaN(section[sectionKey])) {
                        return ("MIN key must be a number");
                    }
                    if (returnGroup.hasOwnProperty(key)) {
                        //Log.trace("section[sectionKey] " + section[sectionKey] + " < " + "returnGroup[key] " + returnGroup[key]);
                        if (section[sectionKey] < returnGroup[key]) {
                            returnGroup[key] = section[sectionKey];
                        }
                    } else {
                        //Log.trace("returnGroup[key] = section[sectionKey]: " + section[sectionKey]);
                        returnGroup[key] = section[sectionKey];
                    }
                    break;
                case "AVG":
                    //Log.trace("case: AVG");
                    // check if is numbers
                    if (isNaN(section[sectionKey])) {
                        return ("AVG key must be a number");
                    }
                    returnGroup[key] = returnGroup.sum / returnGroup.count;
                    break;
                case "COUNT":
                    //Log.trace("case: COUNT");
                    returnGroup[key] = returnGroup.count;
                    break;
                case "SUM":
                    //Log.trace("case: SUM");
                    // check if is numbers
                    if (isNaN(section[sectionKey])) {
                        return ("SUM key must be a number");
                    }
                    returnGroup[key] = returnGroup.sum;
                    break;
                default:
                    //Log.trace("defaulted in mergeSectionGroup, SHOULD NEVER GET HERE");
                    break;
            }
        }

        //Log.trace("mergeSectionGroup returns");
        return returnGroup;
    }

    sortHelper(courseKey: string | Sort, query: QueryRequest): any {
        //Log.trace("inside sortHelper");
        var key: string;
        // if courseKey is string
        if (typeof courseKey == 'string') {
            //Log.trace("courseKey " + courseKey + " is string");

            // stop trimming if things are in groups
            if (query.hasOwnProperty("TRANSFORMATIONS")) {
                key = courseKey;
            } else {
                key = this.keyToSection(courseKey);
            }
            //Log.trace("key: " + key);

            return (a: any, b: any) => {
                var returnSort: number = (a[key] < b[key]) ? -1 : (a[key] > b[key]) ? 1 : 0;
                return returnSort;
            }
        }
        // else is Sort
        else {
            //Log.trace("courseKey is Sort");
            // FIXME: implement the else case of sortHelper (SORT)
            // case if equal, sort by next, else sort by first
            let dir: "UP" | "DOWN" = courseKey.dir;
            // "normal" way to sort, values go UP as you go down the table
            if (dir === "UP") {
                //Log.trace("dir is UP");
                return (a: any, b: any) => {
                    let keys: string[] = courseKey.keys;
                    // for each key in keys, checks if they're equal, and if so moves to next key
                    for (var i = 0; i < keys.length; i++) {

                        // stop trimming if things are in groups
                        if (query.hasOwnProperty("TRANSFORMATIONS")) {
                            key = keys[i];
                        } else {
                            key = this.keyToSection(keys[i]);
                        }
                        //Log.trace("key: " + key);
                        // if not equal return sort number, else increment
                        if (a[key] !== b[key]) {
                            //Log.trace("a " + key + " " + a[key] + " and " + "b " + key + " " + [key] + " are different");
                            var returnSort = (a[key] < b[key]) ? -1 : (a[key] > b[key]) ? 1 : 0;
                            return returnSort;
                        }
                    }
                    return returnSort;
                }
            }
            // "alternative" way to sort, values go DOWN as you go down the table
            else {
                //Log.trace("dir is DOWN, hopefully");
                return (a: any, b: any) => {
                    let keys: string[] = courseKey.keys;
                    // for each key in keys, checks if they're equal, and if so moves to next key
                    for (var i = 0; i < keys.length; i++) {

                        // stop trimming if things are in groups
                        if (query.hasOwnProperty("TRANSFORMATIONS")) {
                            key = keys[i];
                        } else {
                            key = this.keyToSection(keys[i]);
                        }
                        //Log.trace("key: " + key);
                        // if not equal return sort number, else increment
                        if (a[key] !== b[key]) {
                            //Log.trace("a " + key + " " + a[key] + " and " + "b " + key + " " + b[key] + " are different");
                            var returnSort = (a[key] > b[key]) ? -1 : (a[key] < b[key]) ? 1 : 0;
                            return returnSort;
                        }
                    }
                    return returnSort;
                }
            }
        }
    }

    // takes string (name of Key), turns into section by trimming
    keyToSection(key: string): string {
        if (key.indexOf("_") !== -1) {
            var keyParts: string[] = key.split("_");
            var keyType: string = keyParts[1];
        } else {
            keyType = key;
        }
        return keyType;
    }
*/
}