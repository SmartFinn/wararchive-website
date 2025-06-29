const deepStateLayerUrl = '/data/deepstate.geojson';

const createDeepStateLayer = async () => {
  const response = await fetch(deepStateLayerUrl);
  if (!response.ok) {
    throw new Error(`HTTP error! status ${response.status}`);
  }
  const geoJsonData = await response.json();

  return L.geoJSON(geoJsonData, {
    style: feature => ({
      color: feature.properties.stroke || '#888',
      weight: 0.5,
      opacity: 0,
      fillColor: feature.properties.fill || '#888',
      fillOpacity: feature.properties['fill-opacity'] ?? 0.3,
    }),
  });
};

export default createDeepStateLayer;
