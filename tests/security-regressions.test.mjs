import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { buildReportPrintHtml } from "../src/components/reports/reportHtml.js";
import { safePdfUrl } from "../src/lib/pdfSecurity.js";

const readProjectFile = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("report print HTML escapes stored user content", () => {
  const html = buildReportPrintHtml(
    {
      title: '<img src=x onerror="window.opener.steal()">',
      client_name: "<script>clientAttack()</script>",
      month: "2026-07",
    },
    {
      status: "Final",
      activity_summary: "<script>reportAttack()</script>\nSecond line",
    },
  );

  assert.doesNotMatch(html, /<img src=x/i);
  assert.doesNotMatch(html, /<script>clientAttack/i);
  assert.doesNotMatch(html, /<script>reportAttack/i);
  assert.match(html, /&lt;img src=x onerror=&quot;window\.opener\.steal\(\)&quot;&gt;/);
  assert.match(html, /&lt;script&gt;reportAttack\(\)&lt;\/script&gt;<br\/>Second line/);
});

test("reimbursement page and paid fields require an administrator", async () => {
  const [appSource, expenseSource, mileageSource] = await Promise.all([
    readProjectFile("src/App.jsx"),
    readProjectFile("base44/entities/Expense.jsonc"),
    readProjectFile("base44/entities/MileageJourney.jsonc"),
  ]);

  assert.match(
    appSource,
    /path="\/expenses\/reimbursements"\s+element=\{<AdminRoute><Reimbursements \/><\/AdminRoute>\}/,
  );

  const expense = JSON.parse(expenseSource);
  const mileage = JSON.parse(mileageSource);
  const adminWrite = { user_condition: { role: "admin" } };

  assert.deepEqual(expense.properties.reimbursement_paid.rls.write, adminWrite);
  assert.deepEqual(mileage.properties.reimbursement_paid.rls.write, adminWrite);
});

test("mileage records are readable and editable only by their creator or an admin", async () => {
  const mileage = JSON.parse(
    await readProjectFile("base44/entities/MileageJourney.jsonc"),
  );

  for (const permission of ["read", "update"]) {
    assert.deepEqual(mileage.rls[permission], {
      $or: [
        { created_by: "{{user.email}}" },
        { user_condition: { role: "admin" } },
      ],
    });
  }
});

test("PDF exports only embed HTTP and HTTPS receipt links", async () => {
  assert.equal(safePdfUrl("https://drive.google.com/file/d/example"), "https://drive.google.com/file/d/example");
  assert.equal(safePdfUrl("http://media.base44.com/example"), "http://media.base44.com/example");
  assert.equal(safePdfUrl("javascript:alert(document.cookie)"), null);
  assert.equal(safePdfUrl("data:text/html,<script>alert(1)</script>"), null);
  assert.equal(safePdfUrl("/relative/receipt"), null);
  assert.equal(safePdfUrl("not a URL"), null);

  const [clientReport, accountantExport, competitorReport] = await Promise.all([
    readProjectFile("src/pages/expenses/ClientReport.jsx"),
    readProjectFile("src/components/expenses/AccountantExport.jsx"),
    readProjectFile("src/components/competitor/ReportPDF.jsx"),
  ]);

  assert.match(clientReport, /const receiptUrl = safePdfUrl\(rawReceiptUrl\)/);
  assert.match(accountantExport, /const receiptUrl = safePdfUrl\(/);

  const productionPdfSources = `${clientReport}\n${accountantExport}\n${competitorReport}`;
  assert.doesNotMatch(productionPdfSources, /\.createAnnotation\s*\(/);
  assert.doesNotMatch(
    productionPdfSources,
    /\.output\s*\(\s*["'](?:pdfobjectnewwindow|pdfjsnewwindow|dataurlnewwindow)["']/,
  );
});

test("PDF security dependencies stay on patched versions", async () => {
  const [packageSource, lockSource] = await Promise.all([
    readProjectFile("package.json"),
    readProjectFile("package-lock.json"),
  ]);

  const packageJson = JSON.parse(packageSource);
  const packageLock = JSON.parse(lockSource);

  assert.equal(packageJson.dependencies.jspdf, "^4.2.1");
  assert.equal(packageLock.packages["node_modules/jspdf"].version, "4.2.1");
  assert.equal(packageLock.packages["node_modules/dompurify"].version, "3.4.12");
});

test("patched jsPDF still renders the primitives used by existing exports", async () => {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF("p", "mm", "a4");

  pdf.setFontSize(12);
  pdf.text("Expense report", 14, 14);
  pdf.setDrawColor(200);
  pdf.line(14, 18, 196, 18);
  pdf.setFillColor(245, 245, 245);
  pdf.rect(14, 22, 182, 8, "F");
  pdf.link(14, 34, 30, 5, { url: safePdfUrl("https://example.com/receipt") });
  pdf.addPage();
  pdf.text("Page 2", 14, 14);

  const output = new Uint8Array(pdf.output("arraybuffer"));
  assert.equal(new TextDecoder().decode(output.slice(0, 4)), "%PDF");
  assert.ok(output.length > 1_000);
});
