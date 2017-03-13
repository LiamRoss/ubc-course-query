/*
 * This is the primary high-level API for the project. In this folder there should be:
 * A class called InsightFacade, this should be in a file called InsightFacade.ts.
 * You should not change this interface at all or the test suite will not work.
 */



// ===================================
// INSIGHTRESPONSE INTERFACE
export interface InsightResponse {
    code: number;
    body: {}; // the actual response
}



// ===================================
// RETURNJSON INTERFACE
// interface for returned JSON
export interface ReturnJSON {
    render: string; // must be 'TABLE'
    result: Object[];
}



// ===================================
// QUERYREQUEST INTERFACES
export interface QueryRequest {
    WHERE:   Filter;
    OPTIONS: Options;
    TRANSFORMATIONS?: Transformations;
}
// BODY
export interface Filter {
    // LOGICCOMPARISON
    AND?: Filter[];
    OR?:  Filter[];
    // MCOMPARISON:
    //  note:   key has to be format:       string '_' string
    //          number has to be format:    [1-9]* [0-9]+ ( '.' [0-9]+ )?
    //          string has to be format:    [a-zA-Z0-9,_#x2D]+
    LT?: MComparison;
    GT?: MComparison;
    EQ?: MComparison;
    // SCOMPARISON:
    //  note:   string can be either "string" or "*string*"
    IS?: SComparison; // {' key ':' '*'? string '*'? '}
    // NEGATION:
    NOT?: Filter;
}
export interface  MComparison {
    courses_avg?:           number; //The average of the course offering.
    courses_pass?:          number; //The number of students that passed the course offering.
    courses_fail?:          number; //The number of students that failed the course offering.
    courses_audit?:         number; //The number of students that audited the course offering.
    [key: string]:          number;
}
export interface  SComparison {
    courses_dept?:          string; //The department that offered the course.
    courses_id?:            string; //The course number (will be treated as a string (e.g., 499b)).
    courses_instructor?:    string; //The instructor teaching the course offering.
    courses_title?:         string; //The name of the course.
    courses_uuid?:          string; //The unique id of a course offering.
    [key: string]:          string;
}
// OPTIONS
export interface Options {
    //  reminder:   key has to be format: string '_' string
    COLUMNS: string[];     // must be key[], one or more
    ORDER?: string | Sort; // ('{ dir:'  DIRECTION ', keys: [ ' string (',' string)* ']}' | key)
    FORM: "TABLE";       // must be "TABLE"
}
export interface Sort {
    //  reminder:   key has to be format: string '_' string
    dir: "UP" | "DOWN";
    keys: string[]; // 
}
// TRANSFORMATIONS
export interface Transformations {
    GROUP: string[];     // must be key[], one or more
    APPLY: ApplyKey[];     // must be key, can be empty
    [key: string]: any;
}
export interface ApplyKey {
    [key: string]: ApplyToken; // key must NOT contain "_" char
}
export interface ApplyToken {
    MAX?: string;   // numbers only
    MIN?: string;   // numbers only
    AVG?: string;   // numbers only
    COUNT?: string; // numbers and string fields
    SUM?: string;   // numbers only
    [key: string]: string;
}



// ===================================
// KEY-RELATED INTERFACES
// all Keys for courses + rooms
export interface Key {
    courses_dept?:          string; //The department that offered the course.
    courses_id?:            string; //The course number (will be treated as a string (e.g., 499b)).
    courses_avg?:           number; //The average of the course offering.
    courses_instructor?:    string; //The instructor teaching the course offering.
    courses_title?:         string; //The name of the course.
    courses_pass?:          number; //The number of students that passed the course offering.
    courses_fail?:          number; //The number of students that failed the course offering.
    courses_audit?:         number; //The number of students that audited the course offering.
    courses_uuid?:          string; //The unique id of a course offering.
    rooms_fullname:         string; //Full building name (e.g., "Hugh Dempster Pavilion").
    rooms_shortname:        string; //Short building name (e.g., "DMP").
    rooms_number:           string; //The room number. Not always a number, so represented as a string.
    rooms_name:             string; //The room id; should be rooms_shortname+"_"+rooms_number.
    rooms_address:          string; //The building address. (e.g., "6245 Agronomy Road V6T 1Z4").
    rooms_lat:              number; //The latitude of the building. Instructions for getting this field are below.
    rooms_lon:              number; //The longitude of the building. Instructions for getting this field are below.
    rooms_seats:            number; //The number of seats in the room.
    rooms_type:             string; //The room type (e.g., "Small Group").
    rooms_furniture:        string; //The room type (e.g., "Classroom-Movable Tables & Chairs").
    rooms_href:             string; //The link to full details online (e.g., "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-201").
    [key: string]: any;
}
// interface structure for Section
export interface Section {
    dept: string;
    id: string;
    avg: number;
    instructor: string;
    title: string;
    pass: number;
    fail: number;
    audit: number;
    uuid: string;
    year: number;
    [key: string]: any;
}
// interface structure for Room
export interface Room {
    fullname: string;
    shortname: string;
    number: string;
    name: string;
    address: string;
    lat: number;
    lon: number;
    seats: number;
    type: string;
    furniture: string;
    href: string;
    [key: string]: any;
}
// interface for Group
export interface Group {
    [key: string]: any;
}



export interface IInsightFacade {

    /**
     * Add a dataset to UBCInsight.
     *
     * @param id  The id of the dataset being added.
     * @param content  The base64 content of the dataset. This content should be in the
     * form of a serialized zip file.
     *
     * The promise should return an InsightResponse for both fulfill and reject.
     *
     * Fulfill should be for 2XX codes and reject for everything else.
     *
     * After receiving the dataset, it should be processed into a data structure of
     * your design. The processed data structure should be persisted to disk; your
     * system should be able to load this persisted value into memory for answering
     * queries.
     *
     * Ultimately, a dataset must be added or loaded from disk before queries can
     * be successfully answered.
     *
     * Response codes:
     *
     * 201: the operation was successful and the id already existed (was added in
     * this session or was previously cached).
     * 204: the operation was successful and the id was new (not added in this
     * session or was previously cached).
     * 400: the operation failed. The body should contain {"error": "my text"}
     * to explain what went wrong.
     *
     */
    addDataset(id: string, content: string): Promise<InsightResponse>;

    /**
     * Remove a dataset from UBCInsight.
     *
     * @param id  The id of the dataset to remove.
     *
     * The promise should return an InsightResponse for both fulfill and reject.
     *
     * Fulfill should be for 2XX codes and reject for everything else.
     *
     * This will delete both disk and memory caches for the dataset for the id meaning
     * that subsequent queries for that id should fail unless a new addDataset happens first.
     *
     * Response codes:
     *
     * 204: the operation was successful.
     * 404: the operation was unsuccessful because the delete was for a resource that
     * was not previously added.
     *
     */
    removeDataset(id: string): Promise<InsightResponse>;

    /**
     * Perform a query on UBCInsight.
     *
     * @param query  The query to be performed. This is the same as the body of the POST message.
     *
     * @return Promise <InsightResponse>
     *
     * The promise should return an InsightResponse for both fulfill and reject.
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
    performQuery(query: QueryRequest): Promise<InsightResponse>;
}
