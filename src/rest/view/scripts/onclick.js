// changes the currentID if the selector is changed
$("#currentID-selector").change(function () {
    // clear query
    $("#initial-filter > .filter").remove();
    // reset initial query selector
    $("#initial-filter select").val("");
    // clear style for courses and rooms
    // $(".courses-selector").removeAttr('style').css("display","");
    // $(".rooms-selector").removeAttr('style').css("width","100px");
    // get value
    var selected = $(this).children(":selected").val();
    currentID = selected;
    updateCSS();
});

$("#btnUpload").click(function () {
    var fileToLoad = document.getElementById("fileUpload").files[0];
    var fileReader = new FileReader();
    fileReader.readAsArrayBuffer(fileToLoad);

    fileReader.onload = function (evt) {
        var id = fileToLoad.name.split(".")[0];
        var content = evt.target.result;
        var formData = new FormData();
        formData.append('body', new Blob([content]));

        $.ajax({
            url: 'http://localhost:4321/dataset/' + id,
            type: 'put',
            cache: false,
            data: formData,
            contentType: false,
            processData: false
        }).done(function (data) {
            console.log(fileToLoad.name + " was successfully uploaded.");
        }).fail(function (data) {
            console.log('ERROR - Failed to upload ' + fileToLoad.name + ". data = " + JSON.stringify(
                data));
        });
    }
});

$('#btnSubmit').click(function () {
    // make table display again
    $("#results-table").css("display", "table");
    // clear table
    $("#tblResults").empty();
    var query = $("#txtQuery").val();
    console.log("query", query);

    $.ajax({
        url: 'http://localhost:4321/query',
        type: 'post',
        data: JSON.stringify(query),
        contentType: 'application/json',
        dataType: 'json'
    }).done(function (data) {
        console.log("Response: ", data);
        generateTable(data.result);

    }).fail(function () {
        console.error("ERROR - Failed to submit query.");
    });

    function generateTable(data) {
        var tbl_head = document.createElement("thead");
        var tbl_body = document.createElement("tbody");
        // var odd_even = false;
        console.log("DATA", data);
        var tbl_head_row = tbl_head.insertRow();
        $.each(data[0], function (k, v) {
            var cell_head = tbl_head_row.insertCell();
            cell_head.appendChild(document.createTextNode(k.toString()));
            console.log("header value: " + k);
        })
        $.each(data, function () {
            var tbl_row = tbl_body.insertRow();
            // tbl_row.className = odd_even ? "odd" : "even";
            $.each(this, function (k, v) {
                var cell = tbl_row.insertCell();
                cell.appendChild(document.createTextNode(v.toString()));
            })
            // odd_even = !odd_even
        })
        document.getElementById("tblResults").appendChild(tbl_head);
        document.getElementById("tblResults").appendChild(tbl_body);
    }
});

// $(document).ready(function() {
// update relevant UI based on filter-selector 
$(document).on('change', '.filter-selector', function () {
    // $('.filter-selector').on('change', "#appended", function () {
    // $('.filter-selector').change(function () {
    console.log("filter-selector changed, calling function");
    // find parent div id
    var parentId = "#" + $(this).closest("div").prop("id");
    console.log("parent id: " + parentId);
    // find parent filter-color
    var filterColor = "";
    var isLight = $(parentId).hasClass("filter-color-0");
    if (isLight) {
        filterColor = "filter-color-1";
    } else {
        filterColor = "filter-color-0";
    }
    // remove existing filters
    $(parentId + " > .filter").remove();
    // get selected element value
    var selected = $(this).children(":selected").val();
    // switch statement for value
    switch (selected) {
        case "AND":
            // append two unique filters
            var uniqueId = new Date().getTime().toString() + "AND0";
            var filter = makeFilter(uniqueId, filterColor);
            $(filter).appendTo(parentId);
            var uniqueId = new Date().getTime().toString() + "AND1";
            var filter = makeFilter(uniqueId, filterColor);
            $(filter).appendTo(parentId);
            break;
        case "OR":
            // append two unique filters
            var uniqueId = new Date().getTime().toString() + "OR0";
            var filter = makeFilter(uniqueId, filterColor);
            $(filter).appendTo(parentId);
            var uniqueId = new Date().getTime().toString() + "OR1";
            var filter = makeFilter(uniqueId, filterColor);
            $(filter).appendTo(parentId);
            break;
        case "NOT":
            // append one unique filter
            var uniqueId = new Date().getTime().toString() + "NOT";
            var filter = makeFilter(uniqueId, filterColor);
            $(filter).appendTo(parentId);
            break;
        case "LT":
            // append one MComparison selector
            var uniqueId = new Date().getTime().toString() + "LT";
            var mc = makeMComparison(uniqueId, "is less than", filterColor);
            $(mc).appendTo(parentId);
            break;
        case "GT":
            // append one MComparison selector
            var uniqueId = new Date().getTime().toString() + "GT";
            var mc = makeMComparison(uniqueId, "is greater than", filterColor);
            $(mc).appendTo(parentId);
            break;
        case "EQ":
            // append one MComparison selector
            var uniqueId = new Date().getTime().toString() + "EQ";
            var mc = makeMComparison(uniqueId, "is equal to", filterColor);
            $(mc).appendTo(parentId);
            break;
        case "IS-s":
            // append one SComparison selector
            var uniqueId = new Date().getTime().toString() + "IS-s";
            var sc = makeSComparison(uniqueId, "starts with", filterColor);
            $(sc).appendTo(parentId);
            break;
        case "IS-e":
            // append one SComparison selector
            var uniqueId = new Date().getTime().toString() + "IS-e";
            var sc = makeSComparison(uniqueId, "ends with", filterColor);
            $(sc).appendTo(parentId);
            break;
        case "IS-c":
            // append one SComparison selector
            var uniqueId = new Date().getTime().toString() + "IS-c";
            var sc = makeSComparison(uniqueId, "contains", filterColor);
            $(sc).appendTo(parentId);
            break;
        case "IS":
            // append one SComparison selector
            var uniqueId = new Date().getTime().toString() + "IS";
            var sc = makeSComparison(uniqueId, "is equal to", filterColor);
            $(sc).appendTo(parentId);
            break;
        default:
    }
    updateCSS();
});

