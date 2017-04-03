// Format query response based off of UI selectors

// import schedule from "schedule.js";

$("#btnSchedule").click(function () {
    alert("Generating schedule... results will show up when done (may take some time if there aren't any filters applied");
    deleteBlocks();



    var query = baseSchedule();
    // console.log(JSON.stringify("COURSES: \n" + query));
    var querySection = baseSections();
    // console.log(JSON.stringify("SECTIONS: \n" + querySection));
    var queryRooms = baseRooms();
    // console.log(JSON.stringify("ROOMS: \n" + queryRooms));
    // make table display again
    // $("#results-table").css("display", "table");
    // clear table
    // $("#tblResults").empty();
    // var query = $("#scheduleQuery").val();
    // var queryRooms = $("#scheduleQueryRooms").val();
    // var querySection = $("#scheduleQuerySection").val();
    //console.log(JSON.stringify(queryRooms));
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
            alert("No results from your query");
        });

    }).fail(function () {
        console.error("ERROR - Failed to submit query. ");
    });




    function generateSchedule(data, dataRooms, dataSection) {
        var passObject = [];
        var passObjectRooms = [];
        //console.log("DATA", data);
        $.each(data, function () {
            //console.log("data: " + JSON.stringify(data));

            var passObjectCourse = {};
            // var courseName;
            $.each(this, function (k, v) {
                passObjectCourse[k] = v;
            })
            // courseName = passObjectCourse["courses_dept"] + passObjectCourse["courses_id"].toString();
            //console.log("courseName: " + courseName);
            // passObject[courseName] = passObjectCourse;
            passObject.push(passObjectCourse);
        })
        //console.log("passObject: " + JSON.stringify(passObject));

        $.each(dataRooms, function () {
            //console.log("dataRooms: " + JSON.stringify(dataRooms));

            var passObjectRoom = {};
            // var roomName;
            $.each(this, function (k, v) {
                passObjectRoom[k] = v;
            })
            // roomName = passObjectRoom["rooms_name"];
            //console.log("roomName: " + roomName);
            // passObjectRooms[roomName] = passObjectRoom;
            passObjectRooms.push(passObjectRoom);
        })
        // add numSections
        $.each(passObject, function () {
            var foundSection = false;
            sectionInfo = this;
            //console.log("datasection result: " + JSON.stringify(sectionInfo));
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
        var quality = output["quality"];
        var qlt = '<h4 class="details" id="124">Quality: '+ Math.ceil(quality) +'</h4>';
        $(qlt).appendTo('#results-wrapper');
        var classesNotScheduled = output["classesNotScheduled"].length;
        console.log("classesNotScheduled:\n" + JSON.stringify(output["classesNotScheduled"]));
        var cns = '<h4 class="details" id="123">Classes not scheduled: '+ classesNotScheduled +'</h4>';
        $(cns).appendTo('#results-wrapper');
        console.log("classesNotScheduled:\n" + JSON.stringify(classesNotScheduled));

        Object.keys(classSchedule).forEach(function (key) {
            //console.log(classSchedule[key]);
            if (classSchedule[key].hasOwnProperty("buildingName")) {
                var room = key;
                var lat = classSchedule[key]["lat"];
                var lon = classSchedule[key]["lon"];
                var building = classSchedule[key]["buildingName"];
                // Key is the room-name
                //console.log(key, classSchedule[key]);

                // schedule monday
                Object.keys(classSchedule[key]["Monday"]).forEach(function (monKey) {
                    var day = "m";
                    var time = monKey;
                    var dept = classSchedule[key]["Monday"][monKey]["dept"];
                    var id = classSchedule[key]["Monday"][monKey]["id"];
                    makeBlock(room, lat, lon, building, time, dept, id, day);
                })

                // schedule tuesday
                Object.keys(classSchedule[key]["Tuesday"]).forEach(function (tueKey) {
                    var day = "t";
                    var time = tueKey;
                    //console.log("hitting if");
                    if (tueKey == "9.5") {
                        //console.log("===9.5");
                        time = "95";
                    } else if (tueKey == "12.5") {
                        //console.log("===12.5");
                        time = "125";
                    } else if (tueKey == "15.5") {
                        //console.log("===15.5");
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

        if( $('#distance-selector').children(":selected").attr("id") != "placeholder" && $('#distance-number').val()) {

            var building = $('#distance-selector').children(":selected").val();
            console.log("BUILDING: " + building);

            var distance = $('#distance-number').val();
            console.log("DISTANCE: " + distance);

            var raw_query = 
            {  
                "WHERE":{  
                        "IS":{  
                            "rooms_fullname":building
                        }
                    },
                "OPTIONS":{  
                    "COLUMNS":[  
                        "rooms_fullname",
                        "rooms_lat",
                        "rooms_lon"
                    ],
                    "ORDER":"rooms_fullname",
                    "FORM":"TABLE"
                },
                "TRANSFORMATIONS":{  
                    "GROUP":[  
                        "rooms_fullname",
                        "rooms_lat",
                        "rooms_lon"
                    ],
                    "APPLY":[]
                }
            };

            var query = JSON.stringify(raw_query);
            console.log("QUERY: \n" + query);

            var baseLat;
            var baseLon;

            $.ajax({
                url: 'http://localhost:4321/query',
                type: 'post',
                data: JSON.stringify(query),
                contentType: 'application/json',
                dataType: 'json'
            }).done(function (d) {
                var data = d.result;
                console.log(JSON.stringify(data));
                $.each(data[0], function (k, v) {
                    console.log(JSON.stringify(this));
                    if (k == "rooms_lat") {
                        baseLat = v;
                        console.log("baseLat: " + baseLat);
                    } else if (k == "rooms_lon") {
                        baseLon = v;
                        console.log("baseLat: " + baseLon);
                    }
                })

            }).fail(function () {
                console.error("ERROR - Failed to submit query.");
            });


            $(".block").each(function() {
                var id = $(this).attr("id");
                console.log("id: " + id);

                var lat = id.split("_")[0];
                console.log("lat: " + lat);

                var lon = id.split("_")[1];
                console.log("lon: " + lon);

                // TODO: put function name here, and you're good to go
                // if (distancefunction(baseLat, baseLon, lat, lon, distance)) {
                //     // dunno if your thing returns true if it's within
                //     //  range or outside of range, but this is true
                // } else {
                //     $(id).css("display", "none");
                // }
            })
        }
    }
});

function makeBlock(room, lat, lon, building, time, dept, id, day) {
    var uniqueId = new Date().getTime().toString() + "block";
    var blockId = lat + "_" + lon + "_" + uniqueId;

    var block = '<div class="block" id="' + blockId + '"><h5>' + building + '</h5><h4>' + dept.toUpperCase() + id + '</h4><h5>' + room + '</h5></div>';

    if (day == "m") {
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

$("#course-subset-field").change(function () {
    if ($(this).children(":selected").attr("id") == "placeholder") {
        return;
    }

    var b = false;
    var val = $(this).children(":selected").val();
    //console.log("val: " + val);
    var text = $(this).children(":selected").text();
    //console.log("text: " + text);

    $(".subset-list-item").each(function (i) {
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

    $(".subset-list-item").each(function (i) {
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

function baseSchedule () {
    var query =
    {  
        "WHERE":{  
                "AND":[
                    {
                        "NOT":{  
                            "EQ":{  
                                "courses_year":1900
                            }
                        }
                    }
                ]
            },
        "OPTIONS":{  
            "COLUMNS":[  
                "courses_dept",
                "courses_id",
                "maxStudents"
            ],
            "ORDER":"courses_dept",
            "FORM":"TABLE"
        },
        "TRANSFORMATIONS":{  
            "GROUP":[  
                "courses_dept",
                "courses_id"
            ],
            "APPLY":[  
                {  
                    "maxStudents":{  
                    "MAX":"courses_numStudents"
                    }
                }
            ]
        }
    };
    if ($("#course-subset-list li")[0]){
        query.WHERE.AND.push(courseSubset());
    }
    if ($('#department-selector').children(":selected").attr("id") != "placeholder" || $('#course-selector').children(":selected").attr("id") != "placeholder") {
        query.WHERE.AND.push(courseFilter());
    }
    console.log("QUERY CLASSES: \n" + JSON.stringify(query));
    return JSON.stringify(query);
}

function baseSections () {
    var query =
    {  
        "WHERE":{  
                "AND":[
                    {
                        "EQ":{  
                            "courses_year":2014
                        }
                    }
                ]
        },
        "OPTIONS":{  
            "COLUMNS":[  
                "courses_dept",
                "courses_id",
                "numSections"
            ],
            "ORDER":"courses_dept",
            "FORM":"TABLE"
        },
        "TRANSFORMATIONS":{  
            "GROUP":[  
                "courses_dept",
                "courses_id"
            ],
            "APPLY":[
                {  
                    "numSections":{  
                    "COUNT":"courses_uuid"
                    }
                }
            ]
        }
    };
    if ($("#course-subset-list li")[0]){
        query.WHERE.AND.push(courseSubset());
    }
    if ($('#department-selector').children(":selected").attr("id") != "placeholder" || $('#course-selector').children(":selected").attr("id") != "placeholder") {
        query.WHERE.AND.push(courseFilter());
    }
    console.log("QUERY SECTIONS: \n" + JSON.stringify(query));
    return JSON.stringify(query);
}

function baseRooms () {
    var query =
    {  
        "OPTIONS":{  
            "COLUMNS":[  
                "rooms_name",
                "rooms_shortname",
                "rooms_seats",
                "rooms_lat",
                "rooms_lon"
            ],
            "ORDER":{  
                "dir":"UP",
                "keys":[  
                    "rooms_name"
                ]
            },
            "FORM":"TABLE"
        }
    };

    query["WHERE"] = roomFilters();
    console.log("QUERY ROOMS: \n" + JSON.stringify(query));
    return JSON.stringify(query);
}


function courseSubset () {
    var or = {
        "OR":[]
    }

    $("#course-subset-list li").each(function() {
        var c1 = {};
        var d1 = {};
        var c2 = {};
        var d2 = {};
        //console.log("VAL OF LIST ITEM: " + $(this).attr("id"));
        var dept = $(this).attr("id").split("_")[0];
        //console.log("DEPARTMENT: " + dept);
        c1["courses_dept"] = dept;
        var id = $(this).attr("id").split("_")[1];
        //console.log("ID: " + id);
        c2["courses_id"] = id;
        d1["IS"] = c1;
        d2["IS"] = c2;
        var e = {};
        var f = [];
        f.push(d1);
        f.push(d2);
        e["AND"] = f;
        or.OR.push(e);
    });
    //console.log("OR: \n" + JSON.stringify(or));
    return or;
}

function courseFilter () {
    var filter;
    

    var dept = $('#department-selector').children(":selected").val();
    //console.log("SELECTED DEPT: " + dept);

    var id = $('#course-selector').children(":selected").val();
    //console.log("SELECTED DEPT: " + id);

    var c1 = {};
    var d1 = {};
    c1["courses_dept"] = dept;
    d1["IS"] = c1;

    var c2 = {};
    var d2 = {};
    c2["courses_id"] = id;
    d2["IS"] = c2;

    if ($('#department-selector').children(":selected").attr("id") == "placeholder") {
        return d2;
    } else if ($('#course-selector').children(":selected").attr("id") == "placeholder") {
        return d1;
    }
    
    if ($(".course-button-and.selected")[0]){
        // Do something if class exists
        var filter = {
            "AND":[]
        }
        filter.AND.push(d1);
        filter.AND.push(d2);
    } else {
        // Do something if class does not exist
        var filter = {
            "OR":[]
        }
        filter.OR.push(d1);
        filter.OR.push(d2);
    }
    //console.log("COURSEFILTER: \n" + JSON.stringify(filter));
    return filter;
}

function roomFilters () {
    var filter = {};
    var filterAnd = [];
    var roomSubset = {};
    var roomOr = [];

    if ($("#room-subset-list li")[0]){
        $("#room-subset-list li").each(function() {
            var c = {};
            var d = {};
            var room = $(this).attr("id");
            c["rooms_name"] = room;
            d["IS"] = c;

            roomOr.push(d);
        });
        roomSubset["OR"] = roomOr;

        filterAnd.push(roomSubset);
    }

    if ($('#building-selector').children(":selected").attr("id") != "placeholder") {
        var building = $('#building-selector').children(":selected").val();

        var c1 = {};
        var d1 = {};
        c1["rooms_fullname"] = building;
        d1["IS"] = c1;

        filterAnd.push(d1);
    }

    if ($("#room-subset-list li")[0] || $('#building-selector').children(":selected").attr("id") != "placeholder") {
        filter["AND"] = filterAnd;
    }

    //console.log("COURSEFILTER: \n" + JSON.stringify(filter));
    return filter;
}

function deleteBlocks () {
    $('.block').each( function (i) {
        var id = $(this).attr("id");
        console.log("id: " + id);
        console.log("index: " + i);
        $(this).remove();
    })

    $('.details').each( function (i) {
        var id = $(this).attr("id");
        console.log("id: " + id);
        console.log("index: " + i);
        $("#" + id.toString()).remove();
    })
}









