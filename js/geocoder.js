const geocoder = L.Control.geocoder({
    defaultMarkGeocode: true,
    placeholder: 'Пошук...',
    geocoder: L.Control.Geocoder.nominatim({
      geocodingQueryParams: {
          countrycodes: 'ru,ua',
          featureType: 'city', 
      }
  })
})

export default geocoder