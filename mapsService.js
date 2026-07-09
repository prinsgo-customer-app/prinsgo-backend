// Calls Google Distance Matrix API to get real driving distance + duration
const getDistanceAndDuration = async (originLat, originLng, destLat, destLng) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originLat},${originLng}&destinations=${destLat},${destLng}&key=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== 'OK') {
    throw new Error(`Google Maps API error: ${data.status}`);
  }

  const element = data.rows[0].elements[0];
  if (element.status !== 'OK') {
    throw new Error('Could not calculate route between the given points');
  }

  return {
    distanceKm: Math.round((element.distance.value / 1000) * 10) / 10,
    durationMin: Math.round(element.duration.value / 60),
  };
};

// Reverse geocode coordinates into a human-readable address
const reverseGeocode = async (lat, lng) => {
  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== 'OK' || !data.results.length) {
    throw new Error('Could not resolve address for given coordinates');
  }

  return data.results[0].formatted_address;
};

// Autocomplete place search
const searchPlaces = async (input, lat, lng) => {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
    input
  )}&key=${apiKey}&components=country:in`;

  if (lat && lng) {
    url += `&location=${lat},${lng}&radius=30000`;
  }

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places API error: ${data.status}`);
  }

  return data.predictions || [];
};

// Get exact lat/lng + formatted address from a Google Place ID (used after autocomplete selection)
const getPlaceDetails = async (placeId) => {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_address,geometry&key=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== 'OK') {
    throw new Error(`Google Place Details error: ${data.status}`);
  }

  return {
    address: data.result.formatted_address,
    lat: data.result.geometry.location.lat,
    lng: data.result.geometry.location.lng,
  };
};

module.exports = { getDistanceAndDuration, reverseGeocode, searchPlaces, getPlaceDetails };
