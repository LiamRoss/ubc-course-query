/**
 * Created by Alice on 3/20/17.
 */


function scheduleMaker(classes: any[], rooms: any[]): any {
    // Global schedule object
    // Will be returned when program terminates
    // Format is [RoomName][Day][Hour]
    var sched: any = {};

    // Initialize the sched thing
    for(let r_i = 0; r_i < rooms.length; r_i++) {
        let name = rooms[r_i]['rooms_name'];
        sched[name] = [];
        for(let day = 0; day < 5; day++) {
            switch(day) {
                case 0:
                    sched[name]["Monday"] = [];
                    break;
                case 1:
                    sched[name]["Tuesday"] = [];
                    break;
            }
        }
    }

    // Array of the classes that were unable to be scheduled within 8am-5pm
    var classesFailedToSchedule: any[] = [];

    // Global variables for keeping track of number of rooms and classes given
    var numRooms: any = 0;
    var numClasses: any = 0;

    // Object of rooms that are available
    // Format is DayOfWeek -> Hour -> Array of available rooms at that hour/day
    var availRoomsMWF: any = {};
    var availRoomsTT: any = {};

    return createSchedule(classes, rooms);

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
        //console.log("Creating schedule...");

        numRooms = getNumRooms(rooms);
        numClasses = getNumClasses(classes);
        //console.log("numClasses = " + numClasses + " numRooms = " + numRooms);

        let sortedRooms = sortRooms(rooms); // .slice() copies the 'rooms' array
        let sortedClasses = sortClassesToSched(classes);

        // Initialize the MWF available rooms object
        // Initially, all rooms will be available on any given day at any given hour:
        /*
         * 0 = Monday
         * 1 = Tuesday
         * 2 = Wednesday
         * 3 = Thursday
         * 4 = Friday
         */
        availRoomsMWF = [];
        for (let j = 8; j < 17; j++) {
            availRoomsMWF[j] = sortedRooms.slice();
        }

        //console.log("availRoomsMWF initialized...");

        // Initialize the TT available rooms object
        availRoomsTT = [];
        for (let j = 8; j <= 17; j += 1.5) {
            availRoomsTT[j] = sortedRooms.slice();
        }

        //console.log("availRoomsTT initialized...");

        // Now we can start scheduling
        createScheduleHelper(sortedClasses);

        let classSchedule = sched;
        let classesNotScheduled = classesFailedToSchedule;
        let quality =  1;
        if(classesFailedToSchedule.length == 0) {
            quality = 1;
        } else {
            quality = classesFailedToSchedule.length / numClasses;
        }

        //console.log(sched);
        console.log("Number of classes that failed to be scheduled: " + classesNotScheduled.length);
        console.log("Quality: " + quality);

        return {classSchedule, classesNotScheduled, quality};
    }

    /**
     * Helper for creating the schedule
     * Schedules the class with the highest number of students first
     * @param classes
     * @param availRooms
     */
    function createScheduleHelper(classes: any[]) {
        //console.log("in createScheduleHelper");

        for (let c = 0; c < numClasses; c++) {
            // The class that we are going to try and schedule
            let highestEnrollmentClass = classes[c];

            //console.log("c = " + c, ", numStudents = " + highestEnrollmentClass['maxStudents']);

            let scheduledMWF: boolean = false;
            let scheduledTT: boolean = false;

            // We can just check Monday and not W/F
            // Check monday first:
            for (let hour = 8; hour < 17; hour++) { // 24H time
                if (isRoomAvailableMWF(hour)) {

                    // They're already sorted so just grab the biggest one off of the top
                    //console.log(availRoomsMWF[hour]);
                    let highestCapacityRoom = availRoomsMWF[hour][0];

                    //console.log("highestCapacityRoom seats = " + highestCapacityRoom['rooms_seats'] + ", name = " + highestCapacityRoom['rooms_name']);

                    if (highestEnrollmentClass['maxStudents'] <= highestCapacityRoom['rooms_seats']) {
                        scheduleMWF(highestEnrollmentClass, highestCapacityRoom, hour);
                        scheduledMWF = true;
                        break;
                    } else {
                        //console.log("    The highest capacity room isn't big enough...");
                    }
                }
            }

            if (!scheduledMWF) {
                for (let hour = 8; hour < 17; hour += 1.5) {
                    if (isRoomAvailableTT(hour)) {

                        let highestCapacityRoom = availRoomsTT[hour][0];

                        if (highestEnrollmentClass['maxStudents'] <= highestCapacityRoom['rooms_seats']) {
                            scheduleTT(highestEnrollmentClass, highestCapacityRoom, hour);
                            scheduledTT = true;
                            break;
                        } else {
                            //console.log("    The highest capacity room isn't big enough...");
                        }
                    }
                }
            }

            if (!scheduledMWF && !scheduledTT) {
                //console.log("    " + JSON.stringify(classes[c]) + " was not fitted into the schedule.");
                classesFailedToSchedule.push(classes[c]);
            }
        }
        //console.log("Done in createScheduleHelper");
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
        let name = { dept: c['courses_dept'], id: c['courses_id'] };
        sched[r['rooms_name']]['Monday'][hour] = name;
        sched[r['rooms_name']]['lat'] = r['rooms_lat'];
        sched[r['rooms_name']]['lon'] = r['rooms_lon'];
        sched[r['rooms_name']]['buildingName'] = r['rooms_shortname'];
        //console.log("    Class " + name + " scheduled at " + hour + "h in room " + r['rooms_name'] + " on Monday/Wednesday/Friday");

        // Remove the first element from the availRooms as we scheduled it now
        availRoomsMWF[hour].shift();
        //console.log(availRoomsMWF[hour].length);
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
        let name = { dept: c['courses_dept'], id: c['courses_id'] };
        sched[r['rooms_name']]['Tuesday'][hour] = name;
        sched[r['rooms_name']]['lat'] = r['rooms_lat'];
        sched[r['rooms_name']]['lon'] = r['rooms_lon'];
        sched[r['rooms_name']]['buildingName'] = r['rooms_shortname'];
        //console.log("    Class " + name + " scheduled at " + hour + "h in room " + r['rooms_name'] + " on Tuesday/Thursday");

        // Remove the first element from the availRooms as we scheduled it now
        availRoomsTT[hour].shift();
        //console.log(availRoomsTT[hour]);
    }

    /**
     * Helper function
     * Sorts the array of classesToSched by the number of students in decr. order
     * Also adds a property to each class section 'numStudents' which contains the number
     * of students in the section
     */
    function sortClassesToSched(classes: any[]) {
        //console.log("    Sorting classesToSched...");

        // Now, sort based on this new property in descending order
        // Comparison function for sorting
        function compare(a: any, b: any) {
            if (a['maxStudents'] < b['maxStudents']) {
                return 1;
            } else if (a['maxStudents'] > b['maxStudents']) {
                return -1;
            }
            return 0;
        }

        //console.log("    classesToSched sorted successfully!");

        return classes.sort(compare);
    }

    /**
     * Helper function
     * Sorts the array of given rooms by their seat capacity in decr. order
     * @param rooms
     */
    function sortRooms(rooms: any[]) {
        //console.log("    Sorting rooms...");

        // Comparison function for sorting
        function compare(a: any, b: any) {
            if (a['rooms_seats'] < b['rooms_seats']) {
                return 1;
            } else if (a['rooms_seats'] > b['rooms_seats']) {
                return -1;
            }
            return 0;
        }

        //console.log("    rooms sorted successfully!");
        //console.log(rooms.sort(compare));

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
    function isRoomAvailableMWF(hour: number): boolean {
        //console.log("Checking MWF" + " @ " + hour);
        if (availRoomsMWF[hour].length == 0) {
            return false;
        } else {
            //console.log("There's a free slot!");
            return true;
        }
    }

    function isRoomAvailableTT(hour: number): boolean {
        //console.log("Checking TT" + " @ " + hour);
        if (availRoomsTT[hour].length == 0) {
            return false;
        } else {
            //console.log("There's a free slot!");
            return true;
        }
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
}