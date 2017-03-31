/**
* Created by Alice on 3/20/17.
*/


function scheduleMaker(classes: any[], rooms: any[]): any {

}

// Global schedule object
// Will be returned when program terminates
// Format is [RoomName][Day][Hour]
var sched: any = {};

// Array of the classes that were unable to be scheduled within 8am-5pm
var classesFailedToSchedule: any[] = [];

// Global variables for keeping track of number of rooms and classes given
var numRooms: any = 0;
var numClasses: any = 0;

// Object of rooms that are available
// Format is DayOfWeek -> Hour -> Array of available rooms at that hour/day
var availRoomsMWF: any = {};
var availRoomsTT: any = {};

/**
 * Creates a schedule given an array of classes and an array of rooms
 * Notes: There can be 9 classes in an 8am to 5pm MON/WED/FRI day
 *        There can be 6 classes in an 8am to 5pm TUES/FRI day
 *        This means that there are:
 *              15 * (numRooms)
 *        Spots open for classes each week until we go outside of
 *        8am-5pm and reduce the quality of the schedule.
 * @param classes
 * @param rooms
 */
function createSchedule(classes: any[], rooms: any[]): any {
    console.log("Creating schedule...");

    this.numRooms = this.getNumRooms(rooms);
    this.numClasses = this.getNumClasses(classes);

    let sortedRooms = this.sortRooms(rooms.slice()); // .slice() copies the 'rooms' array
    let sortedClasses = this.sortClassesToSched(classes.slice());

    // Initialize the MWF available rooms object
    // Initially, all rooms will be available on any given day at any given hour:
    /*
     * 0 = Monday
     * 1 = Tuesday
     * 2 = Wednesday
     * 3 = Thursday
     * 4 = Friday
     */
    for (let i = 0; i < 5; i += 2) {
        switch (i) {
            case 0:
                for (let j = 0; j < 24; j++) {
                    this.availRoomsMWF['Monday'][j] = sortedRooms;
                }
                break;
            case 2:
                for (let j = 0; j < 24; j++) {
                    this.availRoomsMWF['Wednesday'][j] = sortedRooms;
                }
                break;
            case 4:
                for (let j = 0; j < 24; j++) {
                    this.availRoomsMWF['Friday'][j] = sortedRooms;
                }
                break;
        }
    }

    console.log("availRoomsMWF initialized...");


    // Initialize the TT available rooms object
    for (let i = 1; i < 4; i++) {
        switch (i) {
            case 1:
                for (let j = 0; j < 24; j += 1.5) {
                    this.availRoomsTT['Tuesday'][j] = sortedRooms;
                }
                break;

            case 3:
                for (let j = 0; j < 24; j += 1.5) {
                    this.availRoomsTT['Tuesday'][j] = sortedRooms;
                }
                break;
        }
    }

    console.log("availRoomsTT initialized...");

    // Now we can start scheduling
    this.createScheduleHelper(sortedClasses);

    let classSchedule = this.sched;
    let classesNotScheduled = this.classesFailedToSchedule;
    let quality = this.classesFailedToSchedule.length / this.numClasses;

    return {classSchedule, classesNotScheduled, quality};
}

/**
 * Helper for creating the schedule
 * Schedules the class with the highest number of students first
 * @param classes
 * @param availRooms
 */
