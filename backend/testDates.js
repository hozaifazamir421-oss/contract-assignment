const {
  parseDate,
  formatDate,
  addDays,
  daysBetween,
  nextMonthly,
  computeDeadline,
} = require("./utils/dates");

let failed = 0;

function check(name, actual, expected) {
  if (actual === expected) {
    console.log(`PASS  ${name}  ->  ${actual}`);
  } else {
    failed++;
    console.log(`FAIL  ${name}\n        expected: ${expected}\n        got:      ${actual}`);
  }
}

const date = (text) => parseDate(text);

// 1. The two notice periods from the sample contract (expiry 2027-02-28)
const expiry = date("2027-02-28");
check("60 days before 28 Feb 2027", formatDate(addDays(expiry, -60)), "2026-12-30");
check("30 days before 28 Feb 2027", formatDate(addDays(expiry, -30)), "2027-01-29");

// 2. Calendar edge cases
check("1 day before 1 Mar 2028 (leap year)", formatDate(addDays(date("2028-03-01"), -1)), "2028-02-29");
check("1 day before 1 Mar 2027 (normal year)", formatDate(addDays(date("2027-03-01"), -1)), "2027-02-28");
check("impossible date 2027-02-31 is rejected", String(parseDate("2027-02-31")), "null");
check("text that is not a date is rejected", String(parseDate("March 1st")), "null");
check("days between 11 Oct and 30 Dec 2026", String(daysBetween(date("2026-10-11"), date("2026-12-30"))), "80");

// 3. Monthly duty "by the 5th day of each month"
check("5th monthly, today 11 Oct 2026", formatDate(nextMonthly(5, date("2026-10-11"))), "2026-11-05");
check("5th monthly, today IS the 5th", formatDate(nextMonthly(5, date("2026-10-05"))), "2026-10-05");
check("5th monthly, today 20 Dec 2026 (next year)", formatDate(nextMonthly(5, date("2026-12-20"))), "2027-01-05");
check("31st monthly in a 30-day month", formatDate(nextMonthly(31, date("2026-06-10"))), "2026-06-30");
check("day 0 is rejected", String(nextMonthly(0, date("2026-10-11"))), "null");

// 4. computeDeadline with items shaped like the ones saved in the database
const today = date("2026-10-11");
const approved = [{ type: "expiry", date: "2027-02-28" }];

const notice60 = { type: "notice", days: 60, relativeTo: "expiry" };
const notice30 = { type: "notice", days: 30, relativeTo: "expiry" };
const report = { type: "obligation", recurrence: "monthly", dayOfMonth: 5 };
const payment = { type: "obligation", days: 15, relativeTo: "other" };
const expiryItem = { type: "expiry", date: "2027-02-28" };
const conflict = { type: "conflict" };

check("notice 60 -> date", computeDeadline(notice60, approved, today).date, "2026-12-30");
check("notice 30 -> date", computeDeadline(notice30, approved, today).date, "2027-01-29");
check("monthly report -> kind", computeDeadline(report, approved, today).kind, "recurring");
check("monthly report -> date", computeDeadline(report, approved, today).date, "2026-11-05");
check("expiry item -> date", computeDeadline(expiryItem, approved, today).date, "2027-02-28");
check("payment (no start date) -> kind", computeDeadline(payment, approved, today).kind, "none");
check("conflict -> kind", computeDeadline(conflict, approved, today).kind, "none");
check("notice 60 with NO approved expiry -> kind", computeDeadline(notice60, [], today).kind, "none");
check(
  "'after' direction: 30 days after effective date",
  computeDeadline(
    { type: "obligation", days: 30, relativeTo: "effective_date" },
    [{ type: "effective_date", date: "2026-03-01" }],
    today
  ).date,
  "2026-03-31"
);

console.log(failed === 0 ? "\nAll tests passed." : `\n${failed} test(s) FAILED.`);
process.exit(failed === 0 ? 0 : 1);