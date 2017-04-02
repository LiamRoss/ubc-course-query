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
    // //console.log(JSON.stringify(queryRooms));
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
        //console.log("Response: ", data);
        courseResult = data.result;


        $.ajax({
            url: 'http://localhost:4321/query',
            type: 'post',
            data: JSON.stringify(querySection),
            contentType: 'application/json',
            dataType: 'json'
        }).done(function (data) {
            //console.log("Response: ", data);
            sectionResult = data.result;
            
            $.ajax({
                url: 'http://localhost:4321/query',
                type: 'post',
                data: JSON.stringify(queryRooms),
                contentType: 'application/json',
                dataType: 'json'
            }).done(function (data) {
                //console.log("Response: ", data);
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
            // //console.log("data: " + JSON.stringify(data));

            var passObjectCourse = {};
            // var courseName;
            $.each(this, function (k, v) {
                passObjectCourse[k] = v;
            })
            // courseName = passObjectCourse["courses_dept"] + passObjectCourse["courses_id"].toString();
            // //console.log("courseName: " + courseName);
            // passObject[courseName] = passObjectCourse;
            passObject.push(passObjectCourse);
        })
        //console.log("passObject: " + JSON.stringify(passObject));

        $.each(dataRooms, function () {
            // //console.log("dataRooms: " + JSON.stringify(dataRooms));

            var passObjectRoom = {};
            // var roomName;
            $.each(this, function (k, v) {
                passObjectRoom[k] = v;
            })
            // roomName = passObjectRoom["rooms_name"];
            // //console.log("roomName: " + roomName);
            // passObjectRooms[roomName] = passObjectRoom;
            passObjectRooms.push(passObjectRoom);
        })
        // add numSections
        $.each(passObject, function () {
            var foundSection = false;
            sectionInfo = this;
            // //console.log("datasection result: " + JSON.stringify(sectionInfo));
            $.each(dataSection, function () {
                if (this["courses_dept"] == sectionInfo["courses_dept"] &&
                this["courses_id"] == sectionInfo["courses_id"]) {
                    foundSection = true;
                    var sectionNumber = Math.ceil(sectionInfo["numSections"] / 3);
                    this["numSections"] = sectionNumber;
                    for (var i = 1; i < sectionNumber; i++) {
                        var sectionCopy = jQuery.extend(true, {}, this);
                        //console.log("ORIGINAL: " + JSON.stringify(this));
                        //console.log("COPY: " + JSON.stringify(sectionCopy));
                        passObject.push(sectionCopy);
                    }
                    //console.log("sectionNumber: " + sectionNumber);
                }
            })

             if (!foundSection) {
                var index = passObject.indexOf(this);
                //console.log("INDEX OF THIS: " + index);
                if (index > -1) {
                    passObject.splice(index, 1);
                }
            }
        })


        //console.log("passObjectRooms: " + JSON.stringify(passObjectRooms));

        // Contains object of classSchedule, classesNotScheduled, quality
        var output = scheduleMaker(passObject, passObjectRooms);

        var classSchedule = output['classSchedule'];
        var classesNotScheduled = output["classesNotScheduled"];
        //console.log("classesNotScheduled:\n" + JSON.stringify(classesNotScheduled));
        var quality = output["quality"];

        Object.keys(classSchedule).forEach(function(key) {
            // //console.log(classSchedule[key]);
            if (classSchedule[key].hasOwnProperty("buildingName")) {
                var room = key;
                var lat = classSchedule[key]["lat"];
                var lon = classSchedule[key]["lon"];
                var building = classSchedule[key]["buildingName"];
                // Key is the room-name
                //console.log(key, classSchedule[key]);

                // schedule monday
                Object.keys(classSchedule[key]["Monday"]).forEach(function(monKey) {
                    var day = "m";
                    var time = monKey;
                    var dept = classSchedule[key]["Monday"][monKey]["dept"];
                    var id = classSchedule[key]["Monday"][monKey]["id"];
                    makeBlock(room, lat, lon, building, time, dept, id, day);
                })

                // schedule tuesday
                Object.keys(classSchedule[key]["Tuesday"]).forEach(function(tueKey) {
                    var day = "t";
                    var time = tueKey;
                    // //console.log("hitting if");
                    if (tueKey == "9.5") {
                        // //console.log("===9.5");
                        time = "95";
                    } else if (tueKey == "12.5") {
                        // //console.log("===12.5");
                        time = "125";
                    } else if (tueKey == "15.5") {
                        // //console.log("===15.5");
                        time = "155";
                    }
                    //console.log("tuesday time key: " + time);
                    //console.log("Looking for --> " + "#" + time);
                    var dept = classSchedule[key]["Tuesday"][tueKey]["dept"];
                    var id = classSchedule[key]["Tuesday"][tueKey]["id"];
                    makeBlock(room, lat, lon, building, time, dept, id, day);
                })

            }
        });




        //console.log("TEST OUTPUT: " + JSON.stringify(scheduleMaker(passObject, passObjectRooms)));
    }
});

function makeBlock (room, lat, lon, building, time, dept, id, day) {
    var uniqueId = new Date().getTime().toString() + "block";
    var blockId = lat + "_" + lon + "_" + uniqueId;

    var block = '<div class="block" id="' + blockId + '"><h5>' + building + '</h5><h4>' + dept.toUpperCase() + id + '</h4><h5>' + room + '</h5></div>';

    if(day == "m") {
        $(block).appendTo("#mwf .row #" + time);
    } else {
        $(block).appendTo("#tt .row #" + time);
    }

    // var data = $(filterId).data("ref");
    $(blockId).data('room', room);
    $(blockId).data('lat', lat);
    $(blockId).data('lon', lon);
    $(blockId).data('building', building);
    $(blockId).data('time', time);
    $(blockId).data('dept', dept);
    $(blockId).data('id', id);
}


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

$("#course-subset-field").change(function () {
    if ($(this).children(":selected").attr("id") == "placeholder") {
        return;
    }

    var b = false;
    var val = $(this).children(":selected").val();
    //console.log("val: " + val);
    var text = $(this).children(":selected").text();
    //console.log("text: " + text);

    $(".subset-list-item").each( function (i) {
        //console.log("inside each, index = " + i);
        //console.log("this value: " + $(this).text());
        //console.log("text value: " + text);
        if ($(this).text() == text) {
            //console.log("values are equal!!");
            b = true;
        }
    })

    if (b) {
        return;
    }

    // var uniqueId = new Date().getTime().toString() + "csubset";

    var subset = '<li id="' + val + '" class="subset-list-item">' + text + '</li>';
    $(subset).appendTo('#course-subset-list');
})

$("#room-subset-field").change(function () {
    if ($(this).children(":selected").attr("id") == "placeholder") {
        return;
    }

    var b = false;
    var val = $(this).children(":selected").val();
    //console.log("val: " + val);
    var text = $(this).children(":selected").text();
    //console.log("text: " + text);

    $(".subset-list-item").each( function (i) {
        //console.log("inside each, index = " + i);
        //console.log("this value: " + $(this).text());
        //console.log("text value: " + text);
        if ($(this).text() == text) {
            //console.log("values are equal!!");
            b = true;
        }
    })

    if (b) {
        return;
    }

    // var uniqueId = new Date().getTime().toString() + "csubset";

    var subset = '<li id="' + val + '" class="subset-list-item">' + text + '</li>';
    $(subset).appendTo('#room-subset-list');
})

$(document).on('click', '.subset-list-item', function () {
    var id = $(this).attr("id");
    //console.log("id: " + id);
    $("#" + id).remove();
})