// Format query response based off of UI selectors

$("#btnSchedule").click(function () {
    // make table display again
    // $("#results-table").css("display", "table");
    // clear table
    // $("#tblResults").empty();
    var query = $("#scheduleQuery").val();
    // var query = ""

    $.ajax({
        url: 'http://localhost:4321/query',
        type: 'post',
        data: JSON.stringify(query),
        contentType: 'application/json',
        dataType: 'json'
    }).done(function (data) {
        console.log("Response: ", data);
        // generateTable(data.result);
    }).fail(function () {
        console.error("ERROR - Failed to submit query. ");
    });

    // function generateTable(data) {
    //     var tbl_head = document.createElement("thead");
    //     var tbl_body = document.createElement("tbody");
    //     // var odd_even = false;
    //     //console.log("DATA", data);
    //     var tbl_head_row = tbl_head.insertRow();
    //     $.each(data[0], function (k, v) {
    //         var cell_head = tbl_head_row.insertCell();
    //         cell_head.appendChild(document.createTextNode(k.toString()));
    //         //console.log("header value: " + k);
    //     })
    //     $.each(data, function () {
    //         var tbl_row = tbl_body.insertRow();
    //         // tbl_row.className = odd_even ? "odd" : "even";
    //         $.each(this, function (k, v) {
    //             var cell = tbl_row.insertCell();
    //             cell.appendChild(document.createTextNode(v.toString()));
    //         })
    //         // odd_even = !odd_even
    //     })
    //     document.getElementById("tblResults").appendChild(tbl_head);
    //     document.getElementById("tblResults").appendChild(tbl_body);
    // }
});

// TODO: fill where with params
// {  
//    "WHERE":{  

//    },
//    "OPTIONS":{  
//       "COLUMNS":[  
//          "courses_dept",
//          "courses_id",
//          "maxStudents"
//       ],
//       "ORDER":{  
//          "dir":"UP",
//          "keys":[  
//             "courses_dept",
//             "courses_id"
//          ]
//       },
//       "FORM":"TABLE"
//    },
//    "TRANSFORMATIONS":{  
//       "GROUP":[  
//          "courses_dept",
//          "courses_id"
//       ],
//       "APPLY":[  
//          {  
//             "maxStudents":{  
//                "MAX":"courses_numStudents"
//             }
//          }
//       ]
//    }
// }