// Format query response based off of UI selectors

// import schedule from "schedule.js";

$("#btnSchedule").click(function () {
    // make table display again
    // $("#results-table").css("display", "table");
    // clear table
    // $("#tblResults").empty();
    var query = $("#scheduleQuery").val();
    var queryRooms = $("#scheduleQueryRooms").val();
    var querySection = $("#scheduleQuerySection").val();
    // console.log(JSON.stringify(queryRooms));
    // var query = ""
    var courseResult;
    var roomResult;
    var sectionResult;
    $.ajax({
        url: 'http://localhost:4321/query',
        type: 'post',
        data: JSON.stringify(query),
        contentType: 'application/json',
        dataType: 'json'
    }).done(function (data) {
        console.log("Response: ", data);
        courseResult = data.result;


        $.ajax({
            url: 'http://localhost:4321/query',
            type: 'post',
            data: JSON.stringify(querySection),
            contentType: 'application/json',
            dataType: 'json'
        }).done(function (data) {
            console.log("Response: ", data);
            sectionResult = data.result;
            
            $.ajax({
                url: 'http://localhost:4321/query',
                type: 'post',
                data: JSON.stringify(queryRooms),
                contentType: 'application/json',
                dataType: 'json'
            }).done(function (data) {
                console.log("Response: ", data);
                roomResult = data.result;
                
                generateSchedule(courseResult, roomResult, sectionResult);
            }).fail(function () {
                console.error("ERROR - Failed to submit query. ");
            });

        }).fail(function () {
            console.error("ERROR - Failed to submit query. ");
        });

    }).fail(function () {
        console.error("ERROR - Failed to submit query. ");
    });


    

    function generateSchedule(data, dataRooms, dataSection) {
        var passObject = [];
        var passObjectRooms = [];
        //console.log("DATA", data);
        $.each(data, function () {
            // console.log("data: " + JSON.stringify(data));

            var passObjectCourse = {};
            // var courseName;
            $.each(this, function (k, v) {
                passObjectCourse[k] = v;
            })
            // courseName = passObjectCourse["courses_dept"] + passObjectCourse["courses_id"].toString();
            // console.log("courseName: " + courseName);
            // passObject[courseName] = passObjectCourse;
            passObject.push(passObjectCourse);
        })
        //console.log("passObject: " + JSON.stringify(passObject));

        $.each(dataRooms, function () {
            // console.log("dataRooms: " + JSON.stringify(dataRooms));

            var passObjectRoom = {};
            // var roomName;
            $.each(this, function (k, v) {
                passObjectRoom[k] = v;
            })
            // roomName = passObjectRoom["rooms_name"];
            // console.log("roomName: " + roomName);
            // passObjectRooms[roomName] = passObjectRoom;
            passObjectRooms.push(passObjectRoom);
        })
        // add numSections
        $.each(dataSection, function () {
            sectionInfo = this;
            // console.log("datasection result: " + JSON.stringify(sectionInfo));
            $.each(passObject, function () {
                if (this["courses_dept"] == sectionInfo["courses_dept"] &&
                this["courses_id"] == sectionInfo["courses_id"]) {
                    var sectionNumber = Math.ceil(sectionInfo["numSections"] / 3);
                    this["numSections"] = sectionNumber;
                    for (var i = 1; i < sectionNumber; i++) {
                        var sectionCopy = jQuery.extend(true, {}, this);
                        console.log("ORIGINAL: " + JSON.stringify(this));
                        console.log("COPY: " + JSON.stringify(sectionCopy));
                        passObject.push(sectionCopy);
                    }
                    console.log("sectionNumber: " + sectionNumber);
                }
            })
        })


        console.log("passObjectRooms: " + JSON.stringify(passObjectRooms));

        // Contains object of classSchedule, classesNotScheduled, quality
        var output = scheduleMaker(passObject, passObjectRooms);

        var classSchedule = output['classSchedule'];

        Object.keys(classSchedule).forEach(function(key) {
            // Key is the room-name
            // classSchedule[k] has the Monday/Tuesday hourly schedule, check console log for more details
            console.log(key, classSchedule[key]);
        });

        //console.log("TEST OUTPUT: " + JSON.stringify(scheduleMaker(passObject, passObjectRooms)));
    }
});


// {  
//    "WHERE":{  
//       "AND":[  
//          {  
//             "IS":{  
//                "courses_dept":"anth"
//             }
//          },
//          {  
//             "NOT":{  
//                "EQ":{  
//                   "courses_year":1900
//                }
//             }
//          }
//       ]
//    },
//    "OPTIONS":{  
//       "COLUMNS":[  
//          "courses_dept",
//          "courses_id",
//          "maxStudents",
//          "maxStudentsCount"
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
//          },
//          {  
//             "maxStudentsCount":{  
//                "COUNT":"courses_numStudents"
//             }
//          }
//       ]
//    }
// }