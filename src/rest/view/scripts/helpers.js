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
        '"><select class="btn btn-default comparison-selector float-left"><option value="" selected id="placeholder">Select a Key</option><option class="courses-selector" value="courses_avg">Average</option><option class="courses-selector" value="courses_pass">Passed</option><option class="courses-selector" value="courses_fail">Failed</option><option class="courses-selector" value="courses_audit">Audited</option><option class="rooms-selector" value="rooms_lat">Latitude</option><option class="rooms-selector" value="rooms_lon">Longitude</option><option class="rooms-selector" value="rooms_seats">Seats</option></select><div class="input-group"><span class="input-group-addon" id="basic-addon1">' +
        compPhrase +
        '</span><input type="number" class="form-control" placeholder="Enter Number" aria-describedby="basic-addon1"></div></div>';
    return mc;
}

function makeSComparison(uniqueId, compPhrase, filterColor) {
    console.log("creating SComparison");
    // initialize filter with first uniqueIdModifier
    var sc = '<div class="filter ' + filterColor + ' comparison-override" id="' + uniqueId +
        '"><select class="btn btn-default comparison-selector float-left"><option value="" selected id="placeholder">Select a Key</option><option class="courses-selector" value="courses_dept">Department</option><option class="courses-selector" value="courses_id">ID</option><option class="courses-selector" value="courses_instructor">Instructor</option><option class="courses-selector" value="courses_title">Title</option><option class="courses-selector" value="courses_uuid">Unique ID</option><option class="rooms-selector" value="rooms_fullname">Full name</option><option class="rooms-selector" value="rooms_shortname">Short name</option><option class="rooms-selector" value="rooms_number">Room number</option><option class="rooms-selector" value="rooms_name">Room name</option><option class="rooms-selector" value="rooms_address">Room address</option><option class="rooms-selector" value="rooms_type">Room type</option><option class="rooms-selector" value="rooms_furniture">Room furniture</option><option class="rooms-selector" value="rooms_href">Room href</option></select><div class="input-group"><span class="input-group-addon" id="basic-addon1">' +
        compPhrase +
        '</span><input type="string" class="form-control" placeholder="Enter String" aria-describedby="basic-addon1"></div></div>';
    return sc;
}