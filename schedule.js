"use strict";
var Util_1 = require("./src/Util");
var schedule = (function () {
    function schedule() {
        this.schedule = {};
        this.numRooms = 0;
        this.numClasses = 0;
        this.threshold = 0;
    }
    schedule.prototype.createSchedule = function (classes, rooms) {
        Util_1.default.trace("Creating schedule...");
        this.numRooms = this.getNumRooms(rooms);
        this.numClasses = this.getNumClasses(classes);
        this.threshold = this.numRooms * 15;
        var sortedRooms = this.sortRooms(rooms.slice());
        var sortedClasses = this.sortClassesToSched(classes.slice());
        var availRooms = {};
        for (var i = 0; i < 5; i++) {
            switch (i) {
                case 0:
                    for (var j = 0; j < 24; j++) {
                        availRooms['Monday'][j] = sortedRooms;
                    }
                    break;
                case 1:
                    for (var j = 0; j < 24; j++) {
                        availRooms['Tuesday'][j] = sortedRooms;
                    }
                    break;
                case 2:
                    for (var j = 0; j < 24; j++) {
                        availRooms['Wednesday'][j] = sortedRooms;
                    }
                    break;
                case 3:
                    for (var j = 0; j < 24; j++) {
                        availRooms['Thursday'][j] = sortedRooms;
                    }
                    break;
                case 4:
                    for (var j = 0; j < 24; j++) {
                        availRooms['Friday'][j] = sortedRooms;
                    }
                    break;
            }
        }
        Util_1.default.trace("availRooms initialized! Beginning recursive helper...");
        return this.createScheduleHelper(sortedClasses, availRooms);
    };
    schedule.prototype.createScheduleHelper = function (classes, availRooms) {
        var highestEnrollmentClass = classes[0];
        for (var hour = 8; hour < 18; hour++) {
            if (this.isRoomAvailable(availRooms, "Monday", hour)) {
            }
        }
    };
    schedule.prototype.sortClassesToSched = function (classes) {
        Util_1.default.trace("Sorting classesToSched...");
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
        Util_1.default.trace("classesToSched sorted successfully!");
        return classes.sort(compare);
    };
    schedule.prototype.sortRooms = function (rooms) {
        Util_1.default.trace("Sorting rooms...");
        function compare(a, b) {
            if (a['seats'] < b['seats']) {
                return 1;
            }
            else if (a['seats'] > b['seats']) {
                return -1;
            }
            return 0;
        }
        Util_1.default.trace("rooms sorted successfully!");
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