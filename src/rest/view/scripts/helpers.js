// Functions that build HTML elements

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