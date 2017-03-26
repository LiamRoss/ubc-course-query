// First script loaded, sets initial state and updates CSS

// global currentID variable
var currentID = "";

// calls updateCSS on page load
window.onload = function () {
    // hide table on page load
    $("#results-table").css("display", "none");
    updateCSS();
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