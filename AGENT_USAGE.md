# Agent usage

## Tools

- **Claude (Anthropic)**: used throughout as a coding assistant for planning, writing first versions of code, debugging and drafting documentation.
- **Gemini (Google AI Studio)**: not a development tool. It is the model the application itself calls to extract contract items.
- **VS Code, Git/GitHub, MongoDB Atlas, Render, Vercel**: development, source control, database and hosting.

## Representative prompts

1. "Build an Express route that accepts a PDF, DOCX or pasted text and returns plain text." (`backend/utils/extractText.js`)
2. "Call Gemini with a fixed JSON schema. Each item must carry the section name and an exact quote from the contract." (`backend/AiService/extractContract.js`)
3. "Keep all reminder-date arithmetic in plain deterministic code. The model returns only raw facts such as days, direction and the anchor date." (`backend/utils/dates.js`)
4. "The extraction missed a second notice clause. Make it create a separate item for every clause."
5. "Investigate why the PDF read sometimes fails with 'bad XRef entry' on the first request after a server start."
6. "Build the dashboard tab from this JSON response." (I pasted the real API output.)
7. "Add structured JSON logs for HTTP requests and for the AI extraction step, without logging contract text."

## What I delegated and what I did myself

**Delegated to the assistant:** first versions of the Mongoose models, routes, extraction prompt and schema, date utilities, summary builder, React components, tests and the draft README.

**My own decisions and work:**
- Chose the stack: plain JavaScript, MongoDB Atlas, Gemini, React with Vite, Render and Vercel.
- Decided to keep `pdf-parse` and not replace it with another PDF library, accepting a documented limitation.
- Created the accounts, keys and database, and configured the environment variables and deployment.
- Ran and tested every step on my machine and on the live site, including the sample contract with its deliberate conflict.
- Noticed and raised gaps: the missing success logs, the dashboard behaviour for items without dates, and the shared local/live database.


## Mistakes and rejected suggestions

- **Wrong date example.** The assistant gave an incorrect result for "60 days before 1 March 2027". I caught it, we fixed the explanation, and the date logic is now covered by automated tests.
- **Missed clause.** The first extraction merged two notice clauses into one item. We changed the prompt to require one item per clause and re-tested.
- **Rejected suggestion.** The assistant proposed replacing `pdf-parse` with `pdfjs-dist` to remove an intermittent "bad XRef entry" error. It worked in a test, but I rejected it and listed the limitation in the README. As a precaution the server runs on a different Node version in render.
- **Wrong assumption about deployment.** The assistant said the hosted app would use a separate, empty database. A check of the live API showed it shares the local one, so the README now says so.
- **Unstable AI output.** Titles and the number of items change between runs, so the code never relies on item titles or ids from the AI.

## How I verified the output

- `npm test` runs 32 automated checks on the date logic and the summary builder.
- The server checks every citation: the quote must appear in the contract text, or the item becomes "uncertain" with a warning.
- Manual API tests and browser tests for upload, review, dashboard, versions, summary, validation errors and failure cases.
- Structured logs showed AI timing, item counts and errors during testing.
- Nothing appears on the dashboard or in the summary until a person approves it.

## Responsible use

- `.env` files are git-ignored and `.env.example` lists names only.
- Contract text and keys are never written to logs.
- The interface states that the tool is not legal advice.
- No real contracts were used. All samples are fictional.