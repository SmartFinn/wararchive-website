const geocoder = L.Control.geocoder({
    defaultMarkGeocode: true,
    placeholder: 'Пошук населеного пункту...',
    errorMessage: 'Нічого не знайдено',
    geocoder: L.Control.Geocoder.nominatim({
        geocodingQueryParams: {
            countrycodes: 'ru,ua',
            featureType: 'city',
        }
    })
});

export default geocoder;
