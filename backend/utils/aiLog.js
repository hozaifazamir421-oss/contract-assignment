const logger = require("./logger");


async function withAiLog(extractFn, text, context = {}) {
  const started = Date.now();
  logger.info("ai.extract.start", { ...context, characters: text.length });
  try {
    const items = await extractFn(text);
    const uncertain = items.filter((i) => i.status === "uncertain").length;
    const citationWarnings = items.filter((i) => i.citationWarning).length;
    logger.info("ai.extract.done", {
      ...context,
      ms: Date.now() - started,
      items: items.length,
      confirmed: items.length - uncertain,
      uncertain,
      citationWarnings,
    });
    return items;
  } catch (err) {
    logger.error("ai.extract.failed", { ...context, ms: Date.now() - started, message: err.message });
    throw err;
  }
}

module.exports = { withAiLog };