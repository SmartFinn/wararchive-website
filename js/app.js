import geocoder from "./geocoder.js";
import ukraineBorders from "./ukraine_borders.js";
import coordsPopupContent from "./coordsPopup.js";

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

const svgMarkerIcon = L.divIcon({
    html: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
        <path style="opacity:.2;stroke:#000;stroke-width:2;stroke-linejoin:round" d="M17 4A10 10 0 0 0 7 14a10 10 0 0 0 2.475 6.58L17 31l7.525-10.42A10 10 0 0 0 27 14 10 10 0 0 0 17 4Z"/>
        <path style="fill:#f44336;stroke:#f44336;stroke-width:2;stroke-linejoin:round" d="M16 3A10 10 0 0 0 6 13a10 10 0 0 0 2.4746 6.58L16 30l7.525-10.42A10 10 0 0 0 26 13 10 10 0 0 0 16 3Z"/>
        <circle style="fill:#fafafa" cx="16" cy="13" r="8"/>
        <path style="fill:#4f4f4f" d="M12 10s-1 .114-1 1v4s0 1 1 1h5s1 0 1-1v-4s0-1-1-1h-5zm6 3 3 3v-6l-3 3z"/>
    </svg>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
    className: 'marker-svg-icon',
});

const svgPointerIcon = L.divIcon({
    html: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
        <path style="opacity:.2" d="M2 17a14 14 0 0 0 14 14 14 14 0 0 0 14-14h-2a12 12 0 0 1-12 12A12 12 0 0 1 4 17Z"/>
        <path style="fill:#3698f4" d="M16 2A14 14 0 0 0 2 16a14 14 0 0 0 14 14 14 14 0 0 0 14-14A14 14 0 0 0 16 2zm0 2a12 12 0 0 1 12 12 12 12 0 0 1-12 12A12 12 0 0 1 4 16 12 12 0 0 1 16 4z"/>
        <circle style="opacity:.2;fill:#3698f4" cx="16" cy="16" r="13"/>
    </svg>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
    className: 'pointer-svg-icon',
});

