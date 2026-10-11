const DAY_MS = 24 * 60 * 60 * 1000;
function parseDate(text) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text || "");
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  const d = new Date(Date.UTC(year, month, day));
  // Reject impossible dates like 2027-02-31 (JavaScript would silently turn it into 3 March)
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month || d.getUTCDate() !== day) {
    return null;
  }
  return d;
}


function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

function addDays(d, n) {
  return new Date(d.getTime() + n * DAY_MS);
}

function daysBetween(from, to) {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

// Today's calendar date on this computer, as a UTC-midnight Date
function todayDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

// Next date (today counts) whose day of the month is dayOfMonth.
// If a month is too short (day 31 in June), the last day of that month is used.
function nextMonthly(dayOfMonth, today) {
  if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) return null;
  for (let i = 0; i < 13; i++) {
    const year = today.getUTCFullYear();
    const month = today.getUTCMonth() + i; // Date.UTC rolls month 12 over into next year
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const candidate = new Date(Date.UTC(year, month, Math.min(dayOfMonth, lastDay)));
    if (candidate.getTime() >= today.getTime()) return candidate;
  }
  return null;
}

// These item types describe facts, not deadlines
const INFORMATION_ONLY = ["party", "effective_date", "unclear_term", "conflict"];

// Finds an exact date among the approved items, e.g. the expiry date
function findAnchor(approvedItems, type) {
  for (const item of approvedItems) {
    if (item.type === type) {
      const d = parseDate(item.date);
      if (d) return d;
    }
  }
  return null;
}

// Works out the calendar date for one item.
// Returns { kind: "date" | "recurring" | "none", date, how, reason }
function computeDeadline(item, approvedItems, today) {
  if (INFORMATION_ONLY.includes(item.type)) {
    return { kind: "none", reason: "Information only" };
  }

  // Repeating duty, e.g. "by the 5th day of each month"
  if (item.recurrence === "monthly" && item.dayOfMonth) {
    const next = nextMonthly(item.dayOfMonth, today);
    if (next) {
      return {
        kind: "recurring",
        date: formatDate(next),
        how: `Repeats monthly on day ${item.dayOfMonth}`,
      };
    }
  }

  // An exact date written in the contract, e.g. the expiry date
  const stated = parseDate(item.date);
  if (stated) {
    return { kind: "date", date: formatDate(stated), how: "Date written in the contract" };
  }

  // "N days before/after" the expiry date or the effective date
  if (item.days && (item.relativeTo === "expiry" || item.relativeTo === "effective_date")) {
    const anchorType = item.relativeTo;
    const label = anchorType === "expiry" ? "expiry date" : "effective date";
    const anchor = findAnchor(approvedItems, anchorType);
    if (!anchor) {
      return { kind: "none", reason: `Needs an approved ${label} item first` };
    }
    const direction = item.direction || (anchorType === "expiry" ? "before" : "after");
    const result = addDays(anchor, direction === "before" ? -item.days : item.days);
    return {
      kind: "date",
      date: formatDate(result),
      how: `${item.days} days ${direction} the ${label} (${formatDate(anchor)})`,
    };
  }

  return { kind: "none", reason: "No calendar date can be worked out from the contract" };
}

module.exports = {
  parseDate,
  formatDate,
  addDays,
  daysBetween,
  todayDate,
  nextMonthly,
  computeDeadline,
 INFORMATION_ONLY,
};