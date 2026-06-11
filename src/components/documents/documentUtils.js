// Shared helpers for the Client Document Library.
import { Image, FileText, Presentation, FileSpreadsheet, File } from "lucide-react";
import { TONES } from "@/lib/statusColors";

export const DOCUMENT_CATEGORIES = [
  "Presentation",
  "Fact Sheet",
  "Menu",
  "Rates",
  "Imagery",
  "Contract",
  "Other",
];

// Category → tone key from the central colour system.
const CATEGORY_TONE = {
  Presentation: "primary",
  "Fact Sheet": "info",
  Menu: "growing",
  Rates: "warning",
  Imagery: "success",
  Contract: "danger",
  Other: "neutral",
};

export function categoryPillClasses(category) {
  const tone = TONES[CATEGORY_TONE[category]] || TONES.neutral;
  return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${tone.pill}`;
}

// Pick an icon + accent colour from the mime type / filename.
export function fileVisual(doc) {
  const mime = (doc.mime_type || "").toLowerCase();
  const name = (doc.original_filename || "").toLowerCase();

  if (mime.startsWith("image/")) return { Icon: Image, colour: "#00C875" };
  if (mime === "application/pdf" || name.endsWith(".pdf")) return { Icon: FileText, colour: "#E2445C" };
  if (mime.includes("presentation") || /\.(ppt|pptx|key)$/.test(name)) return { Icon: Presentation, colour: "#FDAB3D" };
  if (mime.includes("spreadsheet") || mime.includes("excel") || /\.(xls|xlsx|csv)$/.test(name)) return { Icon: FileSpreadsheet, colour: "#9CD326" };
  if (mime.includes("word") || mime.startsWith("text/") || /\.(doc|docx|txt)$/.test(name)) return { Icon: FileText, colour: "#579BFC" };
  return { Icon: File, colour: "#C4C7D4" };
}

export function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
