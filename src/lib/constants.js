// ─── Client directory ────────────────────────────────────────────────────────
// The client list is no longer hardcoded — it is loaded from CRM Client
// records (those carrying a `code`) via useExpenseClients (src/hooks/
// useExpenseClients.js), which hydrates this module-level directory so that
// synchronous helpers (getClientName, getClientByCode) resolve names too.
// Entries are shaped { client_id, client_code, client_name, is_internal }.

// "We Define Travel Margin" is a virtual allocation bucket used by the
// duplicate-to-WD1 flow. It is not a CRM Client record, so it lives here.
export const WD1_MARGIN_OPTION = {
  client_id: null,
  client_code: "WD1",
  client_name: "We Define Travel Margin",
  is_internal: true,
};

let CLIENT_DIRECTORY = [WD1_MARGIN_OPTION];

export function setClientDirectory(clients) {
  CLIENT_DIRECTORY = clients;
}

export function getClientDirectory() {
  return CLIENT_DIRECTORY;
}

export function getClientByCode(code) {
  return CLIENT_DIRECTORY.find((c) => c.client_code === code) || null;
}

// Returns the allocation identity fields for a client code — used when
// constructing client_allocations so records carry client_id + client_name.
export function getClientAllocationFields(code) {
  const client = getClientByCode(code);
  return {
    client_id: client?.client_id || null,
    client_code: code,
    client_name: client?.client_name || code,
  };
}

export const PAID_BY_CODES = [
  { code: "WCA", label: "Celine (Company Amex)", reimbursement: false },
  { code: "WSA", label: "Sophie (Company Amex)", reimbursement: false },
  { code: "WDA", label: "Dee (Company Amex)", reimbursement: false },
  { code: "CB", label: "Celine (Personal)", reimbursement: true },
  { code: "ST", label: "Sophie (Personal)", reimbursement: true },
  { code: "DJ", label: "Dee (Personal)", reimbursement: true },
  { code: "WD", label: "We Define Travel Direct", reimbursement: false },
  { code: "WD1", label: "WeDefine Travel Margin", reimbursement: false },
];

export const VEHICLE_TYPES = [
  { type: "Car", rate: 0.45, rateFrom20260601: 0.55, rateOver10k: 0.25, label: "Car" },
  { type: "Motorcycle", rate: 0.24, rateFrom20260601: 0.24, rateOver10k: 0.24, label: "Motorcycle" },
  { type: "Bicycle", rate: 0.20, rateFrom20260601: 0.20, rateOver10k: 0.20, label: "Bicycle" },
];

// Returns the correct mileage rate for a vehicle type on a given date
export function getMileageRate(vehicleType, dateStr) {
  const v = VEHICLE_TYPES.find(v => v.type === vehicleType);
  if (!v) return 0.45;
  const date = dateStr ? new Date(dateStr) : new Date();
  const cutoff = new Date("2026-06-01");
  const rate = date >= cutoff ? v.rateFrom20260601 : v.rate;
  return rate;
}

// Returns a display label for the vehicle type showing the applicable rate
export function getVehicleLabel(vehicleType, dateStr) {
  const rate = getMileageRate(vehicleType, dateStr);
  return `${vehicleType} — ${Math.round(rate * 100)}p/mile`;
}

// UK tax year runs 6 April – 5 April
export function getTaxYearStart(dateStr) {
  const d = new Date(dateStr);
  const y = d >= new Date(`${d.getFullYear()}-04-06`) ? d.getFullYear() : d.getFullYear() - 1;
  return `${y}-04-06`;
}

export const MILEAGE_RATE_THRESHOLD = 10000;

/**
 * HMRC-style rate threshold: after 10,000 business miles in a tax year the
 * per-mile rate drops to the vehicle's over-10k rate (25p for cars). A journey
 * that straddles the threshold is costed at the standard rate up to 10,000
 * cumulative miles and the reduced rate beyond.
 * Returns { cost, effectiveRate, milesAtReducedRate }.
 */
export function computeMileageCost(vehicleType, dateStr, priorMilesThisTaxYear, journeyMiles) {
  const v = VEHICLE_TYPES.find(x => x.type === vehicleType) || VEHICLE_TYPES[0];
  const standardRate = getMileageRate(vehicleType, dateStr);
  const reducedRate = v.rateOver10k ?? standardRate;
  const prior = Math.max(0, priorMilesThisTaxYear || 0);
  const miles = Math.max(0, journeyMiles || 0);
  const milesAtStandard = Math.max(0, Math.min(miles, MILEAGE_RATE_THRESHOLD - prior));
  const milesAtReducedRate = Math.round((miles - milesAtStandard) * 10) / 10;
  const cost = Math.round((milesAtStandard * standardRate + milesAtReducedRate * reducedRate) * 100) / 100;
  const effectiveRate = miles > 0 ? Math.round((cost / miles) * 10000) / 10000 : standardRate;
  return { cost, effectiveRate, milesAtReducedRate };
}

export const REIMBURSEMENT_CODES = ["CB", "ST", "DJ"];

export const STAFF_MEMBERS = [
  { id: "DJ", name: "Dee" },
  { id: "CB", name: "Celine" },
  { id: "ST", name: "Sophie" },
];

export const COMPANY_INFO = {
  name: "We Define Travel Ltd",
  address: "Brightfield Business Hub, Bakewell Road, Orton Southgate, Peterborough, PE2 6XU",
  regNumber: "11519289",
  vatNumber: "298 8706 05",
  email: "info@wedefine.travel",
  website: "www.wedefine.travel",
  director: "Dee",
  directorEmail: "dee@wedefine.travel",
};

export function getClientName(code) {
  return getClientByCode(code)?.client_name || code;
}

export function getPaidByLabel(code) {
  return PAID_BY_CODES.find(c => c.code === code)?.label || code;
}

export function isReimbursementRequired(paidByCode) {
  return REIMBURSEMENT_CODES.includes(paidByCode);
}

export const WDT_CATEGORIES = [
  "WDT - Travel",
  "WDT - Client Entertainment & Networking",
  "WDT - Marketing & Advertising",
  "WDT - Partner / Campaign Costs",
  "WDT - Office & General Costs",
  "WDT - Technology & Software",
  "WDT - Phone & Communication",
  "WDT - Professional Fees",
  "WDT - Staff Costs",
  "WDT - Finance Costs",
  "WDT - Insurance",
  "WDT - Rent / Office",
  "WDT - Miscellaneous",
];

export const CLIENT_CATEGORIES = [
  "Client Expenses - Accommodation",
  "Client Expenses - Meals",
  "Client Expenses - Entertainment",
  "Client Expenses - Transport",
  "Client Expenses - Miscellaneous",
];

export const ALL_CATEGORIES = [...WDT_CATEGORIES, ...CLIENT_CATEGORIES];

export function getCategoriesForClient(clientCode) {
  if (clientCode === "WD" || clientCode === "WD1") return WDT_CATEGORIES;
  return CLIENT_CATEGORIES;
}

export function formatMonth(dateStr) {
  const d = new Date(dateStr);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const yy = String(d.getFullYear()).slice(2);
  return `${months[d.getMonth()]} ${yy}`;
}

export function formatMonthCode(dateStr) {
  const d = new Date(dateStr);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  return `${mm}${yy}`;
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount || 0);
}

export function formatForeignCurrency(amount, currencyCode) {
  if (!amount || !currencyCode || currencyCode === "GBP") return null;
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: currencyCode }).format(amount);
  } catch {
    return `${currencyCode} ${Number(amount).toFixed(2)}`;
  }
}

export function formatDateUK(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}