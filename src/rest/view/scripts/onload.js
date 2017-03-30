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
    // update Submit Query button
    checkSelected();
    // hide table on any changes, delete contents
    $("#results-table").css("display", "none");
    $("#tblResults").empty();
    //console.log("updating css");
    // check main ID elector 
    switch (currentID) {
        case "courses":
            // enable first selector and Submit Query
            $("#initial-filter-selector").removeAttr("disabled");
            
            // enable sorting
            $("#sort-selector").removeAttr("disabled");
            // enable sort direction
            $("#direction-selector").removeAttr("disabled");

            // show+hide
            $(".courses-select").css("display", "block");
            $(".rooms-select").css("display", "none");
            break;
        case "rooms":
            // enable first selector and Submit Query
            $("#initial-filter-selector").removeAttr("disabled");

            // enable sorting
            $("#sort-selector").removeAttr("disabled");
            // enable sort direction
            $("#direction-selector").removeAttr("disabled");

            // show+hide
            $(".courses-select").css("display", "none");
            $(".rooms-select").css("display", "block");
            break;
        default:
            // disable first selector and Submit Query
            $("#initial-filter-selector").attr("disabled", "disabled");

            // disable sorting
            $("#sort-selector").attr("disabled", "disabled");
            // disable sort direction
            $("#direction-selector").attr("disabled", "disabled");

            // show+hide
            $(".courses-select").css("display", "none");
            $(".rooms-select").css("display", "none");
    }
}

function checkSelected() {
    // check to make sure all boxes are not defaulted
    $(document).ready(function () {
        var disableSubmit = false;
        $("select option:selected ").each(function () {
            //console.log("inside disableSubmit, " + this.id);
            if (this.id == 'placeholder') {
                $("#btnSubmit").attr("disabled", "disabled");
                disableSubmit = true;
            }
        })
        if (!disableSubmit) {
            $("#btnSubmit").removeAttr("disabled");
        }
    });
}

// updates the css of the uploaded datasets based on uploaded files
function updateUploadedJson() {
    // if (hascourses) {
    //     $("#courses-uploaded").removeClass("alert-success");
    //     $("#courses-uploaded").removeClass("alert-danger");
    //     $("#courses-uploaded").addClass("alert-success");
    // } else {
    //     $("#courses-uploaded").removeClass("alert-success");
    //     $("#courses-uploaded").removeClass("alert-danger");
    //     $("#courses-uploaded").addClass("alert-danger");
    // }
    //
    //
    // if (hasrooms) {
    //     $("#rooms-uploaded").removeClass("alert-success");
    //     $("#rooms-uploaded").removeClass("alert-danger");
    //     $("#rooms-uploaded").addClass("alert-success");
    // } else {
    //     $("#rooms-uploaded").removeClass("alert-success");
    //     $("#rooms-uploaded").removeClass("alert-danger");
    //     $("#rooms-uploaded").addClass("alert-danger");
    // }
    // check if courses.json exists

    $.ajax({
        url: 'http://localhost:4321/dataset/courses',
        type: 'get'
    }).done(function (data) {
        // file exists
        $("#courses-uploaded").removeClass("alert-success");
        $("#courses-uploaded").removeClass("alert-danger");
        $("#courses-uploaded").addClass("alert-success");
    }).fail(function (data) {
        // file doesn't exist
        $("#courses-uploaded").removeClass("alert-success");
        $("#courses-uploaded").removeClass("alert-danger");
        $("#courses-uploaded").addClass("alert-danger");
    });

    // check if rooms.json exists
    $.ajax({
        url: 'http://localhost:4321/dataset/rooms',
        type: 'get'
    }).done(function (data) {
        // file exists
        $("#rooms-uploaded").removeClass("alert-success");
        $("#rooms-uploaded").removeClass("alert-danger");
        $("#rooms-uploaded").addClass("alert-success");
    }).fail(function (data) {
        // file doesn't exist
        $("#rooms-uploaded").removeClass("alert-success");
        $("#rooms-uploaded").removeClass("alert-danger");
        $("#rooms-uploaded").addClass("alert-danger");
    });


}