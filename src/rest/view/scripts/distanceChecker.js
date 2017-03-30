/**
 * Created by Alice on 3/30/17.
 */

if (Number.prototype.toRadians === undefined) {
    Number.prototype.toRadians = function() { return this * Math.PI / 180; };
}

function isWithinDistance(point1, point2, dist) {

    // { lat: 1920312, lon: 123123214 }

    var lat1 = point1['lat'];
    var lon1 = point1['lon'];
    var lat2 = point2['lat'];
    var lon2 = point2['lon'];
    // Source: http://www.movable-type.co.uk/scripts/latlong.html
    var R = 6371e3; // metres
    var φ1 = lat1.toRadians();
    var φ2 = lat2.toRadians();
    var Δφ = (lat2-lat1).toRadians();
    var Δλ = (lon2-lon1).toRadians();

    var a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ/2) * Math.sin(Δλ/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    var d = R * c;
    return (d < dist);
}
