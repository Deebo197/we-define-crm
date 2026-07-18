/**
 * weeklyDigest — compiles the Monday-morning summary and emails it to the
 * team: overdue interaction follow-ups, pipeline pairs gone quiet (30+ days),
 * pending reimbursements and unprocessed inbox receipts.
 *
 * Wire-up: create a SCHEDULED AUTOMATION in the Base44 dashboard (same place
 * as the receipt-sync automations) that invokes this function weekly, e.g.
 * Mondays 07:30. Invoking it manually (POST, any body) also works — pass
 * { "to": "someone@wedefine.travel" } to send a test to one address.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const QUIET_DAYS = 30;
const APP_URL = 'https://app.base44.com';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function daysSince(dateStr) {
  if (!dateStr) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000));
}

function esc(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function rows(items, render) {
  return items.map(render).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));

    const [interactions, links, expenses, mileage, inboxItems, teamMembers] = await Promise.all([
      base44.asServiceRole.entities.Interaction.list('-date', 1000),
      base44.asServiceRole.entities.ClientTradeLink.list('-updated_date', 5000),
      base44.asServiceRole.entities.Expense.filter({ reimbursement_required: true }),
      base44.asServiceRole.entities.MileageJourney.filter({ reimbursement_required: true }),
      base44.asServiceRole.entities.ReceiptInboxItem.filter({ status: 'needs_review' }),
      base44.asServiceRole.entities.TeamMember.filter({ status: 'Active' }),
    ]);

    const today = todayStr();

    const overdue = interactions
      .filter((i) => i.next_action_date && i.next_action_date < today)
      .sort((a, b) => (a.next_action_date || '').localeCompare(b.next_action_date || ''))
      .slice(0, 15);

    const quiet = links
      .filter((l) => !l.closed_status)
      .filter((l) => {
        const d = daysSince(l.last_activity_date);
        return d === null || d > QUIET_DAYS;
      })
      .sort((a, b) => (daysSince(b.last_activity_date) ?? 9999) - (daysSince(a.last_activity_date) ?? 9999))
      .slice(0, 15);

    const pendingReimb = [
      ...expenses.filter((e) => !e.reimbursement_paid),
      ...mileage.filter((m) => !m.reimbursement_paid),
    ];
    const pendingTotal = pendingReimb.reduce(
      (s, r) => s + (r.paid_amount ?? r.total_cost ?? 0), 0
    );

    const sectionStyle = 'margin:0 0 6px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#5A3DE6;';
    const rowStyle = 'font-size:13px;color:#334155;padding:3px 0;border-bottom:1px solid #eef1f6;';

    const body = `
<div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:0 auto;color:#1a1a2e;padding:24px;">
  <h1 style="font-size:19px;margin:0 0 2px;">Repevo weekly digest</h1>
  <p style="font-size:12px;color:#94a3b8;margin:0 0 20px;">${esc(new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</p>

  <p style="${sectionStyle}">Overdue follow-ups (${overdue.length})</p>
  ${overdue.length ? rows(overdue, (i) => `<p style="${rowStyle}"><strong>${esc(i.title)}</strong> — ${esc(i.company_name || '')} · due ${esc(i.next_action_date)}</p>`) : `<p style="${rowStyle}">None — clean sheet.</p>`}

  <p style="${sectionStyle};margin-top:20px;">Pipeline gone quiet — ${QUIET_DAYS}+ days (${quiet.length})</p>
  ${quiet.length ? rows(quiet, (l) => `<p style="${rowStyle}"><strong>${esc(l.trade_account_name)}</strong> × ${esc(l.client_name)} · ${esc(l.stage)}${l.owner ? ` · ${esc(l.owner)}` : ''} · ${daysSince(l.last_activity_date) ?? 'no'} days since activity</p>`) : `<p style="${rowStyle}">Every pair has recent activity.</p>`}

  <p style="${sectionStyle};margin-top:20px;">Money & admin</p>
  <p style="${rowStyle}">Pending reimbursements: <strong>${pendingReimb.length}</strong> item(s), £${pendingTotal.toFixed(2)}</p>
  <p style="${rowStyle}">Receipt inbox needing review: <strong>${inboxItems.length}</strong></p>

  <p style="margin-top:24px;"><a href="${APP_URL}" style="display:inline-block;background:#5A3DE6;color:#fff;text-decoration:none;padding:10px 22px;border-radius:10px;font-weight:600;font-size:13px;">Open My Week →</a></p>
  <p style="font-size:11px;color:#9ca3af;margin-top:24px;">Automated weekly digest from Repevo.</p>
</div>`.trim();

    const recipients = payload.to
      ? [payload.to]
      : teamMembers.map((m) => m.email).filter(Boolean);

    for (const to of recipients) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to,
        subject: `Repevo weekly digest — ${overdue.length} overdue, ${quiet.length} quiet pipeline pairs`,
        body,
      });
    }

    return Response.json({
      success: true,
      sent_to: recipients,
      overdue: overdue.length,
      quiet: quiet.length,
      pending_reimbursements: pendingReimb.length,
      inbox_needs_review: inboxItems.length,
    });
  } catch (error) {
    console.error('weeklyDigest error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
