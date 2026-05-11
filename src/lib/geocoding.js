const GOOGLE_API_KEY = "AIzaSyAN-qJFLomJZNCpaFjacQk5K2j_wlu8b5U";

/**
 * Ensures the Google Maps JS API is loaded, then resolves.
 */
function loadGoogleMaps() {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.Geocoder) { resolve(); return; }
    const existing = document.getElementById("gmap-script");
    if (existing) {
      existing.addEventListener("load", resolve);
      existing.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.id = "gmap-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}`;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * Geocode an address object → { lat, lng } or null
 */
export async function geocodeAddress(addressParts) {
  const address = [
    addressParts.address_line1,
    addressParts.city,
    addressParts.county,
    addressParts.address_postcode,
    addressParts.address_country || "UK",
  ].filter(Boolean).join(", ");

  if (!address || address.trim() === "UK") return null;

  try {
    await loadGoogleMaps();
    const geocoder = new window.google.maps.Geocoder();
    return await new Promise((resolve) => {
      geocoder.geocode({ address }, (results, status) => {
        if (status === "OK" && results?.[0]) {
          const loc = results[0].geometry.location;
          resolve({ lat: loc.lat(), lng: loc.lng() });
        } else {
          console.warn("Geocode failed for address:", address, "status:", status);
          resolve(null);
        }
      });
    });
  } catch (e) {
    console.warn("Geocoding error:", e);
    return null;
  }
}

/**
 * Geocode a free-text location → { lat, lng, formatted_address } or null
 */
export async function geocodeLocation(query) {
  if (!query?.trim()) return null;

  const biasedQuery =
    query.includes("UK") || query.includes("England") || query.includes("Scotland") || query.includes("Wales")
      ? query
      : `${query}, UK`;

  try {
    await loadGoogleMaps();
    const geocoder = new window.google.maps.Geocoder();
    return await new Promise((resolve) => {
      geocoder.geocode({ address: biasedQuery }, (results, status) => {
        if (status === "OK" && results?.[0]) {
          const loc = results[0].geometry.location;
          resolve({
            lat: loc.lat(),
            lng: loc.lng(),
            formatted_address: results[0].formatted_address,
          });
        } else {
          console.warn("Location geocode failed:", biasedQuery, "status:", status);
          resolve(null);
        }
      });
    });
  } catch (e) {
    console.warn("Location geocoding error:", e);
    return null;
  }
}

/**
 * Haversine distance between two lat/lng points in miles
 */
export function distanceMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}
