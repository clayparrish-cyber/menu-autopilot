// lib/email/renderWeeklyBrief.ts
import type { WeeklyReportPayload } from "../report/types";

const money = (n?: number) =>
  typeof n === "number"
    ? n.toLocaleString("en-US", { style: "currency", currency: "USD" })
    : "—";

const pct = (n?: number) =>
  typeof n === "number" ? `${Math.round(n * 100)}%` : "—";

export function weeklyBriefSubject(r: { locationName: string; weekStart: string; weekEnd: string }) {
  return `Menu Autopilot — Weekly Actions (${r.weekStart}–${r.weekEnd}) | ${r.locationName}`;
}

export function renderWeeklyBriefEmailHtml(r: WeeklyReportPayload): string {
  const top3 = r.topActions.slice(0, 3);

  const actionLabel = (a: string) =>
    ({
      KEEP: "Keep",
      PROMOTE: "Promote",
      REPRICE: "Reprice",
      REPOSITION: "Reposition",
      REWORK_COST: "Rework cost",
      REMOVE: "Remove",
      KEEP_ANCHOR: "Keep (Anchor)",
    } as Record<string, string>)[a] ?? a;

  const confidenceLabel = (c: string) =>
    ({ HIGH: "High", MEDIUM: "Medium", LOW: "Low" } as Record<string, string>)[
      c
    ] ?? c;

  const badge = r.dataQuality.badge;
  const badgeText =
    badge === "GOOD" ? "Good" : badge === "MIXED" ? "Mixed" : "Review";

  const li = (s: string) => `<li style="margin:0 0 6px 0;">${escapeHtml(s)}</li>`;

  const actionCardHtml = (i: number, a: WeeklyReportPayload["topActions"][number]) => {
    const k = a.kpis;
    const rk = a.ranks;

    const whyBullets = a.whyItMatters.map(li).join("");
    const guardrails = (a.guardrailsAndNotes ?? []).map(li).join("");

    return `
      <div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:0 0 12px 0;">
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
          <div>
            <div style="font-size:16px;font-weight:700;line-height:1.2;">${i}. ${escapeHtml(a.itemName)}</div>
            <div style="font-size:13px;color:#374151;margin-top:4px;">
              ${escapeHtml(actionLabel(a.action))} • Confidence: ${escapeHtml(confidenceLabel(a.confidence))}
            </div>
          </div>
          <div style="text-align:right;font-size:12px;color:#111827;">
            <div><strong>Qty:</strong> ${k.qtySold}</div>
            <div><strong>Avg price:</strong> ${money(k.avgPrice)}</div>
            <div><strong>Unit margin:</strong> ${money(k.unitMargin)}</div>
          </div>
        </div>

        <div style="margin-top:10px;font-size:13px;color:#111827;">
          <div style="font-weight:700;margin-bottom:6px;">Why it matters</div>
          <ul style="margin:0 0 10px 18px;padding:0;">
            ${whyBullets}
            <li style="margin:0 0 6px 0;">
              Popularity rank: ${rk.popularityRank}/${rk.totalItems} (${Math.round(
      rk.popularityPercentile
    )}th pct)
            </li>
          </ul>

          <div style="font-weight:700;margin-bottom:6px;">Recommendation</div>
          <div style="margin-bottom:6px;">${escapeHtml(a.recommendationPrimary)}</div>
          ${
            a.recommendationAlternative
              ? `<div style="color:#374151;margin-bottom:10px;"><em>If not:</em> ${escapeHtml(
                  a.recommendationAlternative
                )}</div>`
              : `<div style="margin-bottom:10px;"></div>`
          }

          ${
            guardrails
              ? `<div style="font-weight:700;margin-bottom:6px;">Guardrails / notes</div>
                 <ul style="margin:0 0 0 18px;padding:0;">${guardrails}</ul>`
              : ``
          }
        </div>
      </div>
    `;
  };

  const leak = r.biggestMarginLeak
    ? `
    <div style="border:1px solid #fee2e2;border-radius:12px;padding:16px;margin:14px 0;">
      <div style="font-size:14px;font-weight:800;">Biggest margin leak</div>
      <div style="margin-top:6px;"><strong>${escapeHtml(
        r.biggestMarginLeak.itemName
      )}</strong> is costing an estimated <strong>${money(
        r.biggestMarginLeak.estimatedLossUsd
      )}/week</strong> in margin relative to target.</div>
      <div style="margin-top:8px;color:#374151;">${escapeHtml(
        r.biggestMarginLeak.diagnosis
      )}</div>
      <ul style="margin:10px 0 0 18px;padding:0;">
        ${r.biggestMarginLeak.fixes
          .map((f) => li(`${f.label}: ${f.detail}`))
          .join("")}
      </ul>
    </div>
  `
    : "";

  const easyWin = r.easiestWin
    ? `
    <div style="border:1px solid #d1fae5;border-radius:12px;padding:16px;margin:14px 0;">
      <div style="font-size:14px;font-weight:800;">Easiest win</div>
      <div style="margin-top:6px;">
        <strong>${escapeHtml(r.easiestWin.itemName)}</strong> — ${escapeHtml(
        actionLabel(r.easiestWin.action)
      )} (Confidence: ${escapeHtml(confidenceLabel(r.easiestWin.confidence))})
      </div>
      <div style="margin-top:8px;color:#374151;">${escapeHtml(
        r.easiestWin.rationale
      )}</div>
      ${
        typeof r.easiestWin.estimatedUpsideUsd === "number"
          ? `<div style="margin-top:8px;"><strong>Estimated upside:</strong> ${money(
              r.easiestWin.estimatedUpsideUsd
            )}</div>`
          : ``
      }
    </div>
  `
    : "";

  const watch = (r.watchList?.length ?? 0)
    ? `
    <div style="margin:14px 0;">
      <div style="font-size:14px;font-weight:800;">Watch list (do not overreact)</div>
      <div style="margin-top:6px;color:#374151;">Low-confidence items or abnormal volatility. Recheck next week.</div>
      <ul style="margin:10px 0 0 18px;padding:0;">
        ${r.watchList!.slice(0, 5).map((w) => li(`${w.itemName} — ${w.reason}`)).join("")}
      </ul>
    </div>
  `
    : "";

  const anomalies =
    r.anomalies &&
    (r.anomalies.discountsElevated ||
      r.anomalies.refundsVoidsElevated ||
      r.anomalies.mappingWarning)
      ? `
    <div style="margin:14px 0;">
      <div style="font-size:14px;font-weight:800;">Anomalies</div>
      <ul style="margin:10px 0 0 18px;padding:0;">
        ${
          r.anomalies.discountsElevated
            ? li(`Discounts elevated: ${r.anomalies.discountsElevated}`)
            : ""
        }
        ${
          r.anomalies.refundsVoidsElevated
            ? li(`Refunds/voids elevated: ${r.anomalies.refundsVoidsElevated}`)
            : ""
        }
        ${
          r.anomalies.mappingWarning
            ? li(`Mapping warning: ${r.anomalies.mappingWarning}`)
            : ""
        }
      </ul>
    </div>
  `
      : "";

  return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>Menu Autopilot Weekly Brief</title>
    </head>
    <body style="margin:0;background:#f9fafb;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
      <div style="max-width:680px;margin:0 auto;padding:22px;">
        <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;padding:18px;">
          <div style="font-size:18px;font-weight:900;">Menu Autopilot — Weekly Brief</div>
          <div style="margin-top:6px;color:#374151;font-size:13px;">
            <strong>Location:</strong> ${escapeHtml(r.locationName)}<br/>
            <strong>Period:</strong> ${escapeHtml(r.weekStart)} to ${escapeHtml(r.weekEnd)}<br/>
            <strong>Data quality:</strong> ${badgeText} — ${escapeHtml(r.dataQuality.note)}
          </div>

          <div style="margin-top:12px;padding:12px;border-radius:12px;background:#f3f4f6;">
            <div style="font-size:13px;"><strong>This week's focus:</strong> ${escapeHtml(
              r.focusLine
            )}</div>
            ${
              r.estimatedUpsideRange
                ? `<div style="margin-top:6px;font-size:13px;"><strong>Estimated upside:</strong> ${escapeHtml(
                    r.estimatedUpsideRange
                  )}</div>`
                : ``
            }
          </div>

          <div style="margin-top:16px;font-size:15px;font-weight:900;">Top 3 actions (do these first)</div>
          <div style="margin-top:10px;">
            ${actionCardHtml(1, top3[0])}
            ${actionCardHtml(2, top3[1])}
            ${actionCardHtml(3, top3[2])}
          </div>

          ${leak}
          ${easyWin}
          ${watch}
          ${anomalies}

          <div style="margin-top:18px;padding-top:14px;border-top:1px solid #e5e7eb;">
            <div style="font-size:14px;font-weight:900;">Quick links</div>
            <ul style="margin:10px 0 0 18px;padding:0;">
              <li style="margin:0 0 6px 0;"><a href="${r.links.reportUrl}">View full report</a></li>
              <li style="margin:0 0 6px 0;"><a href="${r.links.recommendationsCsvUrl}">Download recommendations CSV</a></li>
              <li style="margin:0 0 6px 0;"><a href="${r.links.costEditorUrl}">Update item costs</a></li>
            </ul>
            <div style="margin-top:12px;color:#6b7280;font-size:12px;line-height:1.4;">
              You're receiving this because Menu Autopilot generated a report from your uploaded POS export.
              If something looks off, update mappings/costs in Settings.
            </div>
          </div>

        </div>
      </div>
    </body>
  </html>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
