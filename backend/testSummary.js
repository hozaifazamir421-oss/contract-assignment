const { buildSummary } = require("./utils/summary");
const { parseDate } = require("./utils/dates");

let failed = 0;
function check(name, actual, expected) {
  if (actual === expected) {
    console.log(`PASS  ${name}  ->  ${actual}`);
  } else {
    failed++;
    console.log(`FAIL  ${name}\n        expected: ${expected}\n        got:      ${actual}`);
  }
}

const src = (section, quote) => [{ section, quote, verified: true }];

// Items shaped like the ones saved in the database (approved, current version)
const approved = [
  { _id: "a1", type: "party", title: "Vendor", value: "Brightline Software Pvt Ltd", sources: src("Preamble", "..."), edited: false },
  { _id: "a2", type: "party", title: "Client", value: "Kosi Traders Pvt Ltd", sources: src("Preamble", "..."), edited: false },
  { _id: "a3", type: "effective_date", title: "Effective Date", value: "1 March 2026", date: "2026-03-01", sources: src("Preamble", "..."), edited: false },
  { _id: "a4", type: "expiry", title: "Expiry Date", value: "28 February 2027", date: "2027-02-28", sources: src("1. Term", "..."), edited: false },
  { _id: "a5", type: "notice", title: "Non-renewal notice (edited by me)", value: "Written notice at least 60 days before the expiry date", days: 60, relativeTo: "expiry", sources: src("2. Renewal", "..."), edited: true },
  { _id: "a6", type: "obligation", title: "Usage Report Delivery", value: "The Vendor shall deliver a usage report by the 5th day of each month.", recurrence: "monthly", dayOfMonth: 5, responsibleParty: "The Vendor", sources: src("5. Reports", "..."), edited: false },
  { _id: "a7", type: "obligation", title: "Payment of Invoices", value: "The Client shall pay each Vendor invoice within 15 days of receiving it.", days: 15, relativeTo: "other", responsibleParty: "The Client", sources: src("4. Payment", "..."), edited: false },
  {
    _id: "a8", type: "conflict", title: "Contradictory Non-Renewal Notice Periods",
    value: "Section 2 says 60 days, Section 7 says 30 days.",
    question: "Does non-renewal require 60 or 30 days notice?",
    sources: [{ section: "2. Renewal", quote: "..." }, { section: "7. Non-renewal", quote: "..." }], edited: false,
  },
];

const today = parseDate("2026-10-11");
const summary = buildSummary({
  contract: { _id: "c1", title: "Brightline Service Agreement" },
  versionNumber: 1,
  approvedItems: approved,
  counts: { approved: 8, pending: 8, rejected: 0, staleFromEarlierVersions: 0 },
  today,
});

const heading = (name) => summary.sections.find((s) => s.heading === name);
const line = (sectionName, title) => heading(sectionName).lines.find((l) => l.title === title);

check("section order", summary.sections.map((s) => s.heading).join(" | "),
  "Parties | Key dates | Renewal, termination and notice | Obligations | Open questions");
check("60-day notice reminder date", line("Renewal, termination and notice", "Non-renewal notice (edited by me)").deadline.date, "2026-12-30");
check("monthly report next date", line("Obligations", "Usage Report Delivery").deadline.date, "2026-11-05");
check("payment has no calendar date", String(line("Obligations", "Payment of Invoices").deadline), "undefined");
check("conflict keeps its question", line("Open questions", "Contradictory Non-Renewal Notice Periods").question, "Does non-renewal require 60 or 30 days notice?");
check("edited flag carried over", String(line("Renewal, termination and notice", "Non-renewal notice (edited by me)").edited), "true");
check("source section shown for conflict", line("Open questions", "Contradictory Non-Renewal Notice Periods").source, "2. Renewal; 7. Non-renewal");
check("text mentions the disclaimer", String(summary.text.includes("not legal advice")), "true");

// Empty and stale cases
const empty = buildSummary({
  contract: { _id: "c1", title: "Empty" }, versionNumber: 2, approvedItems: [],
  counts: { approved: 0, pending: 5, rejected: 1, staleFromEarlierVersions: 4 }, today,
});
check("empty summary has no sections", String(empty.sections.length), "0");
check("empty summary says nothing approved", String(empty.text.includes("No items have been approved yet.")), "true");
check("stale note appears", String(empty.text.includes("4 item(s) approved on earlier versions are potentially stale")), "true");

console.log(failed === 0 ? "\nAll tests passed." : `\n${failed} test(s) FAILED.`);
process.exit(failed === 0 ? 0 : 1);