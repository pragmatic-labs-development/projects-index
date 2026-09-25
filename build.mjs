/**
 * Builds the project index from live GitHub data.
 *
 * Generated rather than hand-written, because a hand-written index is a list
 * that is wrong within a month. Re-run `node build.mjs` (or let CI do it on a
 * schedule) and it reflects reality again.
 *
 * Live URLs are *probed*, not assumed — a repo having Pages enabled doesn't mean
 * anything is actually being served, and the whole point of this page is that
 * every link works.
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const OWNER = 'pragmatic-labs-development';

/** Custom domains, which GitHub's API doesn't expose on the repo record. */
const CUSTOM_DOMAINS = {
  'nudgy-website': 'https://get-nudged.online',
  aipm: 'https://aipm.blog',
  'chads-gpt': 'https://chads-gpt.com',
};

/** Sub-paths worth surfacing directly, so nested work isn't invisible. */
const NESTED = {
  'envisor-demo': [
    ['launchpad', 'Launchpad'],
    ['marketing-website', 'Marketing site'],
    ...Array.from({ length: 10 }, (_, i) => [`marketing-v${i + 1}`, `Concept v${i + 1}`]),
  ],
};

/** Hand-written context where a repo description is missing or unhelpful. */
const NOTES = {
  nudgy: 'Personal CRM — web and mobile, one Expo codebase. Active.',
  'nudgy-site': 'Marketing one-pager for the CRM.',
  'nudgy-legacy-desktop': 'The original macOS screenshot tool. Frozen at v0.2.3; still auto-updates for existing users.',
  'nudgy-website': 'Marketing site for the screenshot tool. Frozen, still serving.',
  envisor: 'Monorepo: Launchpad app plus ten marketing-site concepts.',
  'envisor-demo': 'Public mirror of the Envisor prototypes.',
};

const sh = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', maxBuffer: 20e6 });

const repos = JSON.parse(
  sh('gh', [
    'repo', 'list', OWNER, '--limit', '100', '--json',
    'name,description,visibility,isArchived,pushedAt,createdAt,primaryLanguage,homepageUrl,url',
  ]),
);

/** Is something actually being served here? */
function isLive(url) {
  try {
    const code = sh('curl', ['-sL', '-o', '/dev/null', '-w', '%{http_code}', url, '--max-time', '10']).trim();
    return code === '200';
  } catch {
    return false;
  }
}

console.log(`Checking ${repos.length} repos for live sites…`);

for (const r of repos) {
  const candidates = [
    CUSTOM_DOMAINS[r.name],
    r.homepageUrl,
    `https://${OWNER}.github.io/${r.name}/`,
  ].filter(Boolean);

  r.live = candidates.find(isLive) ?? null;
  r.note = NOTES[r.name] ?? r.description ?? '';
  r.nested = (NESTED[r.name] ?? [])
    .map(([path, label]) => ({ label, url: `https://${OWNER}.github.io/${r.name}/${path}` }))
    .filter((n) => isLive(n.url));

  if (r.live) console.log(`  live: ${r.name} → ${r.live}`);
}

repos.sort((a, b) => b.pushedAt.localeCompare(a.pushedAt));

const active = repos.filter((r) => !r.isArchived);
const archived = repos.filter((r) => r.isArchived);

const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function when(iso) {
  const days = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  const y = Math.floor(days / 365);
  return `${y}y ago`;
}

const card = (r) => `
      <li class="card${r.isArchived ? ' archived' : ''}">
        <div class="row">
          <h3>${esc(r.name)}</h3>
          <span class="meta">
            ${r.visibility === 'PRIVATE' ? '<span class="tag">private</span>' : ''}
            ${r.isArchived ? '<span class="tag">archived</span>' : ''}
            ${r.primaryLanguage ? `<span class="lang">${esc(r.primaryLanguage.name)}</span>` : ''}
            <span class="when">${when(r.pushedAt)}</span>
          </span>
        </div>
        ${r.note ? `<p>${esc(r.note)}</p>` : ''}
        <div class="links">
          <a href="${esc(r.url)}">Code</a>
          ${r.live ? `<a class="live" href="${esc(r.live)}">Live ↗</a>` : '<span class="nolive">no live site</span>'}
        </div>
        ${
          r.nested.length
            ? `<div class="nested">${r.nested
                .map((n) => `<a href="${esc(n.url)}">${esc(n.label)}</a>`)
                .join('')}</div>`
            : ''
        }
      </li>`;