const createClusterIcon = (clusterCount, fontSize = "12px") => {
    return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 42 42">
            <path style="stroke:#000;stroke-width:2;stroke-linejoin:round;opacity:.2" d="M22 4A14 14 0 0 0 8 18a14 14 0 0 0 3.984 9.732L22 39l10.016-11.268A14 14 0 0 0 36 18 14 14 0 0 0 22 4Z"/>
            <path style="fill:#ef5350;stroke-width:2;stroke:#ef5350;stroke-linejoin:round" d="M21 3A14 14 0 0 0 7 17a14 14 0 0 0 3.984 9.732L21 38l10.016-11.268A14 14 0 0 0 35 17 14 14 0 0 0 21 3z"/>
            <circle style="fill:#fafafa" cx="21" cy="17" r="11"/>
            <text xml:space="preserve" style="font-size:${fontSize};text-align:center;text-anchor:middle" x="20.63" y="20.85"><tspan x="20.63" y="20.85">${clusterCount}</tspan></text>
        </svg>
    `;
};

const allMarkers = L.markerClusterGroup({
    maxClusterRadius: 25,
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

let geoJsonData = [];

// Initialize the date slider
const initDateSlider = (options = {}) => {
    const { min, max, start, end } = options;

    const slider = document.getElementById('date-slider');

    noUiSlider.create(slider, {
        start: [start.getTime(), end.getTime()],
        connect: true,
        range: {
            'min': min.getTime(),
            'max': max.getTime()
        },
        tooltips: {
            to: timestamp => new Date(timestamp).toLocaleDateString(),
            from: timestamp => new Date(timestamp).toLocaleDateString(),
        },
        format: {
            to: value => parseInt(value),
            from: value => parseInt(value)
        }
    });

    const startDateSpan = document.getElementById('start-date');
    const endDateSpan = document.getElementById('end-date');

    // Set initial date display
    startDateSpan.textContent = min.toLocaleDateString();
    endDateSpan.textContent = max.toLocaleDateString();

    slider.noUiSlider.on('change', (values) => {
        const start = new Date(+values[0]);
        const end = new Date(+values[1]);
        processGeoJSONData(geoJsonData, { startDate: start, endDate: end });
    });
};

const fetchGeoJSONData = async () => {
    try {
        const response = await fetch(geojsonUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        geoJsonData = data;

        // Extract dates to determine first and last post date.
        // GeoJSON is sorted by post_date in descending order
        const firstPostDate = new Date(data.features[data.features.length - 1].properties.post_date);
        const lastPostDate = new Date(data.features[0].properties.post_date);
        const startDate = new Date(lastPostDate.getTime() - 7889400000); // 3 months ago
        const endDate = lastPostDate;

        processGeoJSONData(data, { startDate: startDate, endDate: endDate });
        initDateSlider({ min: firstPostDate, max: lastPostDate, start: startDate, end: endDate });
        map.addLayer(allMarkers);
        documentWrap.classList.add('loaded');
    } catch (error) {
        console.error('Error fetching GeoJSON data:', error);
        documentWrap.classList.add('load-failed');
    }
};

const processGeoJSONData = (data, options = {}) => {
    const { startDate, endDate } = options;

    // Show filtering spinner
    document.getElementById('filter-container').classList.add('filtering-in-progress');

    setTimeout(() => {
        if (startDate && endDate) {
            allMarkers.clearLayers();
        }

        L.geoJSON(data, {
            filter: feature => {
                if (startDate && endDate) {
                    if (!feature.properties || !feature.properties.post_date) return false;
                    const postDate = new Date(feature.properties.post_date);
                    return postDate >= startDate && postDate <= endDate;
                }
                return true;
            },
            pointToLayer: (feature, latlng) => L.marker(latlng, { icon: svgMarkerIcon }),
            onEachFeature: (feature, layer) => {
                if (!feature.properties) {
                    console.error('GeoJSON feature has no properties');
                    return;
                }
                const { post_id } = feature.properties;

                const popupContent = `
                    <iframe
                    id="telegram-post-telegram-${post_id}"
                    src="https://t.me/WarArchive_ua/${post_id}?embed=1&amp;userpic=false"
                    width="100%" height=""
                    frameborder="0" scrolling="yes"
                    style="color-scheme: light dark; border: medium; min-height: 350px; min-width: 320px; width: 100%;">
                    </iframe>

                    <a href="tg://resolve?domain=WarArchive_ua&post=${post_id}" class="goto-post-button"><span>Відкрити</span></a>
                `;

                layer.bindPopup(popupContent, {
                    maxWidth: 360,
                });
                allMarkers.addLayer(layer);
            }
        });

        map.addLayer(allMarkers);

        // Hide filtering spinner
        document.getElementById('filter-container').classList.remove('filtering-in-progress');
    }, 50);
};

fetchGeoJSONData();

const baseLayers = {
    "Супутникові знімки": esriTileLayer,
    "Мапа (світла)": cartoDbLight,
    "Мапа (темна)": cartoDbDark,
};

const overlays = {
    "Топоніми": onlyLabelsOverlay,
};

const parseUrlHash = () => {
    const hashParams = location.hash.slice(1).split('&');
    return hashParams.length === 0 ? {} : hashParams.reduce((acc, param) => {
        const [key, value] = param.split('=');
        acc[key] = value;
        return acc;
    }, {});
};

const updateHashLocation = () => {
    const { lat, lng } = map.getCenter();
    const zoom = map.getZoom();
    window.location.hash = `map=${zoom}/${lat.toFixed(8)}/${lng.toFixed(8)}`;
};

const setViewFromHashLocation = () => {
    const urlParam = parseUrlHash();
    if (urlParam.map) {
        const [zoom, lat, lng] = urlParam.map.split('/');
        map.setView([parseFloat(lat), parseFloat(lng)], parseInt(zoom, 10));
    }
    if (urlParam.goto) {
        const [lat, lng] = urlParam.goto.split(',').map(Number);
        if (!isNaN(lat) && !isNaN(lng)) {
            const gotoMarker = L.marker([lat, lng], { icon: svgPointerIcon }).addTo(map);
            const popupContent = coordsPopupContent(`${lat},${lng}`);
            gotoMarker.bindPopup(popupContent);
            map.setView([lat, lng], 16); // Встановити стандартний рівень масштабування для goto
        }
    }
};

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

document.querySelectorAll('.modal__close').forEach(closeButton => {
    closeButton.addEventListener('click', () => {
        const parentElement = closeButton.closest('.modal');
        if (parentElement.classList.contains('open')) {
            parentElement.classList.remove('open');
        }
    });
});

L.control.layers(baseLayers, overlays).addTo(map);

map.on("dragend", updateHashLocation);
map.on("zoomend", updateHashLocation);

map.addControl(geocoder);
map.addControl(ukraineBorders);

// Add event listener for right-click
map.on('contextmenu', (e) => {
    const { lat, lng } = e.latlng;
    const coordinates = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    const popupContent = coordsPopupContent(coordinates);

    L.popup()
        .setLatLng(e.latlng)
        .setContent(popupContent)
        .openOn(map);
});
