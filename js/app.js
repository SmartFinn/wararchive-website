const esriTileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '&copy; Powered by <a href="https://www.esri.com/">Esri</a>',
    detectRetina: true,
    minZoom: 3,
    maxZoom: 18
});

const onlyLabelsOverlay = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://carto.com/about-carto/">CARTO</a>',
    detectRetina: true
});

const cartoDbLight = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    minZoom: 3,
    maxZoom: 20,
    ext: 'png'
});

const cartoDbDark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    minZoom: 3,
    maxZoom: 20,
    ext: 'png'
});

const markerIcon = L.icon({
    iconUrl: '/assets/marker.png',
    iconRetinaUrl: '/assets/marker@2x.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
    shadowUrl: '/assets/marker-shadow.png',
    shadowRetinaUrl: '/assets/marker-shadow@2x.png',
    shadowSize: [32, 32],
});

const createClusterIcon = (clusterCount, fontSize = "12px") => {
    return `
        <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42">
            <path style="stroke:#000;stroke-width:2;stroke-linejoin:round;opacity:.2" d="M22 4A14 14 0 0 0 8 18a14 14 0 0 0 3.984 9.732L22 39l10.016-11.268A14 14 0 0 0 36 18 14 14 0 0 0 22 4Z"/>
            <path style="fill:#ef5350;stroke-width:2;stroke:#ef5350;stroke-linejoin:round" d="M21 3A14 14 0 0 0 7 17a14 14 0 0 0 3.984 9.732L21 38l10.016-11.268A14 14 0 0 0 35 17 14 14 0 0 0 21 3z"/>
            <circle style="fill:#fafafa" cx="21" cy="17" r="11"/>
            <text xml:space="preserve" style="font-size:${fontSize};text-align:center;text-anchor:middle" x="20.63" y="20.85"><tspan x="20.63" y="20.85">${clusterCount}</tspan></text>
        </svg>
    `;
};

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
    iconCreateFunction: cluster => {
        const childCount = cluster.getChildCount();
        const fontSize = childCount > 999 ? '9px' : childCount > 99 ? '10px' : '12px';

        return new L.DivIcon({
            html: createClusterIcon(childCount, fontSize),
            className: 'cluster-marker-icon',
            iconSize: new L.Point(42, 42),
            iconAnchor: [21, 42],
        });
    },
});

const documentWrap = document.getElementById('wrap');
const map = L.map('map', { layers: [esriTileLayer, onlyLabelsOverlay] }).setView([48.44, 35.11], 6);
const geojsonUrl = '/data/wararchive_ua.geojson';

fetch(geojsonUrl)
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, {
            pointToLayer: (feature, latlng) => L.marker(latlng, { icon: markerIcon }),
            onEachFeature: (feature, layer) => {
                if (!feature.properties) {
                    throw new Error('GeoJSON feature has no properties');
                }
                const { date, unit, description, post_url } = feature.properties;
                const popupContent = `
                    <strong>Дата:</strong> ${date}<br/>
                    <strong>Підрозділ:</strong> ${unit}<br/><br/>
                    ${description}<br/><br/>
                    <a href="${post_url}" target="_blank" class="goto-post-button"><span>Переглянути пост</span></a>
                `;

                layer.bindPopup(popupContent);
                allMarkers.addLayer(layer);
            }
        });

        // uncomment to test the error screen
        // throw new Error('Test error');

        map.addLayer(allMarkers);
        documentWrap.classList.add('loaded');
    })
    .catch(error => {
        documentWrap.classList.add('load-failed');
    });

const baseLayers = {
    "Супутникові знімки": esriTileLayer,
    "Мапа (світла)": cartoDbLight,
    "Мапа (темна)": cartoDbDark,
};

const overlays = {
    "Топоніми": onlyLabelsOverlay,
};

L.control.layers(baseLayers, overlays).addTo(map);

map.on("dragend", updateHashLocation);
map.on("zoomend", updateHashLocation);

function parseUrlHash() {
    const hashParams = location.hash.slice(1).split('&');
    return hashParams.length === 0 ? {} : hashParams.reduce((acc, param) => {
        const [key, value] = param.split('=');
        acc[key] = value;
        return acc;
    }, {});
}

function updateHashLocation() {
    const { lat, lng } = map.getCenter();
    const zoom = map.getZoom();
    window.location.hash = `map=${zoom}/${lat.toPrecision(8)}/${lng.toPrecision(8)}`;
}

function setViewFromHashLocation() {
    const urlParam = parseUrlHash();
    if (urlParam.map) {
        const [zoom, lat, lng] = urlParam.map.split('/');
        map.setView([lat, lng], zoom);
    }
}

document.addEventListener("DOMContentLoaded", setViewFromHashLocation);
window.addEventListener('hashchange', setViewFromHashLocation);

document.querySelectorAll('a[data-toggle]').forEach(link => {
    link.addEventListener('click', (event) => {
        event.preventDefault();

        const targetId = link.getAttribute('data-toggle');
        const targetElement = document.getElementById(targetId);

        if (targetElement) {
            targetElement.classList.add('open');
        }
    });
});

document.querySelectorAll('.modal__overlay').forEach(overlay => {
    overlay.addEventListener('click', () => {
        const parentElement = overlay.parentElement;
        if (parentElement.classList.contains('open')) {
            parentElement.classList.remove('open');
        }
    });
});

document.querySelectorAll('.modal__close').forEach(overlay => {
    overlay.addEventListener('click', () => {
        const parentElement = overlay.parentElement.parentElement;
        if (parentElement.classList.contains('open')) {
            parentElement.classList.remove('open');
        }
    });
});
