function scheduleMaker(classes, rooms) {
    var sched = {};
    for (var r_i = 0; r_i < rooms.length; r_i++) {
        var name_1 = rooms[r_i]['rooms_name'];
        sched[name_1] = [];
        for (var day = 0; day < 5; day++) {
            switch (day) {
                case 0:
                    sched[name_1]["Monday"] = [];
                    break;
                case 1:
                    sched[name_1]["Tuesday"] = [];
                    break;
            }
        }
    }
    var classesFailedToSchedule = [];
    var numRooms = 0;
    var numClasses = 0;
    var availRoomsMWF = {};
    var availRoomsTT = {};
    return createSchedule(classes, rooms);
    function createSchedule(classes, rooms) {
        console.log("Creating schedule...");
        numRooms = getNumRooms(rooms);
        numClasses = getNumClasses(classes);
        console.log("numClasses = " + numClasses + " numRooms = " + numRooms);
        var sortedRooms = sortRooms(rooms);
        var sortedClasses = sortClassesToSched(classes);
        availRoomsMWF = [];
        for (var j = 8; j < 17; j++) {
            availRoomsMWF[j] = sortedRooms.slice();
        }
        console.log("availRoomsMWF initialized...");
        availRoomsTT = [];
        for (var j = 8; j <= 17; j += 1.5) {
            availRoomsTT[j] = sortedRooms.slice();
        }
        console.log("availRoomsTT initialized...");
        createScheduleHelper(sortedClasses);
        var classSchedule = sched;
        var classesNotScheduled = classesFailedToSchedule;
        var quality = 1;
        if (classesFailedToSchedule.length == 0) {
            quality = 1;
        }
        else {
            quality = classesFailedToSchedule.length / numClasses;
        }
        console.log(sched);
        console.log("Number of classes that failed to be scheduled: " + classesNotScheduled.length);
        console.log("Quality: " + quality);
        return { classSchedule: classSchedule, classesNotScheduled: classesNotScheduled, quality: quality };
    }
    function createScheduleHelper(classes) {
        console.log("in createScheduleHelper");
        for (var c = 0; c < numClasses; c++) {
            var highestEnrollmentClass = classes[c];
            console.log("c = " + c, ", numStudents = " + highestEnrollmentClass['maxStudents']);
            var scheduledMWF = false;
            var scheduledTT = false;
            for (var hour = 8; hour < 17; hour++) {
                if (isRoomAvailableMWF(hour)) {
                    console.log(availRoomsMWF[hour]);
                    var highestCapacityRoom = availRoomsMWF[hour][0];
                    console.log("highestCapacityRoom seats = " + highestCapacityRoom['rooms_seats'] + ", name = " + highestCapacityRoom['rooms_name']);
                    if (highestEnrollmentClass['maxStudents'] <= highestCapacityRoom['rooms_seats']) {
                        scheduleMWF(highestEnrollmentClass, highestCapacityRoom, hour);
                        scheduledMWF = true;
                        break;
                    }
                    else {
                        console.log("    The highest capacity room isn't big enough...");
                    }
                }
            }
            if (!scheduledMWF) {
                for (var hour = 8; hour < 17; hour += 1.5) {
                    if (isRoomAvailableTT(hour)) {
                        var highestCapacityRoom = availRoomsTT[hour][0];
                        if (highestEnrollmentClass['maxStudents'] <= highestCapacityRoom['rooms_seats']) {
                            scheduleTT(highestEnrollmentClass, highestCapacityRoom, hour);
                            scheduledTT = true;
                            break;
                        }
                        else {
                            console.log("    The highest capacity room isn't big enough...");
                        }
                    }
                }
            }
            if (!scheduledMWF && !scheduledTT) {
                console.log("    " + JSON.stringify(classes[c]) + " was not fitted into the schedule.");
                classesFailedToSchedule.push(classes[c]);
            }
        }
        console.log("Done in createScheduleHelper");
    }
    function scheduleMWF(c, r, hour) {
        var name = { dept: c['courses_dept'], id: c['courses_id'] };
        sched[r['rooms_name']]['Monday'][hour] = name;
        sched[r['rooms_name']]['lat'] = r['rooms_lat'];
        sched[r['rooms_name']]['lon'] = r['rooms_lon'];
        sched[r['rooms_name']]['buildingName'] = r['rooms_shortname'];
        console.log("    Class " + name + " scheduled at " + hour + "h in room " + r['rooms_name'] + " on Monday/Wednesday/Friday");
        availRoomsMWF[hour].shift();
        console.log(availRoomsMWF[hour].length);
    }
    function scheduleTT(c, r, hour) {
        var name = { dept: c['courses_dept'], id: c['courses_id'] };
        sched[r['rooms_name']]['Tuesday'][hour] = name;
        sched[r['rooms_name']]['lat'] = r['rooms_lat'];
        sched[r['rooms_name']]['lon'] = r['rooms_lon'];
        sched[r['rooms_name']]['buildingName'] = r['rooms_shortname'];
        console.log("    Class " + name + " scheduled at " + hour + "h in room " + r['rooms_name'] + " on Tuesday/Thursday");
        availRoomsTT[hour].shift();
        console.log(availRoomsTT[hour]);
    }
    function sortClassesToSched(classes) {
        console.log("    Sorting classesToSched...");
        function compare(a, b) {
            if (a['maxStudents'] < b['maxStudents']) {
                return 1;
            }
            else if (a['maxStudents'] > b['maxStudents']) {
                return -1;
            }
            return 0;
        }
        console.log("    classesToSched sorted successfully!");
        return classes.sort(compare);
    }
    function sortRooms(rooms) {
        console.log("    Sorting rooms...");
        function compare(a, b) {
            if (a['rooms_seats'] < b['rooms_seats']) {
                return 1;
            }
            else if (a['rooms_seats'] > b['rooms_seats']) {
                return -1;
            }
            return 0;
        }
        console.log("    rooms sorted successfully!");
        console.log(rooms.sort(compare));
        return rooms.sort(compare);
    }
    function isRoomAvailableMWF(hour) {
        console.log("Checking MWF" + " @ " + hour);
        if (availRoomsMWF[hour].length == 0) {
            return false;
        }
        else {
            console.log("There's a free slot!");
            return true;
        }
    }
    function isRoomAvailableTT(hour) {
        console.log("Checking TT" + " @ " + hour);
        if (availRoomsTT[hour].length == 0) {
            return false;
        }
        else {
            console.log("There's a free slot!");
            return true;
        }
    }
    function getNumRooms(rooms) {
        return rooms.length;
    }
    function getNumClasses(classes) {
        return classes.length;
    }
}
//# sourceMappingURL=schedule.js.map