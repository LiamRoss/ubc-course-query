/**
 * This is the main programmatic entry point for the project.
 */
import {
    IInsightFacade,
    InsightResponse,
    QueryRequest,
    Filter,
    MComparison,
    SComparison,
    Options,
    Section,
    Room,
    ReturnJSON,
    Key
} from "./IInsightFacade";

import Log from "../Util";
import {stringify} from "querystring";
import {Hash} from "crypto";
import {type} from "os";
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
interface HashTable < T > {
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
    private dataSets: HashTable < HashTable < Object[] >> = {};

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
        } catch(e) {
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
            let parsedData =  parse5.parse(data);
            return parsedData.childNodes[0].nodeName == "#documentType";
        } catch(e) {
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
            if(sessionData.Section == "overall") year = 1900;

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
        for(let i in div.childNodes) {
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
        for(let divChilds in div.attrs) {
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
        for(let i in div.childNodes) {
            if(div.childNodes[i].nodeName == "table") {
                for(let j in div.childNodes[i].childNodes) {
                    if(div.childNodes[i].childNodes[j].nodeName == "tbody") {
                        //Log.trace("                            found a tbody, lets check it for room information...");
                        for(let k in div.childNodes[i].childNodes[j].childNodes) {
                            if(div.childNodes[i].childNodes[j].childNodes[k].nodeName == "tr") {
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

                                for(let l in tr.childNodes) {
                                    if(tr.childNodes[l].nodeName == "td") {
                                        let td = tr.childNodes[l];
                                        let tdVal = that.getDivAttrsValue(td);

                                        switch(tdVal) {
                                            case "views-field views-field-field-room-number":
                                                /*
                                                 * This part contains the href as well as the room number
                                                 */
                                                for(let c in td.childNodes) {
                                                    if(td.childNodes[c].nodeName == "a") {
                                                        href = that.getDivAttrsValue(td.childNodes[c]);
                                                        //Log.trace("                            href found: " + href);
                                                        for(let d in td.childNodes[c].childNodes) {
                                                            if(td.childNodes[c].childNodes[d].nodeName == "#text"){
                                                                number = (<any>(td.childNodes[c].childNodes[d])).value;
                                                                name = (fileName.replace(/^.*[\\\/]/, '')).concat("_").concat(number);
                                                                //Log.trace("                            room number found: " + number + ", setting its name to: " + name);
                                                            }
                                                        }
                                                    }
                                                }
                                                break;

                                            case "views-field views-field-field-room-capacity":
                                                for(let c in td.childNodes) {
                                                    if(td.childNodes[c].nodeName == "#text") {
                                                        seats = parseInt((<any>(td.childNodes[c])).value);
                                                        //Log.trace("                            seats found: " + seats);
                                                    }
                                                }
                                                break;

                                            case "views-field views-field-field-room-furniture":
                                                for(let c in td.childNodes) {
                                                    if(td.childNodes[c].nodeName == "#text") {
                                                        furniture = ((<any>(td.childNodes[c])).value).trim();
                                                        //Log.trace("                            furniture found: " + furniture);
                                                    }
                                                }
                                                break;

                                            case "views-field views-field-field-room-type":
                                                for(let c in td.childNodes) {
                                                    if(td.childNodes[c].nodeName == "#text") {
                                                        type = ((<any>(td.childNodes[c])).value).trim();
                                                        //Log.trace("                            type found: " + type);
                                                    }
                                                }
                                                break;
                                            // parser for index.htm file, oushes each to list of validBuildings
                                            case "views-field views-field-field-building-code":
                                                for(let c in td.childNodes) {
                                                    if(td.childNodes[c].nodeName == "#text") {
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
        return new Promise(function(fulfill) {
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

        return new Promise(function(fulfill, reject) {

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

                if(statusCode !== 200) {
                    error = new Error("lat-lon request failed. Status code: " + statusCode);
                } else if (!/^application\/json/.test(contentType)) {
                    error = new Error("Invalid content type.");
                }

                if(error) {
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
                    } catch(ee) {
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

        for(let i in div.childNodes) {
            let divValueParent = that.getDivAttrsValue(div.childNodes[i]);
            if(divValueParent == "building-field") {
                //Log.trace("                            building-field found!");
                for(let j in div.childNodes[i].childNodes) {
                    let divValueChild = that.getDivAttrsValue(div.childNodes[i].childNodes[j]);
                    if(divValueChild == "field-content") {
                        //Log.trace("                                field-content found!");
                        for(let k in div.childNodes[i].childNodes[j].childNodes) {
                            let textDiv = div.childNodes[i].childNodes[j].childNodes[k];
                            switch(textDiv.nodeName) {
                                case "#text":
                                    /*
                                     * Printing of building-info such as address, hours, href
                                     */
                                    let text = (<any>(textDiv)).value;
                                    //Log.trace("                            text found, it's data is... " + text + (text.indexOf("hours") >= 0) + (text.indexOf("Hours") >= 0));
                                    if(text.indexOf("hours") < 0 && text.indexOf("Hours") < 0 && text.indexOf("TBD") < 0 && text.indexOf("construction") < 0) {
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
            } else if(div.childNodes[i].nodeName == "h2") {
                for(let j in div.childNodes[i].childNodes) {
                    if(div.childNodes[i].childNodes[j].nodeName == "span") {
                        for(let k in div.childNodes[i].childNodes[j].childNodes) {
                            if(div.childNodes[i].childNodes[j].childNodes[k].nodeName == "#text") {
                                fullname = (<any>(div.childNodes[i].childNodes[j].childNodes[k])).value;
                                //Log.trace("                            fullname found, it's data is... " + fullname);
                            }
                        }
                    }
                }
            }
        }

        return new Promise(function(fulfill, reject) {
            if(that.isValidBuilding(shortname)) {
                if(address.indexOf("construction") < 0 && address.indexOf("TBD") < 0) {


                    //Log.trace("valid building in getlatlon!" + shortname);
                    that.getLatLon(address)
                        .then(function(body: any) {
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
                        .catch(function(err: any) {
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

        if(that.getDivAttrsValue(div) == "building-info") {
            //Log.trace("FBI");
            that.foundDivs[fileName].push(div);
        } else if(that.getDivAttrsValue(div) == "view-content") {
            if(that.hasTbody(div)) {
                //Log.trace("FVC with table");
                that.foundDivs[fileName].push(div);
            }
        }

        if(div.childNodes) {
            for(let x in div.childNodes) {
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
        var dataHashTable: HashTable < any > = {};
        that.dataSets[id] = dataHashTable;

        let promises: Promise<any>[] = [];

        // Initialize it
        that.foundDivs[fileName] = [];
        that.checkChilds(div, fileName);
        //Log.trace("Checking " +  that.foundDivs[fileName]);

        /*
         * Parse the found divs
         */
        for(let k in that.foundDivs[fileName]) {
            if(that.getDivAttrsValue(that.foundDivs[fileName][k]) == "building-info") {
                let p: Promise<any> = that.parseBuildingInfo(that.foundDivs[fileName][k], fileName);
                promises.push(p);
            } else if(that.getDivAttrsValue(that.foundDivs[fileName][k]) == "view-content") {
                let p: Promise<any> = that.parseViewContent(that.foundDivs[fileName][k], fileName);
                promises.push(p);
            }
        }

        return new Promise(function(fulfill, reject) {
            Promise.all(promises)
                .then(function(ret: any) {
                    //Log.trace("Success!");

                    let rooms: Object[] = [];
                    let building: any = {};
                    for(let k in ret) {
                        if(ret[k].constructor.name == "Array") {
                            // This means it contains the array of room objects
                            rooms = ret[k];
                        } else if(ret[k].constructor.name == "Object") {
                            // This means it is the building object
                            building = ret[k];
                        }
                    }

                    // Now add the rooms array to the building object
                    building["rooms"] = rooms;
                    //Log.trace("Rooms added to building for " + fileName + "successfully!");

                    // Now add it to the dataSets global var
                    if (that.isValidBuilding(building['shortname'])) {
                        // //Log.trace("=============> id for dataset: " + id);
                        // //Log.trace("=============> fileName for dataset: " + fileName);
                        that.dataSets[id][fileName] = building;
                        //Log.trace("And " + fileName + " stored in the global var, fulfilling...");
                        //Log.trace("Valid buildings = " + that.validBuildings)
                        fulfill(building);
                    } else {
                        //Log.trace(fileName + " not in the index.htm file so does not need to be added");
                        fulfill();
                    }

                })
                .catch(function(err) {
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

        for(var s of that.validBuildings) {
            if(s == shortName) {
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

        return new Promise(function(fulfill, reject) {
            for (let i in document.childNodes) {
                if(document.childNodes[i].nodeName == "html") {
                    /*
                     * html of file found
                     */
                    //Log.trace("    Found html...");
                    for(let j in document.childNodes[i].childNodes) {
                        //Log.trace("        " + document.childNodes[i].childNodes[j].nodeName);
                        if(document.childNodes[i].childNodes[j].nodeName == "body") {
                            /*
                             * body of html found
                             */
                            //Log.trace("        Found body...");
                            for(let k in document.childNodes[i].childNodes[j].childNodes) {
                                if(document.childNodes[i].childNodes[j].childNodes[k].nodeName == "div") {
                                    /*
                                     * div found in body of html
                                     */
                                    //Log.trace("            Found div...");
                                    //Log.trace("            Div type: " + that.getDivAttrsValue(document.childNodes[i].childNodes[j].childNodes[k]))
                                    if(that.getDivAttrsValue(document.childNodes[i].childNodes[j].childNodes[k]) == "full-width-container") {
                                        /*
                                         * div identified as full-width-container
                                         */
                                        //Log.trace("                It has value = full-width-container...");
                                        //Log.trace("                Beginning recursive div search on it...");
                                        // Pass it into the helper function to recursively check it for the information we want
                                        that.parseFullWidthContainerDiv(document.childNodes[i].childNodes[j].childNodes[k], fileName, id)
                                            .then(function(ret: any) {
                                                //Log.trace("that.parseFullWidthContainerDiv success.");
                                                fulfill(ret);
                                            })
                                            .catch(function(err: any) {
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
    addToDatabase(id: string, content: string): Promise < any > {
        let that = this;

        return new Promise(function (fulfill, reject) {
            //Log.trace("Inside addToDatabase, adding " + id);

            let zip = new JSZip();
            zip.loadAsync(content, { base64: true })
                .then(function (asyncData: any) {
                    //Log.trace("loadAsync success");

                    var promises: Promise < any > [] = [];

                    // Add the dataset to dataSet
                    var dataHashTable: HashTable < Object[] > = {};
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
                            for(let x in ret) {
                                if(fileNames[<any>x].includes("index.htm")) {
                                    that.createHtmObject(ret[x], fileNames[<any>x], id);
                                }
                            }

                            for (let k in ret) {
                                //Log.trace(fileNames[ < any > k] + " stored.");
                                // Check if the file is a valid JSON file
                                let isJson: boolean = that.isValidJsonFile(ret[k]);
                                if (isJson == false) {

                                    // If not, check if it is a valid htm/html file
                                    let isHtm: boolean = that.isValidHtmFile(ret[k]);
                                    if(isHtm == false) {

                                        // Ignore the "error" if the item being analyzed is a directory/folder
                                        if(fileNames[<any>k].slice(-1) != "/") {

                                            // Now make sure its not a .DS_Store file
                                            if (!fileNames[<any>k].includes(".DS_Store")) {
                                                shouldWrite = false;
                                                reject("file named '" + fileNames[< any > k] + "' (#" + k + " in '" + id + "') is not a valid file.");
                                            }
                                        }
                                    } else {
                                        //Log.trace(fileNames[<any>k] + " is a valid html file");
                                        isHtmWrite = true;
                                        try {
                                            if(!fileNames[<any>k.includes("index")]) {
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
                                    dataHashTable[fileNames[ < any > k]] = obj;
                                }
                            }
                            //Log.trace("htmWrite = " + isHtmWrite + ", jsonWrite = " + isJsonWrite);
                            if (shouldWrite == true && isJsonWrite) {
                                try { that.writeToDisk(id); } catch(e) { 
                                    //Log.trace("Error while writing to disk, error: " + e); 
                                }
                                fulfill();
                            } else if(shouldWrite == true && isHtmWrite) {
                                Promise.all(promisesHtm)
                                    .then(function(ret) {
                                        //Log.trace("done?! ... ret = " + JSON.stringify(ret));

                                        //Log.trace("stuff to write: " + JSON.stringify(that.dataSets[id]));

                                        try { that.writeToDisk(id); } catch(e) { 
                                            //Log.trace("Error while writing to disk, error: " + e); 
                                        }
                                        fulfill();
                                    })
                                    .catch(function(err) {
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
    addDataset(id: string, content: string): Promise < InsightResponse > {
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


    removeDataset(id: string): Promise < InsightResponse > {
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
    performQuery(query: QueryRequest): Promise < InsightResponse > {
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
                    that.retrieveData(query)
                        .then(function (validSections: any[]) {
                            that.formatJsonResponse(query.OPTIONS, validSections)
                                .then(function (response: ReturnJSON) {
                                    ir.code = 200;
                                    ir.body = response;
                                    //Log.trace("ReturnJSON: " + JSON.stringify(response));
                                    //Log.trace("formatJsonResponse -> performQuery fulfill");
                                    fulfill(ir);
                                })
                                // 3. catch for formatJsonResponse
                                .catch(function () {
                                    ir.code = 400;
                                    ir.body = {
                                        "error": "failed to format JSON response"
                                    };
                                    //Log.trace("formatJsonResponse -> performQuery reject");
                                    reject(ir);
                                })
                        })
                        // 2. catch for retrieveData
                        .catch(function (err: string) {
                            //Log.trace("err.length !=0");
                            ir.code = 400;
                            //Log.trace("ir.code = " + ir.code);
                            ir.body = {
                                "error": err
                            };
                            //Log.trace("ir.body = " + JSON.stringify(ir.body));
                            reject(ir);
                        })
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
    validQuery(query: QueryRequest): Promise < any > {
        //Log.trace("Inside validQuery");
        let that = this;

        return new Promise(function (fulfill, reject) {
            var promises: Promise < any > [] = [];
            //Log.trace("query = " + JSON.stringify(query));
            // checks if query only has two properties
            promises[0] = that.validQueryProperties(query);
            promises[1] = that.validWhere(query);
            promises[2] = that.validOptions(query);

            Promise.all(promises)
                .then(function () {
                    if (that.missingIDs.length === 0) {
                        fulfill();
                    } else {
                        reject();
                    }
                })
                .catch(function (err: string) {
                    reject(err);
                })
        });
    }
    // validQuery helper #1
    validQueryProperties(query: QueryRequest): Promise < any > {
        //Log.trace("Inside validQueryProperties");
        let that = this;

        return new Promise(function (fulfill, reject) {
            //-------------------------------------
            // checking to make sure it only has two properties
            if (Object.keys(query).length != 2) {
                reject("wrong number of properties in QueryRequest");
            } else {
                //Log.trace("validQueryProperties fulfills");
                fulfill();
            }
        });
    }
    // validQuery helper #2
    validWhere(query: QueryRequest): Promise < any > {
        //Log.trace("Inside validWhere");
        let that = this;

        return new Promise(function (fulfill, reject) {
            // checking if WHERE exists
            if (query.hasOwnProperty('WHERE')) {
                // check WHERE internals
                that.checkFilter(query.WHERE).then(function () {
                        //Log.trace("validWhere fulfills");
                        fulfill();
                    })
                    .catch(function (s: string) {
                        reject(s);
                    })
            } else {
                reject("no WHERE property");
            }
        });
    }
    // validQuery helper #3
    validOptions(query: QueryRequest): Promise < any > {
        //Log.trace("Inside validOptions");
        let that = this;

        return new Promise(function (fulfill, reject) {
            //-------------------------------------
            // checking if OPTIONS exists
            if (query.hasOwnProperty('OPTIONS')) {
                // check OPTIONS
                that.checkOptions(query.OPTIONS)
                    .then(function () {
                        //Log.trace("validOptions fulfills");
                        fulfill();
                    })
                    .catch(function (s: string) {
                        reject(s);
                    })
            } else {
                reject("no OPTIONS property");
            }
        });
    }

    // helper: checks if filter is valid, rejects with string of all errors
    checkFilter(filter: Filter): Promise < any > {
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
    checkLogicComparison(filters: Filter[]): Promise < any > {
        //Log.trace("Inside checkLogicComparison");
        let that = this;

        return new Promise(function (fulfill, reject) {
            // check if filters is in an array
            if (filters.constructor === Array) {
                // check if filters is empty array
                if (filters.length > 0) {
                    // check if each member of array is valid Filter
                    var promises: Promise < any > [] = [];
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
    checkMComparison(mC: any): Promise < any > {
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
    checkSComparison(sC: any): Promise < any > {
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
    checkOptions(options: Options): Promise < any > {
        //Log.trace("Inside checkOptions");
        let that = this;

        return new Promise(function (fulfill, reject) {
            var promises: Promise < any > [] = [];
            //Log.trace("options = " + JSON.stringify(options));
            promises[0] = that.checkColumns(options);
            promises[1] = that.checkOrder(options);
            promises[2] = that.checkForm(options);

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
    checkColumns(options: Options): Promise < any > {
        //Log.trace("Inside checkColumns");
        let that = this;

        return new Promise(function (fulfill, reject) {
            //-------------------------------------
            // checking if COLUMNS exists
            if (options.hasOwnProperty('COLUMNS')) {
                // check if COLUMNS is in an array
                if (options.COLUMNS.constructor === Array) {
                    // check if COLUMNS is empty array
                    if (options.COLUMNS.length > 0) {
                        // check if each member of array is valid key
                        var val;
                        var keyArray: Promise < any > [] = [];
                        for (val of options.COLUMNS) {
                            keyArray.push(that.validKey(val));
                        }
                        Promise.all(keyArray)
                            .then(function (value: any) {
                                //Log.trace("COLUMNS checkOptions Promise.all returned successfully")
                                //Log.trace("checkColumns fulfills");
                                fulfill();
                            })
                            .catch(function (e) {
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
    checkOrder(options: Options): Promise < any > {
        //Log.trace("Inside checkOrder");
        let that = this;

        return new Promise(function (fulfill, reject) {
            //-------------------------------------
            // checking if correct number of properties in OPTIONS
            // if 3: check if has ORDER (if not, then should have 2)
            if (Object.keys(options).length == 3) {
                // check if ORDER exists
                if (options.hasOwnProperty('ORDER')) {
                    // check if ORDER is valid key
                    //Log.trace("options.ORDER = " + options.ORDER + ", type = " + options.ORDER.constructor.name);
                    that.validKey(options.ORDER).then(function () {
                        for (let key of options.COLUMNS) {
                            if (key === options.ORDER) {
                                //Log.trace("checkOrder fulfills");
                                fulfill();
                            }
                        }
                        reject("key in ORDER not in COLUMNS");
                    }).catch(function () {
                        reject("invalid key in ORDER");
                    })
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
    // checkOptions helper #3
    checkForm(options: Options): Promise < any > {
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

    // helper: validates keys with regex, fulfills if true, rejects otherwise
    validKey(key: any): Promise < any > {
        //Log.trace("Inside validKey");
        let that = this;

        return new Promise(function (fulfill, reject) {
            //Log.trace("key: " + key + " - type of key: " + typeof key);
            //Log.trace("typeof key === string? " + String(typeof key === 'string'));
            if (typeof key === 'string' && 
            /(.+_(avg|pass|fail|audit|year|dept|id|instructor|title|uuid|lat|lon|seats|fullname|shortname|number|name|address|type|furniture|href))/.test(key)) {
                var keyParts = key.split("_");
                var keyID = keyParts[0];
                // adds to array of missingIDs if it doesn't exists
                if (!that.dataAlreadyExists(keyID)) {
                    //Log.trace("validKey: pushing keyID into missingIDs, keyID = " + keyID);
                    if (that.missingIDs.indexOf(keyID) === -1) {
                        that.missingIDs.push(keyID);
                    }
                    // that.missingIDs.push(keyID);
                    //Log.trace("inside validKey, no dataset");
                }
                // try, catch if key is not valid string
                //Log.trace("keyID = " + keyID + ", type = " + (keyID).constructor.name);
                try {
                    if (/(courses_(avg|pass|fail|audit|year|dept|id|instructor|title|uuid))/.test(key) ||
                    /(rooms_(lat|lon|seats|fullname|shortname|number|name|address|type|furniture|href))/.test(key)) {
                        // sets activeDataset if not already set
                        if (that.activeDataset.length === 0) {
                            that.activeDataset = keyID;
                        } else if (that.activeDataset !== keyID) {
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


    // performQuery
    //  |
    //   - retrieveData
    retrieveData(query: QueryRequest): Promise < any > {
        //Log.trace("Inside retrieveData");
        let that = this;
        var validSections: any[] = [];

        return new Promise(function (fulfill, reject) {
            // For each data set on disk
            for (let setId in that.dataSets) {
                // only use dataset specified by activeDataset
                if (setId === that.activeDataset) {
                    //Log.trace("Query is: " + JSON.stringify(query));
                    //Log.trace("beginning parsing through: " + setId + ".json");
                    //Log.trace("*************************************************");

                    // Read the data from the file
                    var fileData: any = fs.readFileSync(setId + ".json", "utf8");
                    let parsedData = JSON.parse(fileData);
                    //Log.trace("typeOf(fileData) = " + fileData.constructor.name + ", typeOf(parsedData) = " + parsedData.constructor.name);

                    // ID = COURSES
                    if (setId === "courses") {
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
                                if (that.matchesQuery(query["WHERE"], s)) {
                                    //Log.trace("adding to validSections");
                                    validSections.push(s);
                                }
                            }
                        }

                    // ID = ROOMS
                    } else if (setId === "rooms") {
                        // Parse each building in the dataset
                        for (let building in parsedData) {
                            //Log.trace("Parsing building = " + building);
                            // Parse the rooms of each building
                            var rooms = parsedData[building]["rooms"];
                            if (rooms.length === 0) {

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

                                    if (that.matchesQuery(query["WHERE"], r)) {
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
                }
            }
            if (validSections.length == 0) {
                //Log.trace("reject: retrieveData: no results from query");
                reject("retrieveData: no results from query");
            } else {
                //Log.trace("retrieveData fulfilling");
                fulfill(validSections);
            }
        });
    }

    matchesQuery(filter: Filter, section: Section): boolean {
        //Log.trace("inside matchesQuery");
        let that = this;
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

    MCompareToSection(mC: any, section: any): number[] {
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

    SCompareToSection(sC: any, section: any): boolean {
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
    formatJsonResponse(options: Options, validSections: any[]): Promise < any > {
        //Log.trace("Inside formatJsonResponse");
        let that = this;
        var returnJSON: ReturnJSON;
        var result: Object[] = [];

        return new Promise(function (fulfill, reject) {
            // sorts validSections by ORDER key
            if (options.hasOwnProperty('ORDER')) {
                validSections.sort(that.sortHelper(options.ORDER));
            }
            // validSections.sort(that.sortHelper(options.ORDER));
            //Log.trace("validSections sorted");

            for (let section of validSections) {
                // //Log.trace("Creating columns for " + section.dept + section.id);
                //Log.trace("Creating columns for " + section.name);
                let obj: Object = {};
                var key: HashTable < string > ;
                for (let column of options.COLUMNS) {
                    var sectionKey: any = that.keyToSection(String(column));
                    try {
                        var val = section[sectionKey];
                    } catch (e) {
                        //Log.trace("e = " + e);
                    }

                    //Log.trace(" ");
                    //Log.trace("    Adding " + column + " column");
                    //Log.trace("    sectionKey = " + sectionKey);
                    //Log.trace("    val = " + val);
                    try {
                        key[String(column)] = val;
                    } catch (e) {
                        //Log.trace("ee = " + e);
                    }

                    try {
                        ( < any > obj)[(String(column))] = val;
                    } catch (e) {
                        //Log.trace("eee = " + e);
                    }
                }
                result.push(obj);
                //Log.trace("    All columns created for " + section.dept);
            }
            returnJSON = {
                render: "TABLE",
                result: (result)
            };
            //Log.trace("fulfilling formatJsonResponse...");
            //Log.trace("     - returnJSON render: " + returnJSON.render);
            //Log.trace("     - returnJSON result: " + JSON.stringify(returnJSON.result));
            fulfill(returnJSON);
        });
    }

    // TODO: order by string also
    sortHelper(courseKey: string): any {
        var key: string;
        key = this.keyToSection(courseKey);

        return function (a: any, b: any) {
            var returnSort = (a[key] < b[key]) ? -1 : (a[key] > b[key]) ? 1 : 0;
            return returnSort;
        }
    }

    keyToSection(key: string): string {
        var keyParts: string[] = key.split("_");
        var keyType: string = keyParts[1];
        return keyType;
    }

}