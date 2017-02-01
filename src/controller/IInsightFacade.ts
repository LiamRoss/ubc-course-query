/*
 * This is the primary high-level API for the project. In this folder there should be:
 * A class called InsightFacade, this should be in a file called InsightFacade.ts.
 * You should not change this interface at all or the test suite will not work.
 */

export interface InsightResponse {
    code: number;
    body: {}; // the actual response
}
/*
{
   "WHERE":{
      "OR":[
          ---------------------------------|
         {
            "AND":[
                #############
               {
                  "GT":{
                     "courses_avg":90
                  }
               },
                #############
               {
                  "IS":{
                     "courses_dept":"adhe"
                  }
               }
                #############
            ]
         },
         ---------------------------------|
         {
            "EQ":{
               "courses_avg":95
            }
         }
         ---------------------------------|
      ]
   },

   "OPTIONS":{
      "COLUMNS":[
         "courses_dept",
         "courses_id",
         "courses_avg"
      ],
      "ORDER":"courses_avg",
      "FORM":"TABLE"
   }
}
*/

export interface QueryRequest {
    WHERE:   Where;
    OPTIONS: Options;
}
//-------------------------------------
// BODY
export interface Where {
    FILTER: Filter;
}
export interface Filter {
    LOGICCOMPARISON: LogicComparison;
    MCOMPARISON:     MComparison;
    SCOMPARISON:     SComparison;
    NEGATION:        Negation;
}
export interface LogicComparison {
    /*
    AND?: {f: Filter}[];
    OR?: {f: Filter}[];
    */
    AND?: Where[];
    OR?: Where[];
}
export interface MComparison {
    FILTER: Filter;
}
export interface SComparison {
    FILTER: Filter;
}
export interface Negation {
    FILTER: Filter;
}





export interface Options {
    
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
