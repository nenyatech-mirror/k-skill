# daishin-report-search

Public lookup client for timestamped Daishin Securities report HTML pages mirrored at `jay-jo-0/github_pages_repo`.

## Usage

```js
const { listReports, fetchReport } = require("daishin-report-search")

const latest = await listReports({ limit: 10 })
const filtered = await listReports({ query: "반도체", limit: 5, maxInspect: 100 })
const detail = await fetchReport("20260511082352", { includeExplain: true })
```

```bash
daishin-report-search --limit 10
daishin-report-search 반도체 --limit 5 --max-inspect 100
daishin-report-search --id 20260511082352 --include-explain
```

## Source path

- Tree: `https://api.github.com/repos/jay-jo-0/github_pages_repo/git/trees/main?recursive=1`
- Raw detail: `https://raw.githubusercontent.com/Jay-jo-0/github_pages_repo/main/<path>`
- Browser detail: `https://jay-jo-0.github.io/github_pages_repo/<path>`

No API key or proxy is required.

## Boundaries

- `limit` is normalized to a positive integer with a maximum of 50 results.
- `maxInspect` is normalized to a positive integer with a maximum of 500 latest pages to avoid excessive raw GitHub fetches.
- Invalid, zero, negative, or non-finite numeric options fall back to documented defaults.
- The mirror can contain timestamped pages from sources other than Daishin Securities; inspect the returned title/headings/page URL before treating a result as Daishin-authored.
