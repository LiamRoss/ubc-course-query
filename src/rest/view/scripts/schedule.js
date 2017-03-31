function scheduleMaker(classes, rooms) {
}
var sched = {};
var classesFailedToSchedule = [];
var numRooms = 0;
var numClasses = 0;
var availRoomsMWF = {};
var availRoomsTT = {};
function createSchedule(classes, rooms) {
    console.log("Creating schedule...");
    this.numRooms = this.getNumRooms(rooms);
    this.numClasses = this.getNumClasses(classes);
    var sortedRooms = this.sortRooms(rooms.slice());
    var sortedClasses = this.sortClassesToSched(classes.slice());
    for (var i = 0; i < 5; i += 2) {
        switch (i) {
            case 0:
                for (var j = 0; j < 24; j++) {
                    this.availRoomsMWF['Monday'][j] = sortedRooms;
                }
                break;
            case 2:
                for (var j = 0; j < 24; j++) {
                    this.availRoomsMWF['Wednesday'][j] = sortedRooms;
                }
                break;
            case 4:
                for (var j = 0; j < 24; j++) {
                    this.availRoomsMWF['Friday'][j] = sortedRooms;
                }
                break;
        }
    }
    console.log("availRoomsMWF initialized...");
    for (var i = 1; i < 4; i++) {
        switch (i) {
            case 1:
                for (var j = 0; j < 24; j += 1.5) {
                    this.availRoomsTT['Tuesday'][j] = sortedRooms;
                }
                break;
            case 3:
                for (var j = 0; j < 24; j += 1.5) {
                    this.availRoomsTT['Tuesday'][j] = sortedRooms;
                }
                break;
        }
    }
    console.log("availRoomsTT initialized...");
    this.createScheduleHelper(sortedClasses);
    var classSchedule = this.sched;
    var classesNotScheduled = this.classesFailedToSchedule;
    var quality = this.classesFailedToSchedule.length / this.numClasses;
    return { classSchedule: classSchedule, classesNotScheduled: classesNotScheduled, quality: quality };
}
function createScheduleHelper(classes) {
    for (var c = 0; c < this.numClasses.length; c++) {
        var highestEnrollmentClass = classes[c];
        var scheduledMWF = false;
        var scheduledTT = false;
        for (var hour = 8; hour <= 17; hour++) {
            if (this.isRoomAvailable(this.availRoomsMWF, "Monday", hour)) {
                var highestCapacityRoom = this.getAvailRoomsForDayAtHour(this.availRoomsMWF, "Monday", hour)[0];
                if (highestEnrollmentClass['numStudents'] <= highestCapacityRoom['capacity']) {
                    this.scheduleMWF(highestEnrollmentClass, highestCapacityRoom, hour);
                    scheduledMWF = true;
                    break;
                }
                else {
                    console.log("    The highest capacity room isn't big enough...");
                }
            }
        }
        if (!scheduledMWF) {
            for (var hour = 8; hour <= 17; hour += 1.5) {
                if (this.isRoomAvailable(this.availRoomsTT, "Tuesday", hour)) {
                    var highestCapacityRoom = this.getAvailRoomsForDayAtHour(this.availRoomsTT, "Tuesday", hour)[0];
                    if (highestEnrollmentClass['numStudents'] <= highestCapacityRoom['capacity']) {
                        this.scheduleTT(highestEnrollmentClass, highestCapacityRoom, hour);
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
            console.log("    " + JSON.stringify(classes[c]) + " was not fitted into the schedule....");
            this.classesFailedToSchedule.push(classes[c]);
        }
    }
}
function scheduleMWF(c, r, hour) {
    this.sched[r]["Monday"][hour] = c;
    this.sched[r]["Wednesday"][hour] = c;
    this.sched[r]["Friday"][hour] = c;
    console.log("    Class " + JSON.stringify(c) + " scheduled at " + hour + "h in room " + JSON.stringify(r) + "on Monday/Wednesday/Friday");
    this.availRoomsMWF = this.availRoomsMWF.splice(0, 1);
}
function scheduleTT(c, r, hour) {
    this.sched[r]["Tuesday"][hour] = c;
    this.sched[r]["Thursday"][hour] = c;
    console.log("    Class " + JSON.stringify(c) + " scheduled at " + hour + "h in room " + JSON.stringify(r) + "on Tuesday/Thursday");
    this.availRoomsTT = this.availRoomsTT.splice(0, 1);
}
function sortClassesToSched(classes) {
    console.log("    Sorting classesToSched...");
    function compare(a, b) {
        if (a['numStudents'] < b['numStudents']) {
            return 1;
        }
        else if (a['numStudents'] > b['numStudents']) {
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
        if (a['seats'] < b['seats']) {
            return 1;
        }
        else if (a['seats'] > b['seats']) {
            return -1;
        }
        return 0;
    }
    console.log("    rooms sorted successfully!");
    return rooms.sort(compare);
}
function isRoomAvailable(availRooms, day, hour) {
    if (availRooms[day][hour].length == 0) {
        return false;
    }
    else {
        return true;
    }
}
function getAvailRoomsForDayAtHour(availRooms, day, hour) {
    return availRooms[day][hour];
}
function getNumRooms(rooms) {
    return rooms.length;
}
function getNumClasses(classes) {
    return classes.length;
}
//# sourceMappingURL=schedule.js.map