// calls populate on page load
var updateBarNum = 0;

window.onload = function () {
    var promises = [];
    // $(option).appendTo('#department-selector');
    // $(option).appendTo('#building-selector');
    // $(option).appendTo('#distance-selector');
    // $(option).appendTo('#course-subset-field');
    // $(option).appendTo('#course-selector');
    // $(option).appendTo('#room-subset-field');
    updateBar(5);
    var p1 = populateClass(); // 50%
    var p2 = populateRoom(); // 55%
    var p3 = populateDept(); // 75
    var p4 = populateCourseNum(); // 95
    var p5 = populateBuilding(); // 100
    promises.push(p1);
    promises.push(p2);
    promises.push(p3);
    promises.push(p4);
    promises.push(p5);

    Promise.all(promises).then(function() {
        // all good;
    }).catch(function(err) {
        alert(err);
        failBar();
    })
};

function populateDept() {
    return new Promise((fulfill, reject) => {
        //console.log("inside populateDept");
        var query_raw = {
            "WHERE": {
                "NOT":{  
                    "EQ":{  
                        "courses_year":1900
                    }
                }
            },
            "OPTIONS": {
                "COLUMNS": [
                    "courses_dept"
                ],
                "ORDER": "courses_dept",
                "FORM": "TABLE"
            },
            "TRANSFORMATIONS": {
                "GROUP": [
                    "courses_dept"
                ],
                "APPLY": []
            }
        };
        var query = JSON.stringify(query_raw);
        //console.log("query: \n" + JSON.stringify(query));

        $.ajax({
            url: 'http://localhost:4321/query',
            type: 'post',
            data: JSON.stringify(query),
            contentType: 'application/json',
            dataType: 'json'
        }).done(function (data) {
            //console.log("Response: ", data);
            populateData(data.result);
        }).fail(function () {
            console.error("ERROR - Failed to submit query.");
            reject("Missing courses dataset");
        });

        function populateData(data) {
            $.each(data, function () {
                $.each(this, function (k, v) {
                    var option = '<option value="' + v + '">' + v.toUpperCase() + '</option>'
                    $(option).appendTo('#department-selector');
                })
            })
            updateBar(20 + updateBarNum);
            fulfill();
        }
    });
}

function populateClass() {
    return new Promise((fulfill, reject) => {
    var query_raw = {
        "WHERE": {
            "NOT":{  
                "EQ":{  
                    "courses_year":1900
                }
            }
        },
        "OPTIONS": {
            "COLUMNS": [
                "courses_dept",
                "courses_id"
            ],
            "ORDER": "courses_dept",
            "FORM": "TABLE"
        },
        "TRANSFORMATIONS": {
            "GROUP": [
                "courses_dept",
                "courses_id"
            ],
            "APPLY": []
        }
    };
    var query = JSON.stringify(query_raw);
    //console.log("query: \n" + JSON.stringify(query));

    $.ajax({
        url: 'http://localhost:4321/query',
        type: 'post',
        data: JSON.stringify(query),
        contentType: 'application/json',
        dataType: 'json'
    }).done(function (data) {
        //console.log("Response: ", data);
        populateData(data.result);
    }).fail(function () {
        console.error("ERROR - Failed to submit query.");
        reject("Missing courses dataset");
    });

    function populateData(data) {
        $.each(data, function () {
            var dept;
            var id;
            $.each(this, function (k, v) {
                if (k == "courses_dept") {
                    dept = v;
                } else {
                    id = v;
                }
            })
            var option = '<option value="' + dept + '_' + id + '">' + dept.toUpperCase() + ' ' + id + '</option>'
            $(option).appendTo('#course-subset-field');
        })
        updateBar(45 + updateBarNum);
        fulfill();
    }
    });
}

