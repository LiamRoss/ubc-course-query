// First script loaded, sets initial state and updates CSS

// global currentID variable
var currentID = "";

// loaded datasets
var hascourses;
var hasrooms;

// calls updateCSS on page load
window.onload = function () {
    // hide table on page load
    $("#results-table").css("display", "none");
    updateCSS();
    updateUploadedJson();
    // initialize datasets
    hascourses = false;
    hasrooms = false;
};

// updates the css, hiding or revealing courses /rooms information
function updateCSS() {
    // hide table on any changes, delete contents
    $("#results-table").css("display", "none");
    $("#tblResults").empty();
    console.log("updating css");
    switch (currentID) {
        case "courses":
            // enable first selector and Submit Query
            $("#initial-filter-selector").removeAttr("disabled");
            $("#btnSubmit").removeAttr("disabled");
            // show+hide
            $(".courses-selector").css("display", "block");
            $(".rooms-selector").css("display", "none");
            break;
        case "rooms":
            // enable first selector and Submit Query
            $("#initial-filter-selector").removeAttr("disabled");
            $("#btnSubmit").removeAttr("disabled");
            // show+hide
            $(".courses-selector").css("display", "none");
            $(".rooms-selector").css("display", "block");
            break;
        default:
            // disable first selector and Submit Query
            $("#initial-filter-selector").attr("disabled", "disabled");
            $("#btnSubmit").attr("disabled", "disabled");
            // show+hide
            $(".courses-selector").css("display", "none");
            $(".rooms-selector").css("display", "none");
    }
}

// updates the css of the uploaded datasets based on uploaded files
function updateUploadedJson() {
    if (hascourses) {
        $("#courses-uploaded").removeClass("alert-success");
        $("#courses-uploaded").removeClass("alert-danger");
        $("#courses-uploaded").addClass("alert-success");
    } else {
        $("#courses-uploaded").removeClass("alert-success");
        $("#courses-uploaded").removeClass("alert-danger");
        $("#courses-uploaded").addClass("alert-danger");
    }

    
    if (hasrooms) {
        $("#rooms-uploaded").removeClass("alert-success");
        $("#rooms-uploaded").removeClass("alert-danger");
        $("#rooms-uploaded").addClass("alert-success");
    } else {
        $("#rooms-uploaded").removeClass("alert-success");
        $("#rooms-uploaded").removeClass("alert-danger");
        $("#rooms-uploaded").addClass("alert-danger");
    }
    // check if courses.json exists
    /*
    $.ajax({
        url: 'http://localhost:4321/dataset/courses.zip',
        type: 'get',
        error: function() {
            // file doesn't exist
            $("#courses-uploaded").removeClass("alert-success");
            $("#courses-uploaded").removeClass("alert-danger");
            $("#courses-uploaded").addClass("alert-danger");
        },
        success: function() {
            // file exists
            $("#courses-uploaded").removeClass("alert-success");
            $("#courses-uploaded").removeClass("alert-danger");
            $("#courses-uploaded").addClass("alert-success");
        }
    });
    
    // check if rooms.json exists
    $.ajax({
        url: 'http://localhost:4321/dataset/rooms.zip',
        type: 'get',
        error: function() {
            // file doesn't exist
            $("#rooms-uploaded").removeClass("alert-success");
            $("#rooms-uploaded").removeClass("alert-danger");
            $("#rooms-uploaded").addClass("alert-danger");
        },
        success: function() {
            // file exists
            $("#rooms-uploaded").removeClass("alert-success");
            $("#rooms-uploaded").removeClass("alert-danger");
            $("#rooms-uploaded").addClass("alert-success");
        }
    });
    */
}