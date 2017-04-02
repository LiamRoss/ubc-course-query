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
        numRooms = getNumRooms(rooms);
        numClasses = getNumClasses(classes);
        var sortedRooms = sortRooms(rooms);
        var sortedClasses = sortClassesToSched(classes);
        availRoomsMWF = [];
        for (var j = 8; j < 17; j++) {
            availRoomsMWF[j] = sortedRooms.slice();
        }
        availRoomsTT = [];
        for (var j = 8; j <= 17; j += 1.5) {
            availRoomsTT[j] = sortedRooms.slice();
        }
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
        return { classSchedule: classSchedule, classesNotScheduled: classesNotScheduled, quality: quality };
    }
    function createScheduleHelper(classes) {
        for (var c = 0; c < numClasses; c++) {
            var highestEnrollmentClass = classes[c];
            var scheduledMWF = false;
            var scheduledTT = false;
            for (var hour = 8; hour < 17; hour++) {
                if (isRoomAvailableMWF(hour)) {
                    var highestCapacityRoom = availRoomsMWF[hour][0];
                    if (highestEnrollmentClass['maxStudents'] <= highestCapacityRoom['rooms_seats']) {
                        scheduleMWF(highestEnrollmentClass, highestCapacityRoom, hour);
                        scheduledMWF = true;
                        break;
                    }
                    else {
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
                        }
                    }
                }
            }
            if (!scheduledMWF && !scheduledTT) {
                classesFailedToSchedule.push(classes[c]);
            }
        }
    }
    function scheduleMWF(c, r, hour) {
        var name = { dept: c['courses_dept'], id: c['courses_id'] };
        sched[r['rooms_name']]['Monday'][hour] = name;
        sched[r['rooms_name']]['lat'] = r['rooms_lat'];
        sched[r['rooms_name']]['lon'] = r['rooms_lon'];
        sched[r['rooms_name']]['buildingName'] = r['rooms_shortname'];
        availRoomsMWF[hour].shift();
    }
    function scheduleTT(c, r, hour) {
        var name = { dept: c['courses_dept'], id: c['courses_id'] };
        sched[r['rooms_name']]['Tuesday'][hour] = name;
        sched[r['rooms_name']]['lat'] = r['rooms_lat'];
        sched[r['rooms_name']]['lon'] = r['rooms_lon'];
        sched[r['rooms_name']]['buildingName'] = r['rooms_shortname'];
        availRoomsTT[hour].shift();
    }
    function sortClassesToSched(classes) {
        function compare(a, b) {
            if (a['maxStudents'] < b['maxStudents']) {
                return 1;
            }
            else if (a['maxStudents'] > b['maxStudents']) {
                return -1;
            }
            return 0;
        }
        return classes.sort(compare);
    }
    function sortRooms(rooms) {
        function compare(a, b) {
            if (a['rooms_seats'] < b['rooms_seats']) {
                return 1;
            }
            else if (a['rooms_seats'] > b['rooms_seats']) {
                return -1;
            }
            return 0;
        }
        return rooms.sort(compare);
    }
    function isRoomAvailableMWF(hour) {
        if (availRoomsMWF[hour].length == 0) {
            return false;
        }
        else {
            return true;
        }
    }
    function isRoomAvailableTT(hour) {
        if (availRoomsTT[hour].length == 0) {
            return false;
        }
        else {
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