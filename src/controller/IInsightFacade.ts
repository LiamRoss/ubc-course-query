/*
 * This is the primary high-level API for the project. In this folder there should be:
 * A class called InsightFacade, this should be in a file called InsightFacade.ts.
 * You should not change this interface at all or the test suite will not work.
 */

export interface InsightResponse {
    code: number;
    body: {}; // the actual response
}


export interface QueryRequest {
    WHERE:   Filter;
    OPTIONS: Options;
}
//-------------------------------------
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
// only MComparison Keys
export interface  MComparison {
    courses_avg?:           number; //The average of the course offering.
    courses_pass?:          number; //The number of students that passed the course offering.
    courses_fail?:          number; //The number of students that failed the course offering.
    courses_audit?:         number; //The number of students that audited the course offering.
}
// only SComparison Keys
export interface  SComparison {
    courses_dept?:          string; //The department that offered the course.
    courses_id?:            string; //The course number (will be treated as a string (e.g., 499b)).
    courses_instructor?:    string; //The instructor teaching the course offering.
    courses_title?:         string; //The name of the course.
    courses_uuid?:          string; //The unique id of a course offering.
}
//-------------------------------------
// OPTIONS
export interface Options {
    //  reminder:   key has to be format: string '_' string
    COLUMNS: Key[];     // must be key[]
    ORDER?: string;     // must be key
    FORM: string;       // must be "TABLE"
}

// interface structure for Section
export interface Section {
    dept?: string;
    id?: string;
    avg?: number;
    instructor?: string;
    title?: string;
    pass?: number;
    fail?: number;
    audit?: number;
    uuid?: string;
    year?: number;
}

// interface structure for Section
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

}

// interface for returned JSON
export interface ReturnJSON {
    render: string; // must be 'TABLE'
    result: Object[];
}

// all Keys for courses
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
