console.log(`${Date()} - Script started`);

const esriTileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '&copy; Powered by <a href="https://www.esri.com/">Esri</a>',
    detectRetina: true
});

const onlyLabelsOverlay = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://carto.com/about-carto/">CARTO</a>',
    detectRetina: true
});

const stadiaOSMBright = L.tileLayer('https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.{ext}', {
    minZoom: 0,
    maxZoom: 20,
    attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    ext: 'png'
});

const stadiaOSMDark = L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.{ext}', {
    minZoom: 0,
    maxZoom: 20,
    attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    ext: 'png'
});

const markerIcon = L.icon({
    iconUrl: '/img/marker.png', // Replace with the path to your custom icon
    iconRetinaUrl: '/img/marker@2x.png',
    iconSize: [32, 32], // Size of the icon [width, height]
    iconAnchor: [16, 32], // Point of the icon which will correspond to marker's location
    popupAnchor: [0, -32], // Point from which the popup should open relative to the iconAnchor
    shadowUrl: '/img/marker-shadow.png',
    shadowRetinaUrl: '/img/marker-shadow@2x.png',
    shadowSize: [32, 32],
});

function groupMakerSvgIcon(count, fontSize = "12px") {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="42">
        <path style="stroke:#000;stroke-width:2;stroke-linejoin:round;opacity:.2" d="M22 4A14 14 0 0 0 8 18a14 14 0 0 0 3.984 9.732L22 39l10.016-11.268A14 14 0 0 0 36 18 14 14 0 0 0 22 4Z"/>
        <path style="fill:#ef5350;stroke-width:2;stroke:#ef5350;stroke-linejoin:round" d="M21 3A14 14 0 0 0 7 17a14 14 0 0 0 3.984 9.732L21 38l10.016-11.268A14 14 0 0 0 35 17 14 14 0 0 0 21 3z"/>
        <circle style="fill:#fafafa" cx="21" cy="17" r="11"/>
        <text xml:space="preserve" style="font-size:${fontSize};text-align:center;text-anchor:middle" x="20.63" y="20.85">
        <tspan x="20.63" y="20.85">${count}</tspan></text></svg>`
}

// load geojson to js variable
    // URL of the GeoJSON file
const geojsonUrl = '/data/wararchive_2024-08-17.geojson';
let geojsonData;

const allMarkers = L.markerClusterGroup({
    maxClusterRadius: 20,
    spiderLegPolylineOptions: {
        weight: 4,
        color: '#c62828',
        opacity: 0.5
    },
    polygonOptions: {
        color: '#c62828',
    },
    iconCreateFunction: function (cluster) {
        const childCount = cluster.getChildCount();
        let labelFontSize = '12px';

        if (childCount > 999) {
            labelFontSize = '9px';
        } else if (childCount > 99) {
            labelFontSize = '10px';
        }

        return new L.DivIcon({
            html: groupMakerSvgIcon(childCount, labelFontSize),
            className: 'marker-group-icon',
            iconSize: new L.Point(42, 42),
            iconAnchor: [21, 42],
        });
    },
});

// Fetch the GeoJSON data
fetch(geojsonUrl)
    .then(response => response.json())
    .then(data => {
        // Add the GeoJSON layer to the map
        // geojsonData = data;
        console.log(`${Date()} - GeoJSON loaded`);
        L.geoJSON(data, {
            pointToLayer: function (feature, latlng) {
                return L.marker(latlng, { icon: markerIcon });
            },
            onEachFeature: function (feature, layer) {
                if (feature.properties && feature.properties.post_url) {
                    layer.bindPopup(`
                        <strong>Дата:</strong> ${feature.properties.date}<br/>
                        <strong>Підрозділ:</strong> ${feature.properties.unit}<br/></br>
                        ${feature.properties.description}<br/><br/>
                        <a href="${feature.properties.post_url}" target="_blank">${feature.properties.post_url}</a>
                        `
                    );
                    allMarkers.addLayer(layer);
                }
            }
        });
    })
    .then(() => {
        console.log(`${Date()} - GeoJSON parsed`);
    })
    .catch(error => console.log('Error loading GeoJSON: ', error));

const satelliteLayer = [ esriTileLayer, onlyLabelsOverlay ];

const map = L.map('map', { layers: [esriTileLayer, onlyLabelsOverlay,] }).setView([48.44, 35.11], 6);

map.addLayer(allMarkers);

const baseLayers = {
    "Супутникові знімки": esriTileLayer,
    "Мапа (світла)": stadiaOSMBright,
    "Мапа (темна)": stadiaOSMDark,
};

const overlays = {
    "Назви міст": onlyLabelsOverlay,
    // "Markers": geojsonData,
};

L.control.layers(baseLayers, overlays).addTo(map);

// on drag end
map.on("dragend", updateHashLocation);

// on zoom end
map.on("zoomend", updateHashLocation);

function parseUrlHash() {
    const urlHash = location.hash.substring(1);

    if (!urlHash) {
        return {};
    }

    return urlHash
        .split('&')
        .reduce((res, item) => {
            let [key, value] = item.split('=');
            res[key] = value;
            return res;
        }, {})
}

function updateHashLocation() {
    const { lat, lng } = map.getCenter();
    const zoom = map.getZoom();

    // #map=18/47.75555/37.23803
    window.location.hash = `map=${zoom}/${lat.toPrecision(8)}/${lng.toPrecision(8)}`;
}

function setViewFromHashLocation() {
    const urlParam = parseUrlHash();

    if (urlParam.map) {
        const [zoom, lat, lng] = urlParam.map.split('/');

        map.setView([lat, lng], zoom);
    }
}

document.addEventListener("DOMContentLoaded", function () {
    setViewFromHashLocation();
});

window.addEventListener('hashchange', function () {
    setViewFromHashLocation();
});