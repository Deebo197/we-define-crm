// Stored websites often lack a protocol ("www.kuoni.co.uk"), which the browser
// treats as a path inside the app. Always link through externalHref.
export const externalHref = (url) => {
  const u = (url || "").trim();
  if (!u) return "";
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
};

// Full address as shown to the user — no protocol noise, no trailing slash.
export const displayUrl = (url) =>
  (url || "").trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