function populateCourseNum() {
    return new Promise((fulfill, reject) => {
    var query_raw = {
        "WHERE": {
            "NOT":{  
                "EQ":{  
                    "courses_year":1900
                }
            }
        },
        "OPTIONS": {
            "COLUMNS": [
                "courses_id"
            ],
            "ORDER": "courses_id",
            "FORM": "TABLE"
        },
        "TRANSFORMATIONS": {
            "GROUP": [
                "courses_id"
            ],
            "APPLY": []
        }
    };
    var query = JSON.stringify(query_raw);
    //console.log("query: \n" + JSON.stringify(query));

    $.ajax({
        url: 'http://localhost:4321/query',
        type: 'post',
        data: JSON.stringify(query),
        contentType: 'application/json',
        dataType: 'json'
    }).done(function (data) {
        //console.log("Response: ", data);
        populateData(data.result);
    }).fail(function () {
        console.error("ERROR - Failed to submit query.");
        reject("Missing courses dataset")
    });

    function populateData(data) {
        $.each(data, function () {
            $.each(this, function (k, v) {
                var option = '<option value="' + v + '">' + v + '</option>'
                $(option).appendTo('#course-selector');
            })
        })
        updateBar(20 + updateBarNum);
        fulfill();
    }
    });
}

function populateRoom() {
    return new Promise((fulfill, reject) => {
    var query_raw = {
        "WHERE": {},
        "OPTIONS": {
            "COLUMNS": [
                "rooms_name"
            ],
            "ORDER": "rooms_name",
            "FORM": "TABLE"
        },
        "TRANSFORMATIONS": {
            "GROUP": [
                "rooms_name"
            ],
            "APPLY": []
        }
    };
    var query = JSON.stringify(query_raw);
    //console.log("query: \n" + JSON.stringify(query));

    $.ajax({
        url: 'http://localhost:4321/query',
        type: 'post',
        data: JSON.stringify(query),
        contentType: 'application/json',
        dataType: 'json'
    }).done(function (data) {
        //console.log("Response: ", data);
        populateData(data.result);
    }).fail(function () {
        console.error("ERROR - Failed to submit query.");
        reject("Missing rooms dataset");
    });

    function populateData(data) {
        $.each(data, function () {
            $.each(this, function (k, v) {
                var option = '<option value="' + v + '">' + v + '</option>'
                $(option).appendTo('#room-subset-field');
            })
        })
        updateBar(10 + updateBarNum);
        fulfill();
    }
    });

}

function populateBuilding() {
    return new Promise((fulfill, reject) => {
    var query_raw = {
        "WHERE": {},
        "OPTIONS": {
            "COLUMNS": [
                "rooms_fullname"
            ],
            "ORDER": "rooms_fullname",
            "FORM": "TABLE"
        },
        "TRANSFORMATIONS": {
            "GROUP": [
                "rooms_fullname"
            ],
            "APPLY": []
        }
    };
    var query = JSON.stringify(query_raw);
    //console.log("query: \n" + JSON.stringify(query));

    $.ajax({
        url: 'http://localhost:4321/query',
        type: 'post',
        data: JSON.stringify(query),
        contentType: 'application/json',
        dataType: 'json'
    }).done(function (data) {
        //console.log("Response: ", data);
        populateData(data.result);
    }).fail(function () {
        console.error("ERROR - Failed to submit query.");
        reject("Missing rooms dataset");
    });

    function populateData(data) {
        $.each(data, function () {
            $.each(this, function (k, v) {
                var option = '<option value="' + v + '">' + v + '</option>'
                $(option).appendTo('#building-selector');
                $(option).appendTo('#distance-selector');
            })
        })
        updateBar(5 + updateBarNum);
        fulfill();
    }
    });

}

function updateBar(value) {
    updateBarNum = value;
    //console.log("updating bar");
    var id = "#progressbar";
    $(id).css("width", value.toString() + "%");
    if (value == 100 && $(id).hasClass("active")) {
        //progress-bar-striped active
        //progress-bar-success
        $(id).removeClass("progress-bar-striped active");
        $(id).addClass("progress-bar-success");
    }
}

function failBar() {
    updateBarNum = 100;
    //console.log("fail bar");
    var id = "#progressbar";
    $(id).css("width", "100%");
    $(id).removeClass("progress-bar-striped active");
    $(id).addClass("progress-bar-danger");
}