function createScheduleHelper(classes: any[]) {

    for (let c = 0; c < this.numClasses.length; c++) {

        // The class that we are going to try and schedule
        let highestEnrollmentClass = classes[c];

        let scheduledMWF: boolean = false;
        let scheduledTT: boolean = false;

        // We can just check Monday and not W/F
        // Check monday first:
        for (let hour = 8; hour <= 17; hour++) { // 24H time
            if (this.isRoomAvailable(this.availRoomsMWF, "Monday", hour)) {

                // They're already sorted so just grab the biggest one off of the top
                let highestCapacityRoom = this.getAvailRoomsForDayAtHour(this.availRoomsMWF, "Monday", hour)[0];

                if (highestEnrollmentClass['numStudents'] <= highestCapacityRoom['capacity']) {
                    this.scheduleMWF(highestEnrollmentClass, highestCapacityRoom, hour);
                    scheduledMWF = true;
                    break;
                } else {
                    console.log("    The highest capacity room isn't big enough...");
                }
            }
        }

        if (!scheduledMWF) {
            for (let hour = 8; hour <= 17; hour += 1.5) {
                if (this.isRoomAvailable(this.availRoomsTT, "Tuesday", hour)) {

                    let highestCapacityRoom = this.getAvailRoomsForDayAtHour(this.availRoomsTT, "Tuesday", hour)[0];

                    if (highestEnrollmentClass['numStudents'] <= highestCapacityRoom['capacity']) {
                        this.scheduleTT(highestEnrollmentClass, highestCapacityRoom, hour);
                        scheduledTT = true;
                        break;
                    } else {
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

/**
 * Helper function
 * Schedules the given class on MWF
 * @param c  The class to schedule
 * @param r  The room to schedule it in
 * @param hour  The hour to schedule it at
 */
function scheduleMWF(c: any, r: any, hour: any) {
    // Put into schedule
    this.sched[r]["Monday"][hour] = c;
    this.sched[r]["Wednesday"][hour] = c;
    this.sched[r]["Friday"][hour] = c;
    console.log("    Class " + JSON.stringify(c) + " scheduled at " + hour + "h in room " + JSON.stringify(r) + "on Monday/Wednesday/Friday");

    // Remove the first element from the availRooms as we scheduled it now
    this.availRoomsMWF = this.availRoomsMWF.splice(0, 1);

}

/**
 * Helper function
 * Schedules the given class on TT
 * @param c  The class to schedule
 * @param r  The room to schedule it in
 * @param hour  The hour to schedule it at
 */
function scheduleTT(c: any, r: any, hour: any) {
    // Put into schedule
    this.sched[r]["Tuesday"][hour] = c;
    this.sched[r]["Thursday"][hour] = c;
    console.log("    Class " + JSON.stringify(c) + " scheduled at " + hour + "h in room " + JSON.stringify(r) + "on Tuesday/Thursday");

    // Remove the first element from the availRooms as we scheduled it now
    this.availRoomsTT = this.availRoomsTT.splice(0, 1);
}

/**
 * Helper function
 * Sorts the array of this.classesToSched by the number of students in decr. order
 * Also adds a property to each class section 'numStudents' which contains the number
 * of students in the section
 */
function sortClassesToSched(classes: any[]) {
    console.log("    Sorting classesToSched...");

    // Now, sort based on this new property in descending order
    // Comparison function for sorting
    function compare(a: any, b: any) {
        if (a['numStudents'] < b['numStudents']) {
            return 1;
        } else if (a['numStudents'] > b['numStudents']) {
            return -1;
        }
        return 0;
    }

    console.log("    classesToSched sorted successfully!");

    return classes.sort(compare);
}

/**
 * Helper function
 * Sorts the array of given rooms by their seat capacity in decr. order
 * @param rooms
 */
function sortRooms(rooms: any[]) {
    console.log("    Sorting rooms...");

    // Comparison function for sorting
    function compare(a: any, b: any) {
        if (a['seats'] < b['seats']) {
            return 1;
        } else if (a['seats'] > b['seats']) {
            return -1;
        }
        return 0;
    }

    console.log("    rooms sorted successfully!");

    return rooms.sort(compare);
}

/**
 * Helper function
 * Returns true if there are any rooms available on the given day at the given hour
 * @param availRooms
 * @param day
 * @param hour
 * @returns {boolean}
 */
function isRoomAvailable(availRooms: any[], day: any, hour: number): boolean {
    if (availRooms[day][hour].length == 0) {
        return false;
    } else {
        return true;
    }
}

/**
 * Helper function
 * Returns the array of available rooms at the given day and time (hour)
 * @param day
 * @param hour
 * @param availRooms
 * @returns {any}
 */
function getAvailRoomsForDayAtHour(availRooms: any[], day: any, hour: number): any[] {
    return availRooms[day][hour];
}

/**
 * Helper function
 * @param rooms - rooms array to compute length of
 * @returns {number} - computed length
 */
function getNumRooms(rooms: any[]): number {
    return rooms.length;
}

/**
 * Helper function
 * @param classes - classes array to compute length of
 * @returns {number} - computed length
 */
function getNumClasses(classes: any[]): number {
    return classes.length;
}