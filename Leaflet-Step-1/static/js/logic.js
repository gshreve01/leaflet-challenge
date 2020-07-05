// Tile layer for the country names
var countrymap = L.tileLayer("https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}", {
    attribution: "© <a href='https://www.mapbox.com/about/maps/'>Mapbox</a> © <a href='http://www.openstreetmap.org/copyright'>OpenStreetMap</a> <strong><a href='https://www.mapbox.com/map-feedback/' target='_blank'>Improve this map</a></strong>",
    tileSize: 512,
    maxZoom: 18,
    zoomOffset: -1,
    id: "mapbox/streets-v11",
    accessToken: API_KEY
});

// Initialize the LayerGroups we'll be using
var layers = {
    MAGINITUDE: new L.LayerGroup()
};

// Create a world map object
var myMap = L.map("map", {
    center: [15.5994, -28.6731],
    zoom: 3,
    layers: [
        layers.MAGINITUDE
    ]
});

countrymap.addTo(myMap);

// Create an overlays object to add to the layer control
var overlays = {
    "Earthquakes By Mangitude": layers.MAGINITUDE,
};

// Create a control for our layers, add our overlay layers to it
L.control.layers(null, overlays).addTo(myMap);

// Create a legend to display information about our map
var info = L.control({
    position: "bottomright"
});

// When the layer control is added, insert a div with the class of "legend"
info.onAdd = function () {
    console.log("adding div to legend");
    var div = L.DomUtil.create("div", "legend");
    return div;
};
// Add the info legend to the map
info.addTo(myMap);

// function to calculate opacity based on magnitude
// making it global since it is difficult to pass in all circumstances
var magnitudeRange = [];
function calculateMagnitudeRanges(earthquakeData) {
    var magnitudes = earthquakeData.features.map((feature) => feature.properties.mag);
    console.log("magnitudes", magnitudes);

    magnitudeRange = { "min": d3.min(magnitudes), "max": d3.max(magnitudes) };
    console.log("magnitudeRange", magnitudeRange);
}

var opacityBuckets = [];

function initializeOpacityBuckets() {
    var numberOfBuckets = 3;
    var dif = magnitudeRange.max - magnitudeRange.min;
    var stepSize = dif / numberOfBuckets;

    var iteration = 0;
    for (var i = magnitudeRange.min; i <= magnitudeRange.max; i += stepSize) {
        opacityBuckets.push({"magMax": i, "opacity": (20*iteration+10) / 100});
        iteration++;
    }
    console.log("opacityBuckets", opacityBuckets);
}

function getOpacity(feature) {
    var calculatedOpacity = 0.1;
    for(i=0;i < opacityBuckets.length; i++) {
        if (feature.properties.mag <= opacityBuckets[i].magMax) {
            calculatedOpacity = opacityBuckets[i].opacity;
            break;
        }
    }
    console.log("magnitude, opacity", feature.properties.mag, calculatedOpacity);
    return +calculatedOpacity;
}


// Perform an API call to get all earthquake data for the last 7 days
d3.json("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson", function (earthquakeData) {
    console.log("earthquakeData", earthquakeData);

    // calculate the magnitudes
    calculateMagnitudeRanges(earthquakeData);
    initializeOpacityBuckets();

    // Define a function we want to run once for each feature in the features array
    // Give each feature a popup describing the place and time of the earthquake
    function onEachFeature(feature, layer) {
        // console.log(feature);
        // Add circles to map
        L.circle(feature.geometry.coordinates, {
            fillOpacity: getOpacity(feature),
            color: "none",
            fillColor: "blue",
            // Adjust radius.  Consider minimum 
            radius: (feature.properties.mag + magnitudeRange.min + .1) ^ 15 * 5000
        })
            .bindPopup("<h3>" + feature.properties.place +
                "</h3><hr><p>" + new Date(feature.properties.time) + "</p>")
            .addTo(layers.MAGINITUDE);
    }

    // Create a GeoJSON layer containing the features array on the earthquakeData object
    // Run the onEachFeature function once for each piece of data in the array 
    L.geoJSON(earthquakeData, {
        onEachFeature: onEachFeature
    });
});

