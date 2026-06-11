import { format } from 'date-fns';

/**
 * Generates and downloads the full analysis report as a PDF using jsPDF.
 */
export async function downloadReportPDF({ scenario, analysisData, aiReport, priceEntries = [], hotels = [], operators = [] }) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageW = 210;
  const margin = 16;
  const contentW = pageW - margin * 2;
  let y = 0;

  // Repevo light-theme palette (mirrors tailwind.config.js / src/lib/statusColors.js)
  const COLORS = {
    purple: [90, 61, 230],        // primary #5A3DE6
    text: [31, 36, 48],           // ink #1F2430
    muted: [103, 104, 121],       // muted #676879
    border: [228, 231, 238],      // line #E4E7EE
    cardBg: [246, 247, 251],      // canvas #F6F7FB
    emerald: [0, 200, 117],       // success #00C875
    amber: [253, 171, 61],        // warning #FDAB3D
    blue: [87, 155, 252],         // info #579BFC
    white: [255, 255, 255],
    lightPurple: [238, 234, 255], // primary-soft #EEEAFF
  };

  const checkPageBreak = (needed = 20) => {
    if (y + needed > 275) {
      doc.addPage();
      y = 16;
    }
  };

  const drawRect = (x, ry, w, h, color, radius = 3) => {
    doc.setFillColor(...color);
    doc.roundedRect(x, ry, w, h, radius, radius, 'F');
  };

  const writeText = (text, x, ty, opts = {}) => {
    const { size = 10, color = COLORS.text, bold = false, maxWidth, align = 'left' } = opts;
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    if (maxWidth) {
      const lines = doc.splitTextToSize(String(text || ''), maxWidth);
      doc.text(lines, x, ty, { align });
      return lines.length * (size * 0.4);
    }
    doc.text(String(text || ''), x, ty, { align });
    return size * 0.4;
  };

  // ── Cover Header ──────────────────────────────────────────────────────────
  drawRect(0, 0, pageW, 52, COLORS.purple, 0);
  y = 18;
  writeText('WE DEFINE TRAVEL', margin, y, { size: 8, color: COLORS.lightPurple, bold: false });
  y += 7;
  writeText('Competitor Analysis Report', margin, y, { size: 20, color: COLORS.white, bold: true });
  y += 8;
  writeText(scenario?.name || '', margin, y, { size: 11, color: [210, 200, 255] });
  y += 6;
  writeText(`Generated ${format(new Date(), 'dd MMMM yyyy')}`, margin, y, { size: 8, color: [180, 170, 240] });
  y = 62;

  // ── Scenario Info bar ─────────────────────────────────────────────────────
  drawRect(margin, y, contentW, 20, COLORS.cardBg);
  doc.setDrawColor(...COLORS.border);
  doc.roundedRect(margin, y, contentW, 20, 3, 3, 'S');
  const infoItems = [
    ['Destination', scenario?.destination || ''],
    ['Duration', `${scenario?.duration || ''} nights`],
    ['Board Basis', scenario?.board_basis || ''],
    ['Dates', (scenario?.travel_dates || []).map(d => format(new Date(d), 'dd MMM')).join(', ')],
  ];
  const colW = contentW / infoItems.length;
  infoItems.forEach(([label, val], i) => {
    const cx = margin + i * colW + 4;
    writeText(label, cx, y + 6, { size: 7, color: COLORS.muted });
    writeText(val, cx, y + 13, { size: 8, color: COLORS.text, bold: true, maxWidth: colW - 6 });
  });
  y += 28;

  // ── Section heading helper ────────────────────────────────────────────────
  const sectionHeading = (title) => {
    checkPageBreak(14);
    drawRect(margin, y, 3, 7, COLORS.purple);
    writeText(title, margin + 6, y + 5, { size: 12, bold: true, color: COLORS.text });
    y += 12;
  };

  // ── CLIENT POSITIONING ────────────────────────────────────────────────────
  sectionHeading('Client Positioning');

  Object.values(analysisData || {}).forEach((d) => {
    checkPageBreak(50);
    const cardH = 12 + d.competitorAnalysis.length * 10 + 14;
    drawRect(margin, y, contentW, cardH, COLORS.cardBg);
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(margin, y, contentW, cardH, 3, 3, 'S');

    // Hotel name + price
    writeText(d.hotelName, margin + 4, y + 8, { size: 11, bold: true });
    writeText(`£${d.avgPrice.toLocaleString()} avg pp`, pageW - margin - 4, y + 8, { size: 10, bold: true, align: 'right' });

    // Positioning badge
    const badgeColors = { Cheapest: COLORS.emerald, Competitive: COLORS.blue, Premium: COLORS.amber };
    const bCol = badgeColors[d.positioning] || COLORS.blue;
    drawRect(margin + 4, y + 10, 30, 6, bCol.map ? bCol : COLORS.blue, 2);
    writeText(`${d.positioning}  Rank ${d.rank}/${d.total}`, margin + 6, y + 14.5, { size: 7, color: COLORS.white });

    y += 18;

    // Competitor bars
    d.competitorAnalysis.forEach((comp) => {
      checkPageBreak(12);
      const isAbove = comp.gap > 0;
      const barColor = isAbove ? COLORS.amber : COLORS.emerald;
      const barMax = 60;
      const barW = Math.min(Math.abs(comp.gapPct) * 1.5, barMax);

      writeText(comp.hotel, margin + 4, y + 4, { size: 8, color: COLORS.muted, maxWidth: 70 });
      writeText(`£${comp.avgPrice.toLocaleString()}`, margin + 80, y + 4, { size: 8, color: COLORS.text, bold: true });

      // bar track
      drawRect(margin + 100, y, barMax, 5, COLORS.border, 1);
      if (barW > 0) drawRect(margin + 100, y, barW, 5, barColor, 1);

      const pctLabel = `${isAbove ? '+' : ''}${comp.gapPct}%`;
      writeText(pctLabel, margin + 100 + barMax + 3, y + 4, { size: 8, color: isAbove ? COLORS.amber : COLORS.emerald, bold: true });
      y += 10;
    });

    y += 6;
  });

  // ── DATE-BY-DATE BREAKDOWN ────────────────────────────────────────────────
  const travelDates = [...(scenario?.travel_dates || [])].sort();
  if (travelDates.length > 0) {
    y += 4;
    sectionHeading('Date-by-Date Rate Comparison');

    Object.values(analysisData || {}).forEach((d) => {
      checkPageBreak(18);
      // Sub-heading
      writeText(d.hotelName, margin, y, { size: 10, bold: true, color: COLORS.purple });
      y += 7;

      // Gather all hotels for this client
      const clientHotelObj = hotels.find(h => d.hotelName === h.name);
      const compHotelObjs = hotels.filter(h => d.competitorAnalysis.some(c => c.hotel === h.name));
      const allRows = clientHotelObj
        ? [{ hotel: clientHotelObj, isClient: true }, ...compHotelObjs.map(h => ({ hotel: h, isClient: false }))]
        : compHotelObjs.map(h => ({ hotel: h, isClient: false }));

      // Column layout: hotel name col + one col per date + avg col
      // If many dates, shrink name col to fit more date columns
      const nameCW = travelDates.length > 6 ? 38 : 50;
      const dateCW = Math.min((contentW - nameCW) / (travelDates.length + 1), travelDates.length > 6 ? 18 : 22);

      // Header row
      checkPageBreak(8);
      drawRect(margin, y, contentW, 7, COLORS.purple, 2);
      writeText('Hotel', margin + 2, y + 5, { size: 6.5, color: COLORS.white, bold: true });
      travelDates.forEach((dt, i) => {
        const cx = margin + nameCW + i * dateCW + 2;
        const label = new Date(dt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        writeText(label, cx, y + 5, { size: 6, color: COLORS.white, bold: true });
      });
      writeText('Avg', margin + nameCW + travelDates.length * dateCW + 2, y + 5, { size: 6.5, color: COLORS.white, bold: true });
      y += 7;

      // Client prices per date (for % calc) — computed once outside the row loop
      const clientDatePrices = travelDates.map(dt => {
        if (!clientHotelObj) return null;
        const entries = priceEntries.filter(e => e.hotel_id === clientHotelObj.id && e.travel_date === dt && e.price);
        return entries.length > 0 ? Math.round(entries.reduce((s, e) => s + e.price, 0) / entries.length) : null;
      });

      // Use taller rows for competitors so we can show % diff below price
      const rowH = 10;

      allRows.forEach(({ hotel, isClient }, ri) => {
        checkPageBreak(rowH + 2);
        const rowBg = isClient ? COLORS.lightPurple : (ri % 2 === 0 ? COLORS.cardBg : COLORS.white);
        drawRect(margin, y, contentW, rowH, rowBg, 0);

        // Hotel name
        const shortName = hotel.name.length > 24 ? hotel.name.slice(0, 22) + '…' : hotel.name;
        writeText(shortName, margin + 2, y + 4, { size: 7, bold: isClient, color: isClient ? COLORS.purple : COLORS.text });

        const rowPrices = travelDates.map(dt => {
          const entries = priceEntries.filter(e => e.hotel_id === hotel.id && e.travel_date === dt && e.price);
          return entries.length > 0 ? Math.round(entries.reduce((s, e) => s + e.price, 0) / entries.length) : null;
        });

        rowPrices.forEach((price, i) => {
          const cx = margin + nameCW + i * dateCW + 2;
          if (price) {
            writeText(`£${price.toLocaleString()}`, cx, y + 4, { size: 6.5, color: isClient ? COLORS.purple : COLORS.text, bold: isClient });
            // Show % diff vs client on competitor rows
            if (!isClient && clientDatePrices[i]) {
              const gap = clientDatePrices[i] - price;
              const pct = Math.round((gap / price) * 100);
              const pctCol = gap > 0 ? COLORS.amber : COLORS.emerald;
              const pctLabel = `${gap > 0 ? '+' : ''}${pct}%`;
              writeText(pctLabel, cx, y + 8.5, { size: 5.5, color: pctCol, bold: true });
            }
          } else {
            writeText('—', cx, y + 4, { size: 6.5, color: COLORS.muted });
          }
        });

        // Avg
        const valid = rowPrices.filter(Boolean);
        const avg = valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
        const avgX = margin + nameCW + travelDates.length * dateCW + 2;
        writeText(avg ? `£${avg.toLocaleString()}` : '—', avgX, y + 4, { size: 6.5, bold: isClient, color: isClient ? COLORS.purple : COLORS.muted });
        // Avg % diff for competitors
        if (!isClient && avg && clientDatePrices.filter(Boolean).length > 0) {
          const clientAvg = Math.round(clientDatePrices.filter(Boolean).reduce((a, b) => a + b, 0) / clientDatePrices.filter(Boolean).length);
          const gap = clientAvg - avg;
          const pct = Math.round((gap / avg) * 100);
          writeText(`${gap > 0 ? '+' : ''}${pct}%`, avgX, y + 8.5, { size: 5.5, color: gap > 0 ? COLORS.amber : COLORS.emerald, bold: true });
        }

        y += rowH;
      });

      y += 6;
    });
  }

  // ── OPERATOR COMPARISON ───────────────────────────────────────────────────
  const firstData = Object.values(analysisData || {})[0];
  if (firstData?.operatorBreakdown?.length > 0) {
    checkPageBreak(30);
    y += 4;
    sectionHeading('Operator Comparison');

    const ops = firstData.operatorBreakdown.map(o => o.operator);
    const colWs = [(contentW - 4) * 0.3, ...(ops.map(() => (contentW - 4) * 0.7 / ops.length))];

    // Header row
    drawRect(margin, y, contentW, 8, COLORS.purple, 2);
    writeText('Client Hotel', margin + 4, y + 5.5, { size: 7, color: COLORS.white, bold: true });
    ops.forEach((op, i) => {
      const cx = margin + colWs[0] + colWs.slice(1, i + 2).reduce((a, b) => a + b, 0) - colWs[i + 1] + 4;
      writeText(op, cx, y + 5.5, { size: 7, color: COLORS.white, bold: true });
    });
    y += 8;

    Object.values(analysisData || {}).forEach((d, ri) => {
      checkPageBreak(10);
      const rowBg = ri % 2 === 0 ? COLORS.cardBg : COLORS.white;
      drawRect(margin, y, contentW, 8, rowBg, 0);
      writeText(d.hotelName, margin + 4, y + 5.5, { size: 8, bold: true, maxWidth: colWs[0] - 6 });
      d.operatorBreakdown.forEach((ob, i) => {
        const cx = margin + colWs[0] + colWs.slice(1, i + 2).reduce((a, b) => a + b, 0) - colWs[i + 1] + 4;
        writeText(ob.avgPrice > 0 ? `£${ob.avgPrice.toLocaleString()}` : '—', cx, y + 5.5, { size: 8, color: COLORS.text });
      });
      y += 8;
    });
    y += 6;
  }

  // ── AI REPORT SECTIONS ────────────────────────────────────────────────────
  if (aiReport) {
    // Overview
    if (aiReport.overview) {
      y += 4;
      sectionHeading('Overview');
      checkPageBreak(20);
      const h = writeText(aiReport.overview, margin, y, { size: 9, color: COLORS.muted, maxWidth: contentW });
      y += h * 5 + 8;
    }

    // Client Analysis
    if (aiReport.client_analysis?.length > 0) {
      y += 4;
      sectionHeading('Client Hotel Analysis');
      aiReport.client_analysis.forEach((ca) => {
        checkPageBreak(24);
        writeText(ca.hotel, margin, y, { size: 10, bold: true, color: [...COLORS.purple] });
        y += 6;
        const h = writeText(ca.analysis, margin, y, { size: 9, color: COLORS.muted, maxWidth: contentW });
        y += h * 5 + 8;
      });
    }

    // Operator Insights
    if (aiReport.operator_insights) {
      y += 4;
      sectionHeading('Operator Insights');
      const h = writeText(aiReport.operator_insights, margin, y, { size: 9, color: COLORS.muted, maxWidth: contentW });
      y += h * 5 + 8;
    }

    // Opportunities
    if (aiReport.opportunities?.length > 0) {
      y += 4;
      sectionHeading('Opportunities');
      aiReport.opportunities.forEach((o) => {
        checkPageBreak(10);
        drawRect(margin, y - 1, 3, 4, COLORS.emerald, 1);
        const h = writeText(o, margin + 6, y + 2, { size: 9, color: COLORS.muted, maxWidth: contentW - 8 });
        y += h * 5 + 5;
      });
      y += 2;
    }

    // Risks
    if (aiReport.risks?.length > 0) {
      y += 4;
      sectionHeading('Risks');
      aiReport.risks.forEach((r) => {
        checkPageBreak(10);
        drawRect(margin, y - 1, 3, 4, COLORS.amber, 1);
        const h = writeText(r, margin + 6, y + 2, { size: 9, color: COLORS.muted, maxWidth: contentW - 8 });
        y += h * 5 + 5;
      });
    }
  }

  // ── Footer on every page ──────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text('We Define Travel — Competitor Analysis Report — Confidential', margin, 292);
    doc.text(`Page ${p} of ${totalPages}`, pageW - margin, 292, { align: 'right' });
  }

  doc.save(`${scenario?.name || 'analysis'}-report.pdf`);
}