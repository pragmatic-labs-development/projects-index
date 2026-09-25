# projects-index

A single page listing every Pragmatic Labs project, with links to the code and to
anything that's actually live.

**Live:** https://pragmatic-labs-development.github.io/projects-index/

## Why it's generated

`index.html` is built by `build.mjs` from the GitHub API. A hand-written index is
a list that's wrong within a month.

Live URLs are **probed**, not assumed — a repo having Pages enabled doesn't mean
anything is being served there. Every link on the page returned 200 when it was
built. It also surfaces nested work, like Envisor's ten marketing concepts, which
were deployed but unreachable from anywhere.

## Refresh

```bash
node build.mjs
git commit -am "chore: refresh index" && git push
```

Needs `gh` authenticated. CI also refreshes it weekly.

## Editing

Three maps at the top of `build.mjs`:

- `CUSTOM_DOMAINS` — domains the GitHub API doesn't report
- `NESTED` — sub-paths worth surfacing directly
- `NOTES` — context where a repo description is missing or unhelpful
