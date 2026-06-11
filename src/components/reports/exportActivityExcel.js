import ExcelJS from "exceljs";

// WDT house style activity-log export (Client version)

const HEADERS = [
  "#",
  "Date",
  "TYPE OF CALL",
  "COMPANY or AGENCY Name",
  "CONTACT PERSON",
  "Overview & Follow up required",
  "FOLLOW UPDATE",
];
const WIDTHS = [4, 12, 14, 18, 18, 80, 40];
const HEADER_FILL = "FF1F4E79";

const thinBorder = {
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
};

// Parse "YYYY-MM-DD" as a UTC date so exceljs doesn't shift it a day
function parseDateUTC(str) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(str || "");
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

export async function exportActivityExcel(report, clientVersion) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "We Define Travel";
  const ws = workbook.addWorksheet("Activity Report");
  ws.columns = WIDTHS.map(w => ({ width: w }));

  let rowIdx = 1;

  // Optional cover note in a merged row above the header
  const coverNote = clientVersion?.cover_note?.trim();
  if (coverNote) {
    ws.mergeCells(rowIdx, 1, rowIdx, HEADERS.length);
    const cell = ws.getCell(rowIdx, 1);
    cell.value = coverNote;
    cell.alignment = { wrapText: true, vertical: "top" };
    cell.font = { italic: true, size: 10 };
    ws.getRow(rowIdx).height = Math.max(30, Math.ceil(coverNote.length / 160) * 15);
    rowIdx += 1;
  }

  // Header row
  const headerRow = ws.getRow(rowIdx);
  HEADERS.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: "middle", horizontal: i < 5 ? "center" : "left", wrapText: true };
    cell.border = thinBorder;
  });
  headerRow.height = 28;
  rowIdx += 1;

  // Data rows
  (report.activity_lines || []).forEach((line, i) => {
    const row = ws.getRow(rowIdx);
    const date = parseDateUTC(line.date);
    const values = [
      i + 1,
      date || line.date || "",
      line.type || "",
      line.company_name || "",
      line.contact_person || "",
      line.overview || "",
      line.follow_update || "",
    ];
    values.forEach((v, col) => {
      const cell = row.getCell(col + 1);
      cell.value = v;
      cell.border = thinBorder;
      cell.font = { size: 10 };
      if (col === 1) cell.numFmt = "dd-mmm-yy";
      const wrap = col >= 5;
      cell.alignment = {
        vertical: "top",
        horizontal: col <= 2 ? "center" : "left",
        wrapText: wrap,
      };
    });
    rowIdx += 1;
  });

  const label = report.is_grouped ? "CROSSROADS" : (report.client_name || "Client");
  const filename = `WDT Activity Report - ${label} - ${report.month}.xlsx`;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
