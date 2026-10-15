# curriculum-vitae

PDFs are built by `scripts/html-to-pdf.mjs` (and released by the GitHub workflow). The phone
number isn't stored in the repo: the HTML has `{{PHONE}}` placeholders, filled in from the
`CV_PHONE` env var (a `.env` file locally, a repo secret in Actions).

One-off CVs tailored to a single application go in `*.local.html` (e.g.
`en-acme.local.html`): they're gitignored, so the workflow never sees or releases them, but
running the script locally still prints them to PDF.
