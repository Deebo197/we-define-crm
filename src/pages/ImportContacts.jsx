import React, { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { listActiveTradeAccounts } from "@/api/tradeAccounts";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle2, AlertCircle, ArrowLeft, FileText, Download } from "lucide-react";
import { Link } from "react-router-dom";

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map(line => {
    const values = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; }
      else if (ch === "," && !inQ) { values.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    values.push(cur.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = (values[i] ?? "").replace(/^"|"$/g, ""); });
    return row;
  });
  return { headers, rows };
}

function parseBool(val) {
  if (!val) return false;
  return ["yes", "true", "1", "y"].includes(val.toLowerCase().trim());
}

const FIELD_MAP = {
  "First Name": "first_name",
  "Last Name": "last_name",
  "Full Name": "name",
  "Name": "name",
  "Job Title": "role",
  "Function": "function",
  "Seniority": "seniority",
  "Company Name": "company_name",
  "Email": "email",
  "Phone": "phone",
  "Mobile": "mobile",
  "Home Address Line 1": "home_address_line1",
  "Home Address Line 2": "home_address_line2",
  "City": "home_city",
  "County": "home_county",
  "Postcode": "home_postcode",
  "Country": "home_country",
  "Maldives": "cov_maldives",
  "Mauritius": "cov_mauritius",
  "UAE": "cov_uae",
  "Far East": "cov_far_east",
  "Notes": "notes",
};

const COVERAGE_COLUMNS = [
  { field: "cov_maldives", destination: "Maldives" },
  { field: "cov_mauritius", destination: "Mauritius" },
  { field: "cov_uae", destination: "UAE" },
  { field: "cov_far_east", destination: "Far East" },
];

const FUNCTIONS = ["Commercial", "Product", "Marketing", "Press", "Admin"];
const SENIORITIES = ["Head/Director", "Manager", "Executive", "Other"];

function matchEnum(options, val) {
  return options.find(o => o.toLowerCase() === (val ?? "").trim().toLowerCase()) ?? "";
}

