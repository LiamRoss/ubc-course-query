// Functions that control button click actions

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
            alert("Successfully uploaded file");
            //console.log(fileToLoad.name + " was successfully uploaded.");
            // if (fileToLoad.name === "courses.zip") {
            //     $("#courses-uploaded").removeClass("alert-success");
            //     $("#courses-uploaded").removeClass("alert-danger");
            //     $("#courses-uploaded").addClass("alert-success");
            //     hascourses = true;
            // } else if (fileToLoad.name === "rooms.zip") {
            //     $("#rooms-uploaded").removeClass("alert-success");
            //     $("#rooms-uploaded").removeClass("alert-danger");
            //     $("#rooms-uploaded").addClass("alert-success");
            //     hasrooms = true;
            // }
            updateUploadedJson();
        }).fail(function (data) {
            alert("Failed to upload file");
            console.error('ERROR - Failed to upload ' + fileToLoad.name + ". data = " + JSON.stringify(
                data));
        });
    }
});

$('#btnSubmit').click(function () {
    // make table display again
    $("#results-table").css("display", "table");
    // clear table
    $("#tblResults").empty();
    // var query = $("#txtQuery").val();
    //console.log("query", query);
    // TODO: form query
    var query = generateQuery();

    $.ajax({
        url: 'http://localhost:4321/query',
        type: 'post',
        data: JSON.stringify(query),
        contentType: 'application/json',
        dataType: 'json'
    }).done(function (data) {
        alert("Successfully uploaded file");
        //console.log("Response: ", data);
        generateTable(data.result);

    }).fail(function () {
        alert("Failed to upload file");
        console.error("ERROR - Failed to submit query.");
    });

    function generateTable(data) {
        var tbl_head = document.createElement("thead");
        var tbl_body = document.createElement("tbody");
        // var odd_even = false;
        //console.log("DATA", data);
        var tbl_head_row = tbl_head.insertRow();
        $.each(data[0], function (k, v) {
            var cell_head = tbl_head_row.insertCell();
            cell_head.appendChild(document.createTextNode(k.toString()));
            //console.log("header value: " + k);
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

$('.and-or-button').click(function () {
    if ($(this).hasClass("room-button")) {
        $('.room-button').removeClass("selected");
        if ($(this).hasClass("room-button-and")) {
            $('.room-button-and').addClass("selected");
        } else if ($(this).hasClass("room-button-or")) {
            $('.room-button-or').addClass("selected");
        } else {
            console.log("ERROR: can't find and or for room");
        }
    } else if ($(this).hasClass("course-button")) {
        $('.course-button').removeClass("selected");
        if ($(this).hasClass("course-button-and")) {
            $('.course-button-and').addClass("selected");
        } else if ($(this).hasClass("course-button-or")) {
            $('.course-button-or').addClass("selected");
        } else {
            console.log("ERROR: can't find and or for course");
        }
    } else {
        console.log("ERROR: and-or selector does not have valid class");
    }
});

$('#column-adder').click(function () {

    var b = false;

    if ($('#column-selector').children(":selected").attr("id") == "placeholder") {
        return;
    }

    var uniqueId = new Date().getTime().toString() + "column";

    var val = $('#column-selector').children(":selected").val();
    var text = $('#column-selector').children(":selected").text();

    $(".column-item").each( function (i) {
        console.log("inside each, index = " + i);
        if ($(this).val() == val) {
            console.log("values are equal!!");
            b = true;
        }
    })

    if (b) {
        return;
    }

    var column = '<button id="' + uniqueId + '" value="' + val + '" class="column-item btn btn-default">' + text + '</button>';
    $(column).appendTo('#column-list');
})

$(document).on('click', '.column-item', function () {
    var id = $(this).attr("id");
    console.log("id: " + id);
    $("#" + id).remove();
})