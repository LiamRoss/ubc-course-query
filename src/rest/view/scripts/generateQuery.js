function generateQuery() {
    var generatedQuery = {};
    generatedQuery["WHERE"] = generateFilter("initial-filter");
    generatedQuery["OPTIONS"] = generateOptions();
    // TODO: if statement for transformations
    // generatedQuery["TRANSFORMATIONS"] = generateTransform();
    console.log("FINAL QUERY: " + "\n" + JSON.stringify(generatedQuery));

    return JSON.stringify(generatedQuery);
}

// Generate the WHERE part of the query
function generateFilter(rawFilterId) {
    filterId = "#"+rawFilterId;
    var generatedFilter = {};
    console.log("id of current filter: " + filterId);
    var data = $(filterId).data("ref");
    console.log("type of current filter: " + data);

    switch (data) {
        // LOGICCOMPARISON
        case "AND":
        case "OR":
            console.log("LOGICCOMPARISON: " + data);
            var a = [];

            $(filterId).children(".filter").each(function () {
                console.log("subfilter id: " + JSON.stringify(this.id));
                a.push(generateFilter(this.id));
            });
            generatedFilter[data] = a;
            break;

        // COMPARISON:    
        case "LT":
        case "GT":
        case "EQ":
            console.log("COMPARISON: " + data);
            $(filterId).children(".filter").each(function () {
                var key = $(this).find(":selected").val();
                // console.log("key: " + key);
                var value = $(this).find(".form-control").val(); 
                // console.log("value: " + value);

                // console.log("subfilter id: " + JSON.stringify(this.id));
                var o = {};
                o[key] = parseInt(value);
                generatedFilter[data] = o;
            });
            break;

        // SCOMPARISON MODIFIERS:
        case "IS":
            console.log("SCOMPARISON: " + data);
            $(filterId).children(".filter").each(function () {
                var key = $(this).find(":selected").val();
                // console.log("key: " + key);
                var value = $(this).find(".form-control").val(); 
                // console.log("value: " + value);

                // console.log("subfilter id: " + JSON.stringify(this.id));
                var o = {};
                o[key] = value;
                generatedFilter[data] = o;
            });
            break;
        case "IS-s":
            console.log("SCOMPARISON: " + data);
            $(filterId).children(".filter").each(function () {
                var key = $(this).find(":selected").val();
                // console.log("key: " + key);
                var value = $(this).find(".form-control").val(); 
                // console.log("value: " + value);

                // console.log("subfilter id: " + JSON.stringify(this.id));
                var o = {};
                o[key] = value + "*";
                generatedFilter["IS"] = o;
            });
            break;
        case "IS-e":
            console.log("SCOMPARISON: " + data);
            $(filterId).children(".filter").each(function () {
                var key = $(this).find(":selected").val();
                // console.log("key: " + key);
                var value = $(this).find(".form-control").val(); 
                // console.log("value: " + value);

                // console.log("subfilter id: " + JSON.stringify(this.id));
                var o = {};
                o[key] = "*" + value;
                generatedFilter["IS"] = o;
            });            
            break;
        case "IS-c":
            console.log("SCOMPARISON: " + data);
            $(filterId).children(".filter").each(function () {
                var key = $(this).find(":selected").val();
                // console.log("key: " + key);
                var value = $(this).find(".form-control").val(); 
                // console.log("value: " + value);

                // console.log("subfilter id: " + JSON.stringify(this.id));
                var o = {};
                o[key] = "*" + value + "*";
                generatedFilter["IS"] = o;
            });            
            break;

        // NEGATION:
        case "NOT":
            $(filterId).children(".filter").each(function () {
                console.log("subfilter id: " + JSON.stringify(this.id));
                generatedFilter[data] = generateFilter(this.id);
            });
            break;

        default:
            console.log("ERROR: defaulted in filter builder");
            break;
    }
    return generatedFilter;
}






// Generate the OPTIONS part of the query
function generateOptions() {
    var generatedOptions = {};
    var columns = [];
    var order = $("#sort-selector").children(":selected").val();
    console.log("order: " + order);
    var form = "TABLE";

    $('#column-list').children(".column-item").each(function () {
        columns.push($(this).val());
    })

    generatedOptions["COLUMNS"] = columns;
    generatedOptions["ORDER"] = order;
    generatedOptions["FORM"] = form;
    return generatedOptions;
}










function generateTransform() {
    var generatedTransform = {};

    return generatedTransform;
}