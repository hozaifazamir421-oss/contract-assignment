// Writes one JSON object per line, e.g. {"time":"...","level":"info","event":"http.request",...}
function write(level, event, data = {}) {
  const line = JSON.stringify({ time: new Date().toISOString(), level, event, ...data });
  if (level === "error") console.error(line);
  else console.log(line);
}

module.exports = {
  info: (event, data) => write("info", event, data),
  warn: (event, data) => write("warn", event, data),
  error: (event, data) => write("error", event, data),
};