import React, { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
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

const FIELD_MAP = {
  "Account Name": "name",
  "Name": "name",
  "Type": "type",
  "Parent Company": "parent_company_name",
  "Website": "website",
  "Phone": "phone",
  "Address Line 1": "address_line1",
  "City": "city",
  "County": "county",
  "Postcode": "address_postcode",
  "Country": "address_country",
  "Key Destinations": "key_destinations_raw",
  "Notes": "notes",
};

const VALID_TYPES = ["Tour Operator", "Travel Agent", "Parent Company"];

export default function ImportTradeAccounts() {
  const fileRef = useRef(null);
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState(null);
  const [results, setResults] = useState(null);
  const [importing, setImporting] = useState(false);

  const { data: existingAccounts = [] } = useQuery({
    queryKey: ["trade-accounts"],
    queryFn: () => base44.entities.TradeAccount.list(),
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

    // Build a case-insensitive map of existing accounts: name -> record
    const existingMap = {};
    existingAccounts.forEach(a => { if (a.name) existingMap[a.name.trim().toLowerCase()] = a; });

    const results = { created: 0, updated: 0, skipped: 0, unlinked: 0, errors: [] };
    const toCreate = [];
    const toUpdate = []; // { id, data }

    for (const row of preview.rows) {
      const mapped = {};
      for (const [csvCol, entityField] of Object.entries(FIELD_MAP)) {
        if (row[csvCol] !== undefined) mapped[entityField] = row[csvCol];
      }

      const name = mapped.name?.trim();
      if (!name) { results.errors.push(`Row skipped: missing Account Name`); results.skipped++; continue; }

      const type = VALID_TYPES.includes(mapped.type) ? mapped.type : null;
      if (!type) { results.errors.push(`Row "${name}" skipped: invalid Type "${mapped.type}"`); results.skipped++; continue; }

      const record = {
        name,
        type,
        website: mapped.website || "",
        phone: mapped.phone || "",
        address_line1: mapped.address_line1 || "",
        city: mapped.city || "",
        county: mapped.county || "",
        address_postcode: mapped.address_postcode || "",
        address_country: mapped.address_country || "",
        notes: mapped.notes || "",
      };

      if (mapped.key_destinations_raw) {
        record.key_destinations = mapped.key_destinations_raw.split(/[;|,]/).map(d => d.trim()).filter(Boolean);
      }
      if (mapped.parent_company_name) {
        record.parent_company_name = mapped.parent_company_name;
      }

      const existing = existingMap[name.toLowerCase()];
      if (existing) {
        toUpdate.push({ id: existing.id, data: record });
      } else {
        toCreate.push(record);
        // add to map so duplicate rows within the same CSV don't both create
        existingMap[name.toLowerCase()] = { name };
      }
    }

    if (toCreate.length > 0) {
      await base44.entities.TradeAccount.bulkCreate(toCreate);
      results.created = toCreate.length;
    }
    for (const { id, data } of toUpdate) {
      await base44.entities.TradeAccount.update(id, data);
    }
    results.updated = toUpdate.length;

    // Second pass: link parent companies
    const refreshed = await base44.entities.TradeAccount.list();
    const nameToId = {};
    refreshed.forEach(a => { nameToId[a.name?.trim().toLowerCase()] = a.id; });

    const parentUpdates = refreshed.filter(acc => acc.parent_company_name && !acc.parent_company_id);
    for (const acc of parentUpdates) {
      const parentId = nameToId[acc.parent_company_name.trim().toLowerCase()];
      if (parentId) {
        await base44.entities.TradeAccount.update(acc.id, { parent_company_id: parentId });
      }
    }

    queryClient.invalidateQueries({ queryKey: ["trade-accounts"] });
    setImporting(false);
    setResults(results);
    setPreview(null);
  };

  const downloadTemplate = () => {
    const csv = "Account Name,Type,Parent Company,Website,Phone,Address Line 1,City,County,Postcode,Country,Key Destinations,Notes\nKuoni UK,Tour Operator,,https://kuoni.co.uk,020 7751 7711,\"Kuoni House, Deepdene Avenue\",Dorking,Surrey,RH5 4AZ,United Kingdom,\"Maldives;Mauritius\",Key account";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "trade_accounts_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link to="/trade-accounts" className="text-[#6C6C80] hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Import Trade Accounts</h1>
          <p className="text-[#A1A1B5] text-sm mt-1">Upload a CSV to bulk-import trade accounts</p>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-surface rounded-2xl border border-white/[0.06] p-5 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-white font-medium mb-2">CSV Format</h2>
            <p className="text-[#A1A1B5] text-sm mb-3">Your CSV must include an <span className="text-white font-medium">Account Name</span> column. Supported columns:</p>
            <div className="flex flex-wrap gap-2">
              {["Account Name", "Type", "Parent Company", "Website", "Phone", "Address Line 1", "City", "County", "Postcode", "Country", "Key Destinations", "Notes"].map(f => (
                <span key={f} className="px-2.5 py-1 rounded-lg text-xs bg-white/[0.04] text-[#A1A1B5] border border-white/[0.06] font-mono">{f}</span>
              ))}
            </div>
            <p className="text-[#6C6C80] text-xs mt-3">Type must be one of: <span className="text-white">Tour Operator, Travel Agent, Parent Company</span>. If an Account Name already exists, the record will be <span className="text-white">updated</span> rather than duplicated. Key Destinations can be semicolon-separated.</p>
          </div>
          <Button type="button" onClick={downloadTemplate} variant="outline" className="shrink-0 text-[#A1A1B5] border-white/[0.10] hover:text-white text-xs gap-2">
            <Download className="w-4 h-4" /> Template
          </Button>
        </div>
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
            {results.updated > 0 && (
              <div className="flex items-center gap-2 bg-[#7F5BFF]/10 border border-[#7F5BFF]/20 rounded-xl px-4 py-3">
                <CheckCircle2 className="w-4 h-4 text-[#7F5BFF]" />
                <span className="text-[#7F5BFF] font-medium">{results.updated} updated</span>
              </div>
            )}
            {results.skipped > 0 && (
              <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3">
                <span className="text-[#A1A1B5] font-medium">{results.skipped} skipped</span>
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
            <Link to="/trade-accounts">
              <Button type="button" className="bg-gradient-to-r from-[#7F5BFF] to-[#6F3BFF] text-white rounded-xl px-5 text-sm">View Trade Accounts</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}