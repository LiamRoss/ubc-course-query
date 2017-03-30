/**
 * Created by Alice on 3/20/17.
 */

import Log from "./src/Util";

class schedule {

    // Global schedule object
    // Will be returned when program terminates
    // Format is [Building][Room][Day][Hour]
    private schedule: any = {};

    // Array of the rooms that were unable to be scheduled within 8am-5pm
    private roomsFailedToSchedule: any[] = [];

    // Global variables for keeping track of number of rooms and classes given
    private numRooms: any = 0;
    private numClasses: any = 0;

    // Total number of classes we can fit into a schedule before the quality reduces
    private threshold: number = 0;

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
    private createSchedule(classes: any[], rooms: any[]): any {
        Log.trace("Creating schedule...");

        // Get the number of rooms available at any given point on any day
        this.numRooms = this.getNumRooms(rooms);
        // Get the number of classes to schedule in total for any given week
        this.numClasses = this.getNumClasses(classes);

        // Initialize the threshold, will be used later on
        this.threshold = this.numRooms * 15;

        // Sort the rooms by their seat capacity, in decr. order
        let sortedRooms = this.sortRooms(rooms.slice()); // .slice() copies the 'rooms' array

        // Sort the classes by number of students, from highest to lowest
        let sortedClasses = this.sortClassesToSched(classes.slice());

        // Object of rooms that are available
        // Format is DayOfWeek -> Hour -> Array of available rooms at that hour/day
        let availRooms: any = {};

        // Initialize the available rooms object
        // Initially, all rooms will be available on any given day at any given hour:
        for(let i = 0; i < 5; i ++) {
            switch(i) {
                case 0:
                    for(let j = 0; j < 24; j++) {
                        availRooms['Monday'][j] = sortedRooms;
                    }
                    break;
                case 1:
                    for(let j = 0; j < 24; j++) {
                        availRooms['Tuesday'][j] = sortedRooms;
                    }
                    break;
                case 2:
                    for(let j = 0; j < 24; j++) {
                        availRooms['Wednesday'][j] = sortedRooms;
                    }
                    break;
                case 3:
                    for(let j = 0; j < 24; j++) {
                        availRooms['Thursday'][j] = sortedRooms;
                    }
                    break;
                case 4:
                    for(let j = 0; j < 24; j++) {
                        availRooms['Friday'][j] = sortedRooms;
                    }
                    break;
            }
        }
        Log.trace("availRooms initialized! Beginning recursive helper...");

        // Now we can start recursive scheduling
        return this.createScheduleHelper(sortedClasses, availRooms);
    }

    /**
     * Recursive helper for creating the schedule
     * Schedules the class with the highest number of students first
     * @param classes
     * @param availRooms
     */
    private createScheduleHelper(classes: any[], availRooms: any[]): any {
        let highestEnrollmentClass = classes[0];

        // First try scheduling between 8-5 on MWF
        // Note that if there is a spot (eg) at 2pm on W, we know that spot is open on M/F as well
        // So this means we can just check Monday and not W/F
        for(let hour = 8; hour < 18; hour++) { // 24H time
            if(this.isRoomAvailable(availRooms, "Monday", hour)) {


                // Now we can schedule on Tues/Thurs when it is full
            } else if(this.isRoomAvailable(availRooms, "Tuesday", hour)) {

            }
        }
    }

    /**
     * Helper function
     * Sorts the array of this.classesToSched by the number of students in decr. order
     * Also adds a property to each class section 'numStudents' which contains the number
     * of students in the section
     */
    private sortClassesToSched(classes: any[]) {
        Log.trace("Sorting classesToSched...");

        // First, add a property to each class' object that contains the number of students in the section
        for(let section of classes) {
            section['numStudents'] = this.getNumStudents(section);
        }

        // Now, sort based on this new property in descending order
        // Comparison function for sorting
        function compare(a: any, b: any) {
            if(a['numStudents'] < b['numStudents']) {
                return 1;
            } else if(a['numStudents'] > b['numStudents']) {
                return -1;
            }
            return 0;
        }

        Log.trace("classesToSched sorted successfully!");

        return classes.sort(compare);
    }

    /**
     * Helper function
     * Sorts the array of given rooms by their seat capacity in decr. order
     * @param rooms
     */
    private sortRooms(rooms: any[]) {
        Log.trace("Sorting rooms...");

        // Comparison function for sorting
        function compare(a: any, b: any) {
            if(a['seats'] < b['seats']) {
                return 1;
            } else if(a['seats'] > b['seats']) {
                return -1;
            }
            return 0;
        }

        Log.trace("rooms sorted successfully!");

        return rooms.sort(compare);
    }

    /**
     * Helper function
     * Returns the number of sections to schedule for a given array of class sections
     * @param classSections
     * @returns {number}
     */
    private getNumSectionsToSchedule(classSections: any[]) {
        let total = 0;

        for(let i = 0; i < classSections.length; i++) {
            if(classSections[i]['year'] == 2014) {
                total += 1;
            }
        }

        let retValue = Math.ceil(total / 3);
        Log.trace("    * Found " + total + " 2014 sections");
        Log.trace("    * Number of sections to schedule = " + retValue);
        return retValue;
    }

    /**
     * Helper function
     * Returns true if there are any rooms available on the given day at the given hour
     * @param availRooms
     * @param day
     * @param hour
     * @returns {boolean}
     */
    private isRoomAvailable(availRooms: any[], day: any, hour: number): boolean {
        if(availRooms[day][hour].length == 0) {
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
    private getAvailRoomsForDayAtHour(availRooms: any[], day: any, hour: number): any[] {
        return availRooms[day][hour];
    }

    /**
     * Helper function
     * Returns the total number of students in the given class section
     * @param classSection
     * @returns {any}
     */
    private getNumStudents(classSection: any): number {
        return classSection['pass'] + classSection['fail'];
    }

    /**
     * Helper function
     * @param rooms - rooms array to compute length of
     * @returns {number} - computed length
     */
    private getNumRooms(rooms: any[]): number {
        return rooms.length;
    }

    /**
     * Helper function
     * @param classes - classes array to compute length of
     * @returns {number} - computed length
     */
    private getNumClasses(classes: any[]): number {
        return classes.length;
    }
}