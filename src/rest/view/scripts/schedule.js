"use strict";
var Util_1 = require("./src/Util");
var schedule = (function () {
    function schedule() {
        this.sched = {};
        this.classesFailedToSchedule = [];
        this.numRooms = 0;
        this.numClasses = 0;
        this.availRoomsMWF = {};
        this.availRoomsTT = {};
    }
    schedule.prototype.createSchedule = function (classes, rooms) {
        Util_1.default.trace("Creating schedule...");
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
        Util_1.default.trace("availRoomsMWF initialized...");
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
        Util_1.default.trace("availRoomsTT initialized...");
        this.createScheduleHelper(sortedClasses);
        var classSchedule = this.sched;
        var classesNotScheduled = this.classesFailedToSchedule;
        var quality = this.classesFailedToSchedule.length / this.numClasses;
        return { classSchedule: classSchedule, classesNotScheduled: classesNotScheduled, quality: quality };
    };
    schedule.prototype.createScheduleHelper = function (classes) {
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
                        Util_1.default.trace("    The highest capacity room isn't big enough...");
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
                            Util_1.default.trace("    The highest capacity room isn't big enough...");
                        }
                    }
                }
            }
            if (!scheduledMWF && !scheduledTT) {
                Util_1.default.trace("    " + JSON.stringify(classes[c]) + " was not fitted into the schedule....");
                this.classesFailedToSchedule.push(classes[c]);
            }
        }
    };
    schedule.prototype.scheduleMWF = function (c, r, hour) {
        this.sched[r]["Monday"][hour] = c;
        this.sched[r]["Wednesday"][hour] = c;
        this.sched[r]["Friday"][hour] = c;
        Util_1.default.trace("    Class " + JSON.stringify(c) + " scheduled at " + hour + "h in room " + JSON.stringify(r) + "on Monday/Wednesday/Friday");
        this.availRoomsMWF = this.availRoomsMWF.splice(0, 1);
    };
    schedule.prototype.scheduleTT = function (c, r, hour) {
        this.sched[r]["Tuesday"][hour] = c;
        this.sched[r]["Thursday"][hour] = c;
        Util_1.default.trace("    Class " + JSON.stringify(c) + " scheduled at " + hour + "h in room " + JSON.stringify(r) + "on Tuesday/Thursday");
        this.availRoomsTT = this.availRoomsTT.splice(0, 1);
    };
    schedule.prototype.sortClassesToSched = function (classes) {
        Util_1.default.trace("    Sorting classesToSched...");
        for (var _i = 0, classes_1 = classes; _i < classes_1.length; _i++) {
            var section = classes_1[_i];
            section['numStudents'] = this.getNumStudents(section);
        }
        function compare(a, b) {
            if (a['numStudents'] < b['numStudents']) {
                return 1;
            }
            else if (a['numStudents'] > b['numStudents']) {
                return -1;
            }
            return 0;
        }
        Util_1.default.trace("    classesToSched sorted successfully!");
        return classes.sort(compare);
    };
    schedule.prototype.sortRooms = function (rooms) {
        Util_1.default.trace("    Sorting rooms...");
        function compare(a, b) {
            if (a['seats'] < b['seats']) {
                return 1;
            }
            else if (a['seats'] > b['seats']) {
                return -1;
            }
            return 0;
        }
        Util_1.default.trace("    rooms sorted successfully!");
        return rooms.sort(compare);
    };
    schedule.prototype.isRoomAvailable = function (availRooms, day, hour) {
        if (availRooms[day][hour].length == 0) {
            return false;
        }
        else {
            return true;
        }
    };
    schedule.prototype.getAvailRoomsForDayAtHour = function (availRooms, day, hour) {
        return availRooms[day][hour];
    };
    schedule.prototype.getNumStudents = function (classSection) {
        return classSection['pass'] + classSection['fail'];
    };
    schedule.prototype.getNumRooms = function (rooms) {
        return rooms.length;
    };
    schedule.prototype.getNumClasses = function (classes) {
        return classes.length;
    };
    return schedule;
}());
//# sourceMappingURL=schedule.js.map