const liveCount = repos.filter((r) => r.live).length + repos.reduce((n, r) => n + r.nested.length, 0);

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Projects — Pragmatic Labs</title>
<meta name="description" content="Every project, with links to the code and to anything that's live." />
<meta name="robots" content="noindex" />
<style>
  :root {
    --bg:#fff; --surface:#f7f7f5; --border:#e4e4e0;
    --text:#1a1a18; --muted:#6b6b66; --faint:#9a9a94; --accent:#c2410c;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#131312; --surface:#1c1c1a; --border:#2c2c29;
            --text:#f0f0ec; --muted:#a3a39c; --faint:#77776f; --accent:#f97316; }
  }
  *,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }
  body { background:var(--bg); color:var(--text); font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif; -webkit-font-smoothing:antialiased; }
  main { max-width:56rem; margin:0 auto; padding:clamp(2rem,6vw,4rem) 1.25rem 5rem; }
  h1 { font-size:clamp(1.75rem,5vw,2.25rem); letter-spacing:-.02em; }
  .sub { color:var(--muted); margin-top:.4rem; }
  h2 { font-size:.8rem; text-transform:uppercase; letter-spacing:.07em; color:var(--faint); margin:3rem 0 .75rem; font-weight:600; }
  ul { list-style:none; display:grid; gap:.75rem; }
  .card { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:1rem 1.15rem; }
  .card.archived { opacity:.62; }
  .row { display:flex; flex-wrap:wrap; align-items:baseline; justify-content:space-between; gap:.5rem; }
  h3 { font-size:1.05rem; font-weight:650; }
  .meta { display:flex; align-items:center; gap:.5rem; flex-wrap:wrap; }
  .tag { font-size:.7rem; text-transform:uppercase; letter-spacing:.05em; color:var(--faint); border:1px solid var(--border); border-radius:99px; padding:.1rem .45rem; }
  .lang, .when { font-size:.8rem; color:var(--faint); }
  .card p { color:var(--muted); font-size:.92rem; margin-top:.35rem; }
  .links { display:flex; gap:1rem; margin-top:.7rem; font-size:.9rem; }
  .links a { color:var(--accent); text-decoration:none; font-weight:550; }
  .links a:hover { text-decoration:underline; }
  .nolive { color:var(--faint); font-size:.9rem; }
  .nested { display:flex; flex-wrap:wrap; gap:.4rem; margin-top:.8rem; padding-top:.8rem; border-top:1px solid var(--border); }
  .nested a { font-size:.8rem; color:var(--muted); text-decoration:none; border:1px solid var(--border); border-radius:99px; padding:.2rem .6rem; }
  .nested a:hover { color:var(--accent); border-color:var(--accent); }
  footer { margin-top:3.5rem; padding-top:1.25rem; border-top:1px solid var(--border); color:var(--faint); font-size:.85rem; }
</style>
</head>
<body>
<main>
  <h1>Projects</h1>
  <p class="sub">${repos.length} repositories · ${liveCount} live links · everything below was checked and returns 200.</p>

  <h2>Active</h2>
  <ul>${active.map(card).join('')}
  </ul>

  <h2>Archived</h2>
  <ul>${archived.map(card).join('')}
  </ul>

  <footer>
    Generated from the GitHub API on ${new Date().toISOString().slice(0, 10)}.
    Re-run <code>node build.mjs</code> to refresh.
  </footer>
</main>
</body>
</html>
`;

writeFileSync('index.html', html);
console.log(`\nWrote index.html — ${repos.length} repos, ${liveCount} live links.`);
