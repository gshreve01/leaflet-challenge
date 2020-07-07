// Correct Leaflet L.Circle for use with flat map. Comment the following function to see the original impact on radius when the circle is dragged along the vertical axis.
L.Circle.include({
    _getLngRadius: function () {
        return this._getLatRadius();
    }
});

// Tile layer for the country names
var countrymap = L.tileLayer("https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}", {
    attribution: "© <a href='https://www.mapbox.com/about/maps/'>Mapbox</a> © <a href='http://www.openstreetmap.org/copyright'>OpenStreetMap</a> <strong><a href='https://www.mapbox.com/map-feedback/' target='_blank'>Improve this map</a></strong>",
    tileSize: 512,
    zoom: 3,
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

// layersControl = new L.Control.Layers(baseLayers, overlays, {
//     collapsed: false
// });

// Create a control for our layers, add our overlay layers to it
L.control.layers(null, overlays
    , { position: 'bottomright', collapsed: false }
)
    .addTo(myMap);


// Create a legend to display information about our map
var info = L.control({
    position: "bottomright"
});

// When the layer control is added, insert a div with the class of "legend"
info.onAdd = function () {
    this.collapsed = false;
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


// setup color buckets to place based on magnitude size
var colorBuckets = [];

var colors = [
    "yellow",
    "purple",
    "orange",
    "green",
    "red",
    "blue"
];
function initializeColorBuckets() {
    var numberOfBuckets = colors.length;
    var dif = magnitudeRange.max - magnitudeRange.min;
    var stepSize = dif / numberOfBuckets;

    var minValue = magnitudeRange.min;
    var nextValue = minValue + stepSize;
    for (var i = 0; i < numberOfBuckets; i++) {
        if (i != 0) {
            minValue = nextValue + .01
            nextValue = nextValue + stepSize;
        }
        colorBuckets.push({ "min": minValue.toFixed(2), "max": nextValue.toFixed(2), "color": colors[i], "radius": i * 12000 + 18000 });
    }
    console.log("colorBuckets", colorBuckets);
}

// get the color bucket based on the magnitude
function getColorBucket(feature) {
    for (i = 0; i < colorBuckets.length; i++) {
        if (feature.properties.mag <= colorBuckets[i].max) {
            break;
        }
    }
    // console.log("magnitude, color", feature.properties.mag, color);
    return colorBuckets[i];
}

// Get the radius.  Allow for some correction based on latitude to try to keep 
// circle sized in correct perspective
function getRadius(feature, colorBucket) {
    var radius = colorBucket.radius;

    var adjusting = false;

    if (adjusting) {


        // Adjustment by latitude
        var lat = Math.abs(feature.geometry.coordinates[0]);
        var multiplier = 1800;
        if (lat > 60) {
            multiplier = 2000;
        }
        if (lat > 70) {
            multiplier = 2100;
        }
        if (lat > 80) {
            multiplier = 2250;
        }
        radius -= lat * multiplier;
        if (radius < 15000) {
            radius = 15000;
        }
    }

    return radius;
}

var numFeaturesProcessed = 0;
function updateLegend(updatedAt) {
    var legendTable = "<table>";
    colorBuckets.forEach(function (color) {
        legendTable += `<tr><td>Magnitude: ${color.min} - ${color.max}</td><td><div class="color ${color.color}"></div></td></tr>`;
    });
    legendTable += "</table>";
    document.querySelector(".legend").innerHTML = [
        `Last Updated: ${updatedAt.toDateString()}`,
        legendTable
    ].join("");
}

// Perform an API call to get all earthquake data for the last 7 days
d3.json("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson", function (earthquakeData) {
    console.log("earthquakeData", earthquakeData);

    // calculate the magnitudes
    calculateMagnitudeRanges(earthquakeData);
    initializeColorBuckets();

    // Define a function we want to run once for each feature in the features array
    // Give each feature a popup describing the place and time of the earthquake
    function onEachFeature(feature, layer) {
        numFeaturesProcessed++;
        // console.log(feature);
        // Add circles to map
        var colorBucket = getColorBucket(feature);
        if (!colorBucket)
            console.log("Failed feature", feature);
        // console.log("colorBucket", colorBucket);
        var radius = getRadius(feature, colorBucket);

        L.circle([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], {
            fillOpacity: .75,
            color: "none",
            fillColor: colorBucket.color,
            // Adjust radius.  Consider minimum 
            radius: radius
        })
            .bindPopup("<h3>" + feature.properties.place +
                "</h3><hr><p><strong>Occurred:</strong> " + new Date(feature.properties.time).toDateString() + "</p>"
                + "<strong>Magnitude:</strong> " + feature.properties.mag
                //     + "<p>Radius: " + radius + "</p>"
                //     + "<p>Latitude: " + feature.geometry.coordinates[0] + "</p>"
            )
            .addTo(layers.MAGINITUDE);
    }

    // Create a GeoJSON layer containing the features array on the earthquakeData object
    // Run the onEachFeature function once for each piece of data in the array 
    L.geoJSON(earthquakeData, {
        onEachFeature: onEachFeature
    });

    // Call the updateLegend function, which will... update the legend!
    var updatedAt = new Date(earthquakeData.metadata.generated);
    console.log("updatedAt", updatedAt);
    updateLegend(updatedAt);

    console.log("numFeaturesProcessed", numFeaturesProcessed);
});

