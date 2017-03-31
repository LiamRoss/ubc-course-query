// Functions that concern changes to selectors

// changes the currentID if the selector is changed
$("#currentID-selector").change(function () {
    // clear query
    $("#initial-filter > .filter").remove();
    // reset initial query selector
    $("#initial-filter select").val("");
    // get value
    var selected = $(this).children(":selected").val();
    currentID = selected;
    updateCSS();
});

// call checkSelected when comparison-selector changes
$(document).on('change', '.comparison-selector', function () {
    checkSelected();
});

// call checkSelected when sort-selector changes
$(document).on('change', '#sort-selector', function () {
    checkSelected();
});

// call checkSelected when direction-selector changes
$(document).on('change', '#direction-selector', function () {
    checkSelected();
});

// $(document).ready(function() {
// update relevant UI based on filter-selector 
$(document).on('change', '.filter-selector', function () {
    //console.log("filter-selector changed, calling function");
    // find parent div id
    var parentId = "#" + $(this).closest("div").prop("id");
    //console.log("parent id: " + parentId);
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
    // TODO: set title of parent to value of query element
    $(parentId).data('ref', selected);
    $(parentId).prop('title', selected);
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