import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { buildReportPrintHtml } from "../src/components/reports/reportHtml.js";

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
