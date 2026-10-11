const { computeDeadline, formatDate } = require("./dates");

// Which item types go under which heading of the summary
const SECTIONS = [
  { heading: "Parties", types: ["party"] },
  { heading: "Key dates", types: ["effective_date", "expiry"] },
  { heading: "Renewal, termination and notice", types: ["renewal", "termination", "notice"] },
  { heading: "Obligations", types: ["obligation"] },
  { heading: "Open questions", types: ["unclear_term", "conflict"] },
];

const DISCLAIMER =
  "This summary is an information-management aid built from items a person reviewed. It is not legal advice.";

function sourceLabel(item) {
  return (item.sources || [])
    .map((s) => s.section)
    .filter(Boolean)
    .join("; ");
}

// One approved item -> one line of the summary
function buildLine(item, approvedItems, today) {
  const result = computeDeadline(item, approvedItems, today);
  const line = {
    itemId: item._id,
    title: item.title,
    text: item.value,
    source: sourceLabel(item),
    edited: Boolean(item.edited),
  };
  if (item.responsibleParty) line.responsibleParty = item.responsibleParty;
  if (item.question) line.question = item.question;
  if (result.kind === "date" || result.kind === "recurring") {
    line.deadline = { date: result.date, how: result.how };
  }
  return line;
}

// The same summary as plain text, easy to copy or download
function renderText({ contract, versionNumber, counts, sections, disclaimer }) {
  const out = [];
  out.push(`Contract summary: ${contract.title} (version ${versionNumber})`);
  out.push(
    `Based on ${counts.approved} approved item(s). ${counts.pending} not yet reviewed, ${counts.rejected} rejected.`
  );
  if (counts.staleFromEarlierVersions > 0) {
    out.push(
      `${counts.staleFromEarlierVersions} item(s) approved on earlier versions are potentially stale and are not included.`
    );
  }
  if (sections.length === 0) {
    out.push("", "No items have been approved yet.");
  }
  for (const section of sections) {
    out.push("", section.heading.toUpperCase());
    for (const line of section.lines) {
      let s = `- ${line.title}: ${line.text}`;
      if (line.responsibleParty) s += ` (Responsible: ${line.responsibleParty})`;
      if (line.deadline) s += ` -> ${line.deadline.how}: ${line.deadline.date}`;
      if (line.source) s += ` [Source: ${line.source}]`;
      if (line.edited) s += " (edited by reviewer)";
      out.push(s);
      if (line.question) out.push(`    Question: ${line.question}`);
    }
  }
  out.push("", disclaimer);
  return out.join("\n");
}

// approvedItems: approved items of the CURRENT version only
function buildSummary({ contract, versionNumber, approvedItems, counts, today }) {
  const sections = [];
  for (const def of SECTIONS) {
    const lines = approvedItems
      .filter((item) => def.types.includes(item.type))
      .map((item) => buildLine(item, approvedItems, today));
    if (lines.length > 0) sections.push({ heading: def.heading, lines });
  }

  const summary = {
    contract: { id: contract._id, title: contract.title },
    versionNumber,
    generatedOn: formatDate(today),
    counts,
    sections,
    disclaimer: DISCLAIMER,
  };
  summary.text = renderText(summary);
  return summary;
}

module.exports = { buildSummary };