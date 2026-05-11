const GOOGLE_API_KEY = "AIzaSyAN-qJFLomJZNCpaFjacQk5K2j_wlu8b5U";

/**
 * Geocode an address string → { lat, lng } or null
 */
export async function geocodeAddress(addressParts) {
  // Build address string from parts
  const address = [
    addressParts.address_line1,
    addressParts.city,
    addressParts.county,
    addressParts.address_postcode,
    addressParts.address_country || "UK",
  ]
    .filter(Boolean)
    .join(", ");

  if (!address || address.trim() === "UK") return null;

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status === "OK" && data.results?.[0]) {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng };
    }
    return null;
  } catch (e) {
    console.warn("Geocoding failed:", e);
    return null;
  }
}

/**
 * Geocode a free-text location search query → { lat, lng, formatted_address } or null
 */
export async function geocodeLocation(query) {
  if (!query?.trim()) return null;

  // Bias results to UK
  const biasedQuery = query.includes("UK") || query.includes("England") || query.includes("Scotland") || query.includes("Wales")
    ? query
    : `${query}, UK`;

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(biasedQuery)}&key=${GOOGLE_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status === "OK" && data.results?.[0]) {
      const { lat, lng } = data.results[0].geometry.location;
      const formatted_address = data.results[0].formatted_address;
      return { lat, lng, formatted_address };
    }
    return null;
  } catch (e) {
    console.warn("Location geocoding failed:", e);
    return null;
  }
}

/**
 * Haversine distance between two lat/lng points in miles
 */
export function distanceMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}