export default function ImportContacts() {
  const fileRef = useRef(null);
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState(null);
  const [results, setResults] = useState(null);
  const [importing, setImporting] = useState(false);

  const { data: tradeAccounts = [] } = useQuery({
    queryKey: ["trade-accounts"],
    queryFn: () => listActiveTradeAccounts(),
  });

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { headers, rows } = parseCsv(ev.target.result);
      setPreview({ headers, rows, fileName: file.name });
      setResults(null);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!preview) return;
    setImporting(true);
    const results = { created: 0, skipped: 0, updated: 0, unlinked: 0, errors: [] };

    const accountMap = {};
    tradeAccounts.forEach(a => { if (a.name) accountMap[a.name.trim().toLowerCase()] = a.id; });

    const toCreate = [];

    for (const row of preview.rows) {
      const mapped = {};
      for (const [csvCol, field] of Object.entries(FIELD_MAP)) {
        if (row[csvCol] !== undefined) mapped[field] = row[csvCol];
      }

      if (!mapped.name && (mapped.first_name || mapped.last_name)) {
        mapped.name = `${mapped.first_name ?? ""} ${mapped.last_name ?? ""}`.trim();
      }

      if (!mapped.name?.trim()) {
        results.errors.push(`Row skipped: missing Name`);
        results.skipped++;
        continue;
      }

      const companyName = mapped.company_name?.trim();
      let company_id = "";
      if (companyName) {
        company_id = accountMap[companyName.toLowerCase()] ?? "";
        if (!company_id) {
          results.unlinked++;
          results.errors.push(`Contact "${mapped.name}" — Company "${companyName}" not found in Trade Accounts`);
        }
      }

      const coverage = COVERAGE_COLUMNS
        .filter(({ field }) => parseBool(mapped[field]))
        .map(({ destination }) => ({ destination, clients: [] }));
      const fn = matchEnum(FUNCTIONS, mapped.function);
      const seniority = matchEnum(SENIORITIES, mapped.seniority);

      toCreate.push({
        name: mapped.name.trim(),
        first_name: mapped.first_name ?? "",
        last_name: mapped.last_name ?? "",
        role: mapped.role ?? "",
        ...(fn ? { function: fn } : {}),
        ...(seniority ? { seniority } : {}),
        email: mapped.email ?? "",
        phone: mapped.phone ?? "",
        mobile: mapped.mobile ?? "",
        home_address_line1: mapped.home_address_line1 ?? "",
        home_address_line2: mapped.home_address_line2 ?? "",
        home_city: mapped.home_city ?? "",
        home_county: mapped.home_county ?? "",
        home_postcode: mapped.home_postcode ?? "",
        home_country: mapped.home_country ?? "",
        coverage,
        notes: mapped.notes ?? "",
        company_id,
        company_name: companyName ?? "",
        company_type: "TradeAccount", // always set; company_id may be empty if not matched
      });
    }

    if (toCreate.length > 0) {
      await base44.entities.Contact.bulkCreate(toCreate);
      results.created = toCreate.length;
    }

    queryClient.invalidateQueries({ queryKey: ["contacts"] });
    setImporting(false);
    setResults(results);
    setPreview(null);
  };

  const downloadTemplate = () => {
    const csv = "First Name,Last Name,Full Name,Job Title,Function,Seniority,Company Name,Email,Phone,Mobile,Home Address Line 1,Home Address Line 2,City,County,Postcode,Country,Maldives,Mauritius,UAE,Far East,Notes\nJane,Smith,Jane Smith,Sales Manager,Commercial,Manager,Kuoni UK,jane@kuoni.co.uk,020 7751 7711,07700 900123,12 High Street,,London,Surrey,SW1A 1AA,United Kingdom,Yes,Yes,No,No,Key contact";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "contacts_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link to="/contacts" className="text-[#6C6C80] hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Import Contacts</h1>
          <p className="text-[#A1A1B5] text-sm mt-1">Upload a CSV to bulk-import contacts and link them to trade accounts</p>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-surface rounded-2xl border border-white/[0.06] p-5 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-white font-medium mb-2">CSV Format</h2>
            <p className="text-[#A1A1B5] text-sm mb-3">Contacts are linked to Trade Accounts via <span className="text-white font-medium">Company Name</span> (must match exactly). Supported columns:</p>
            <div className="flex flex-wrap gap-2">
              {["First Name", "Last Name", "Full Name", "Job Title", "Function", "Seniority", "Company Name", "Email", "Phone", "Mobile", "Home Address Line 1", "Home Address Line 2", "City", "County", "Postcode", "Country", "Maldives", "Mauritius", "UAE", "Far East", "Notes"].map(f => (
                <span key={f} className="px-2.5 py-1 rounded-lg text-xs bg-white/[0.04] text-[#A1A1B5] border border-white/[0.06] font-mono">{f}</span>
              ))}
            </div>
            <p className="text-[#6C6C80] text-xs mt-3">Destination columns accept: <span className="text-white">Yes / No / True / False / 1 / 0</span> and set the contact's coverage. Function accepts: <span className="text-white">Commercial / Product / Marketing / Press / Admin</span>. Seniority accepts: <span className="text-white">Head/Director / Manager / Executive / Other</span>. Import Trade Accounts first to enable company linking.</p>
          </div>
          <Button type="button" onClick={downloadTemplate} variant="outline" className="shrink-0 text-[#A1A1B5] border-white/[0.10] hover:text-white text-xs gap-2">
            <Download className="w-4 h-4" /> Template
          </Button>
        </div>
        {tradeAccounts.length === 0 && (
          <div className="mt-4 flex items-center gap-2 bg-[#FFB547]/10 border border-[#FFB547]/20 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-[#FFB547] shrink-0" />
            <p className="text-[#FFB547] text-xs">No Trade Accounts found. <Link to="/import-trade-accounts" className="underline hover:text-white">Import Trade Accounts first</Link> to enable company linking.</p>
          </div>
        )}
        {tradeAccounts.length > 0 && (
          <p className="text-[#6C6C80] text-xs mt-3">{tradeAccounts.length} trade accounts available for linking.</p>
        )}
      </div>

      {/* Upload */}
      {!preview && !results && (
        <div
          className="border-2 border-dashed border-white/[0.10] rounded-2xl p-12 text-center hover:border-[#7F5BFF]/40 transition-colors cursor-pointer group"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="w-8 h-8 text-[#6C6C80] group-hover:text-[#7F5BFF] mx-auto mb-3 transition-colors" />
          <p className="text-white font-medium mb-1">Click to upload CSV</p>
          <p className="text-[#6C6C80] text-sm">or drag and drop</p>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="bg-surface rounded-2xl border border-white/[0.06] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#7F5BFF]" />
              <span className="text-white font-medium">{preview.fileName}</span>
              <span className="text-[#6C6C80] text-sm">— {preview.rows.length} rows</span>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setPreview(null)} className="text-[#6C6C80] hover:text-white text-sm">Clear</Button>
              <Button type="button" onClick={handleImport} disabled={importing} className="bg-gradient-to-r from-[#7F5BFF] to-[#6F3BFF] text-white rounded-xl px-5 text-sm">
                {importing ? "Importing..." : `Import ${preview.rows.length} Rows`}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {preview.headers.map(h => (
                    <th key={h} className="text-left text-[#6C6C80] font-medium pb-2 pr-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 10).map((row, i) => (
                  <tr key={i} className="border-b border-white/[0.04]">
                    {preview.headers.map(h => (
                      <td key={h} className="text-[#A1A1B5] py-2 pr-4 whitespace-nowrap max-w-[180px] truncate">{row[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.rows.length > 10 && (
              <p className="text-[#6C6C80] text-xs mt-2">+ {preview.rows.length - 10} more rows (all will be imported)</p>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="bg-surface rounded-2xl border border-white/[0.06] p-6 space-y-4">
          <h2 className="text-white font-medium">Import Complete</h2>
          <div className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-2 bg-[#3DDC97]/10 border border-[#3DDC97]/20 rounded-xl px-4 py-3">
              <CheckCircle2 className="w-4 h-4 text-[#3DDC97]" />
              <span className="text-[#3DDC97] font-medium">{results.created} created</span>
            </div>
            {results.skipped > 0 && (
              <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3">
                <span className="text-[#A1A1B5] font-medium">{results.skipped} skipped</span>
              </div>
            )}
            {results.unlinked > 0 && (
              <div className="flex items-center gap-2 bg-[#FFB547]/10 border border-[#FFB547]/20 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-[#FFB547]" />
                <span className="text-[#FFB547] font-medium">{results.unlinked} missing company link</span>
              </div>
            )}
          </div>
          {results.errors.length > 0 && (
            <div className="space-y-1 bg-[#FF5C7A]/5 border border-[#FF5C7A]/20 rounded-xl p-4">
              <p className="text-[#FF5C7A] text-xs font-medium flex items-center gap-1 mb-2"><AlertCircle className="w-3 h-3" /> Warnings / Errors</p>
              {results.errors.map((e, i) => <p key={i} className="text-[#6C6C80] text-xs">{e}</p>)}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button type="button" onClick={() => { setResults(null); if (fileRef.current) fileRef.current.value = ""; }} variant="ghost" className="text-[#6C6C80] hover:text-white text-sm">Import More</Button>
            <Link to="/contacts">
              <Button type="button" className="bg-gradient-to-r from-[#7F5BFF] to-[#6F3BFF] text-white rounded-xl px-5 text-sm">View Contacts</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}