function makeFilter(uniqueId, filterColor) {
    console.log("creating filter");
    // initialize filter with first uniqueIdModifier
    var filter = '<div class="filter ' + filterColor + '" id="' + uniqueId +
        '"><select class="btn btn-default filter-selector ' + filterColor + '"><option value="" selected id="placeholder">Select a Filter</option><option value="AND">And</option><option value="OR">Or</option><option value="NOT">Not</option><option value="LT">Less Than (number)</option><option value="GT">Greater Than (number)</option><option value="EQ">Equal To (number)</option><option value="IS-s">Starts with (string)</option><option value="IS-e">Ends with (string)</option><option value="IS-c">Contains (string)</option><option value="IS">Equal To (string)</option></select></div>';
    return filter;
}

function makeMComparison(uniqueId, compPhrase, filterColor) {
    console.log("creating MComparison");
    // initialize filter with first uniqueIdModifier
    var mc = '<div class="filter ' + filterColor + ' comparison-override" id="' + uniqueId +
        '"><select class="btn btn-default comparison-selector float-left"><option value="" selected id="placeholder">Select a Key</option><option class="courses-selector" value="courses_avg">Course average</option><option class="courses-selector" value="courses_pass">Number of passes</option><option class="courses-selector" value="courses_fail">Number of fails</option><option class="courses-selector" value="courses_audit">Number of audits</option><option class="rooms-selector" value="rooms_lat">Latitude of room</option><option class="rooms-selector" value="rooms_lon">Longitude of room</option><option class="rooms-selector" value="rooms_seats">Number of seats in room</option></select><div class="input-group"><span class="input-group-addon" id="basic-addon1">' +
        compPhrase +
        '</span><input type="number" class="form-control" placeholder="Enter Number" aria-describedby="basic-addon1"></div></div>';
    return mc;
}

function makeSComparison(uniqueId, compPhrase, filterColor) {
    console.log("creating SComparison");
    // initialize filter with first uniqueIdModifier
    var sc = '<div class="filter ' + filterColor + ' comparison-override" id="' + uniqueId +
        '"><select class="btn btn-default comparison-selector float-left"><option value="" selected id="placeholder">Select a Key</option><option class="courses-selector" value="courses_dept">Course department</option><option class="courses-selector" value="courses_id">Course ID</option><option class="courses-selector" value="courses_instructor">Course instructor</option><option class="courses-selector" value="courses_title">Course title</option><option class="courses-selector" value="courses_uuid">Course unique ID</option><option class="rooms-selector" value="rooms_fullname">Room full name</option><option class="rooms-selector" value="rooms_shortname">Room short name</option><option class="rooms-selector" value="rooms_number">Room number</option><option class="rooms-selector" value="rooms_name">Room name</option><option class="rooms-selector" value="rooms_address">Room address</option><option class="rooms-selector" value="rooms_type">Room type</option><option class="rooms-selector" value="rooms_furniture">Room furniture</option><option class="rooms-selector" value="rooms_href">Room href</option></select><div class="input-group"><span class="input-group-addon" id="basic-addon1">' +
        compPhrase +
        '</span><input type="string" class="form-control" placeholder="Enter String" aria-describedby="basic-addon1"></div></div>';
    return sc;
}