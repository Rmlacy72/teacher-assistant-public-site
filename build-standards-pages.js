// build-standards-pages.js
//
// Run this locally with Node 18+: node build-standards-pages.js
// Generates static, SEO-friendly standards browsing pages directly into
// your ltc-publicsite repo folder. Commit + push the output like any
// other page on that site.
//
// Point API_BASE at your PROD backend once you're ready to publish —
// use dev while testing this script itself.

import fs from "fs";
import path from "path";

const API_BASE   = "https://ltc-teacher-grading-api-multi-tenant-fvbdadcfdgc6f9bt.canadacentral-01.azurewebsites.net";
const SITE_ORIGIN = "https://www.teacherassist.ai";
const OUTPUT_DIR  = "./standards"; // adjust to wherever this script sits relative to your repo root

const DOMAIN_ICONS = {
  "Structure and Properties of Matter": "⚗️",
  "Physical Sciences": "⚡",
  "Life Sciences": "🌿",
  "Earth's Systems": "🌍",
  "History: Continuity and Change": "📜",
  "Governmental Systems and Principles": "🏛️",
  "Geographic Study": "🗺️",
  "Economic Concepts": "💰",
};

function slugify(str) {
  return String(str).toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed (${res.status}): ${url}`);
  return res.json();
}

/* ── Build parent/sub-part tree, same logic as the app's Browse Standards ── */
function buildStandardTree(items) {
  const byId = {};
  items.forEach(s => { byId[s.standardId] = s; });

  const childrenMap = {};
  items.forEach(s => {
    const m = s.standardId.match(/^(.*\d)([a-z])$/i);
    if (m && byId[m[1]]) {
      const parentId = m[1];
      if (!childrenMap[parentId]) childrenMap[parentId] = [];
      childrenMap[parentId].push(s);
    }
  });

  const parents = [];
  items.forEach(s => {
    const m = s.standardId.match(/^(.*\d)([a-z])$/i);
    const isChild = m && byId[m[1]];
    if (!isChild) {
      const children = (childrenMap[s.standardId] || [])
        .sort((a, b) => a.standardId.localeCompare(b.standardId, undefined, { numeric: true }));
      parents.push({ ...s, _children: children });
    }
  });

  return parents;
}

function renderStandardRow(std) {
  const hasChildren = std._children && std._children.length > 0;

  if (!hasChildren) {
    return `
      <div class="std-row">
        <span class="std-id">${escapeHtml(std.standardId)}</span>
        <div class="std-body">
          ${std.skill ? `<div class="std-skill">${escapeHtml(std.skill)}</div>` : ""}
          <div class="std-desc">${escapeHtml(std.description)}</div>
        </div>
      </div>`;
  }

  return `
    <details class="std-parent">
      <summary>
        <span class="std-id">${escapeHtml(std.standardId)}</span>
        ${std.skill ? `<span class="std-skill-inline">${escapeHtml(std.skill)}</span>` : ""}
        <span class="std-count">${std._children.length} sub-part${std._children.length !== 1 ? "s" : ""}</span>
      </summary>
      <div class="std-parent-body">
        <div class="std-desc" style="margin-bottom:10px;">${escapeHtml(std.description)}</div>
        ${std._children.map(c => `
          <div class="std-row" style="padding-left:24px;">
            <span class="std-id">${escapeHtml(c.standardId)}</span>
            <div class="std-body">
              ${c.skill ? `<div class="std-skill">${escapeHtml(c.skill)}</div>` : ""}
              <div class="std-desc">${escapeHtml(c.description)}</div>
            </div>
          </div>
        `).join("")}
      </div>
    </details>`;
}

function renderDomainSections(standards) {
  const grouped = {};
  standards.forEach(s => {
    const domain = s.domain || "General";
    if (!grouped[domain]) grouped[domain] = [];
    grouped[domain].push(s);
  });

  return Object.keys(grouped).sort().map(domain => {
    const items = buildStandardTree(grouped[domain]);
    const icon = DOMAIN_ICONS[domain] || "📌";
    return `
      <details class="domain-section" open>
        <summary>
          <span class="domain-icon">${icon}</span>
          <span class="domain-name">${escapeHtml(domain)}</span>
          <span class="domain-count">${grouped[domain].length} standard${grouped[domain].length !== 1 ? "s" : ""}</span>
        </summary>
        <div class="domain-body">
          ${items.map(renderStandardRow).join("")}
        </div>
      </details>`;
  }).join("");
}

const IN_PAGE_SEARCH_SCRIPT = `
<script>
document.getElementById("pageSearch").addEventListener("input", function() {
  const q = this.value.trim().toLowerCase();
  document.querySelectorAll(".domain-section").forEach(function(section) {
    let anyVisible = false;
    section.querySelectorAll(".std-row, .std-parent").forEach(function(row) {
      const text = row.textContent.toLowerCase();
      const match = !q || text.includes(q);
      row.style.display = match ? "" : "none";
      if (match) anyVisible = true;
    });
    section.style.display = anyVisible ? "" : "none";
    if (q && anyVisible) section.open = true;
  });
});
</script>`;

const SUBJECT_SEARCH_SCRIPT = (jsonUrl) => `
<script>
let __searchIndex = null;
async function __loadSearchIndex() {
  if (__searchIndex) return __searchIndex;
  const res = await fetch("${jsonUrl}");
  __searchIndex = await res.json();
  return __searchIndex;
}
document.getElementById("subjectSearch").addEventListener("input", async function() {
  const q = this.value.trim().toLowerCase();
  const results = document.getElementById("subjectSearchResults");
  if (!q) { results.innerHTML = ""; results.style.display = "none"; return; }

  const index = await __loadSearchIndex();
  const matches = index.filter(s =>
    (s.standardId + " " + s.domain + " " + s.skill + " " + s.description).toLowerCase().includes(q)
  ).slice(0, 25);

  results.style.display = "block";
  if (!matches.length) {
    results.innerHTML = '<p style="color:var(--muted); padding:12px 0;">No standards match "' + this.value + '".</p>';
    return;
  }
  results.innerHTML = matches.map(s => \`
    <a href="\${s.pageUrl}" style="display:block; background:white; border:1px solid var(--border); border-radius:8px; padding:12px 16px; margin-bottom:8px; text-decoration:none; color:inherit;">
      <div style="display:flex; gap:10px; align-items:center; margin-bottom:4px;">
        <span class="std-id">\${s.standardId}</span>
        <span style="font-size:0.75rem; color:var(--muted);">\${s.gradeBand}</span>
      </div>
      \${s.skill ? '<div class="std-skill">' + s.skill + '</div>' : ""}
      <div class="std-desc">\${s.description}</div>
    </a>
  \`).join("");
});
</script>`;

const SHARED_CSS = `
  :root {
    --navy: #0f2438; --teal: #1d8a8a; --teal-lt: #e6f5f5;
    --cream: #faf6ee; --text: #1a2530; --muted: #64748b; --border: #e2e8f0;
  }
  * { box-sizing: border-box; }
  body { font-family: 'DM Sans', Arial, sans-serif; background: var(--cream); color: var(--text); margin: 0; line-height: 1.6; }
  .wrap { max-width: 800px; margin: 0 auto; padding: 40px 20px 100px; }
  a { color: var(--teal); }
  .breadcrumb { font-size: 0.82rem; color: var(--muted); margin-bottom: 20px; }
  .breadcrumb a { color: var(--muted); text-decoration: none; }
  .breadcrumb a:hover { text-decoration: underline; }
  h1 { font-family: Georgia, serif; color: var(--navy); font-size: 1.9rem; margin-bottom: 8px; }
  .subtitle { color: var(--muted); margin-bottom: 28px; }
  .cta-box {
    background: var(--navy); color: white; border-radius: 12px;
    padding: 20px 24px; margin-bottom: 28px; text-align: center;
  }
  .cta-box a {
    display: inline-block; background: var(--teal); color: white;
    padding: 10px 22px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 10px;
  }
  .domain-section {
    background: white; border: 1px solid var(--border); border-radius: 10px;
    margin-bottom: 12px; overflow: hidden;
  }
  .domain-section summary {
    display: flex; align-items: center; gap: 10px; padding: 14px 18px;
    cursor: pointer; font-weight: 700; color: var(--navy); list-style: none;
  }
  .domain-section summary::-webkit-details-marker { display: none; }
  .domain-count {
    font-size: 0.7rem; background: var(--teal-lt); color: var(--teal);
    padding: 2px 9px; border-radius: 10px; margin-left: auto;
  }
  .domain-body { border-top: 1px solid var(--border); padding: 4px 18px; }
  .std-row { display: flex; gap: 14px; padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
  .std-row:last-child { border-bottom: none; }
  .std-id {
    font-size: 0.72rem; font-weight: 700; color: var(--teal); background: var(--teal-lt);
    padding: 3px 8px; border-radius: 6px; white-space: nowrap; height: fit-content; min-width: 90px; text-align: center;
  }
  .std-skill { font-size: 0.76rem; font-weight: 700; color: var(--muted); text-transform: uppercase; margin-bottom: 3px; }
  .std-desc { font-size: 0.88rem; }
  .std-parent { border-bottom: 1px solid #f1f5f9; padding: 10px 0; }
  .std-parent summary { display: flex; align-items: center; gap: 10px; cursor: pointer; list-style: none; }
  .std-parent summary::-webkit-details-marker { display: none; }
  .std-skill-inline { font-size: 0.85rem; font-weight: 600; flex: 1; }
  .std-count { font-size: 0.7rem; font-weight: 700; color: var(--teal); background: var(--teal-lt); padding: 2px 8px; border-radius: 8px; }
  .std-parent-body { padding: 10px 0 0 8px; }
  ul.plain-list { list-style: none; padding: 0; }
  ul.plain-list li {
    background: white; border: 1px solid var(--border); border-radius: 8px;
    padding: 12px 16px; margin-bottom: 8px;
  }
  ul.plain-list a { text-decoration: none; font-weight: 600; }
  footer.site-footer { text-align: center; color: var(--muted); font-size: 0.8rem; margin-top: 40px; }
`;

function pageShell({ title, description, canonical, breadcrumb, body }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<link rel="canonical" href="${canonical}" />
<style>${SHARED_CSS}</style>
</head>
<body>
<div class="wrap">
  <div class="breadcrumb">${breadcrumb}</div>
  ${body}
  <footer class="site-footer">TeacherAssist.ai — free standards reference, built for teachers.</footer>
</div>
</body>
</html>`;
}

async function main() {
  console.log("Fetching standards catalog…");
  const allSets = await fetchJson(`${API_BASE}/api/public/standards-sets`);
  console.log(`Found ${allSets.length} standards sets.`);

  const sitemapUrls = [`${SITE_ORIGIN}/standards/`];

  const byState = {};
  allSets.forEach(s => {
    const st = s.state || "other";
    if (!byState[st]) byState[st] = {};
    const subj = s.subject || "other";
    if (!byState[st][subj]) byState[st][subj] = [];
    byState[st][subj].push(s);
  });

  // ── Top-level states index ──
  const statesListHtml = Object.keys(byState).sort().map(state => {
    const subjectCount = Object.keys(byState[state]).length;
    const setCount = Object.values(byState[state]).reduce((sum, arr) => sum + arr.length, 0);
    return `<li><a href="/standards/${slugify(state)}/">${state}</a> — ${subjectCount} subjects, ${setCount} standards sets</li>`;
  }).join("");

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, "index.html"), pageShell({
    title: "Free State Academic Standards Reference | TeacherAssist.ai",
    description: "Browse K-12 academic standards by state, subject, and grade — free, no signup required.",
    canonical: `${SITE_ORIGIN}/standards/`,
    breadcrumb: `<a href="/">Home</a> / Standards`,
    body: `
      <h1>State Academic Standards</h1>
      <p class="subtitle">Free reference — no signup, no account needed. Pick a state to get started.</p>
      <ul class="plain-list">${statesListHtml}</ul>
    `
  }));

  // ── Per state / subject / individual set ──
  for (const state of Object.keys(byState)) {
    const stateSlug = slugify(state);
    const stateDir = path.join(OUTPUT_DIR, stateSlug);
    fs.mkdirSync(stateDir, { recursive: true });
    sitemapUrls.push(`${SITE_ORIGIN}/standards/${stateSlug}/`);

    const subjects = byState[state];
    const subjectListHtml = Object.keys(subjects).sort().map(subject => {
      const count = subjects[subject].length;
      return `<li><a href="/standards/${stateSlug}/${slugify(subject)}/">${subject}</a> — ${count} grade/topic sets</li>`;
    }).join("");

    fs.writeFileSync(path.join(stateDir, "index.html"), pageShell({
      title: `${state} Academic Standards by Subject | TeacherAssist.ai`,
      description: `Browse ${state}'s K-12 academic standards, organized by subject and grade — free reference for teachers.`,
      canonical: `${SITE_ORIGIN}/standards/${stateSlug}/`,
      breadcrumb: `<a href="/">Home</a> / <a href="/standards/">Standards</a> / ${state}`,
      body: `
        <h1>${state} Academic Standards</h1>
        <p class="subtitle">Choose a subject to see available grades and topics.</p>
        <ul class="plain-list">${subjectListHtml}</ul>
      `
    }));

    for (const subject of Object.keys(subjects)) {
      const subjectSlug = slugify(subject);
      const subjectDir = path.join(stateDir, subjectSlug);
      fs.mkdirSync(subjectDir, { recursive: true });
      sitemapUrls.push(`${SITE_ORIGIN}/standards/${stateSlug}/${subjectSlug}/`);

      const sets = subjects[subject].sort((a, b) =>
        (a.gradeBand || "").localeCompare(b.gradeBand || "", undefined, { numeric: true })
      );

      const gradeListHtml = sets.map(s => {
        const gradeSlug = slugify(s.gradeBand || s.id);
        return `<li><a href="/standards/${stateSlug}/${subjectSlug}/${gradeSlug}.html">${s.gradeBand || s.displayName}</a> — ${s.standardCount} standards</li>`;
      }).join("");

      const searchIndexUrl = `/standards/${stateSlug}/${subjectSlug}/search-index.json`;
      const subjectSearchIndex = [];

      fs.writeFileSync(path.join(subjectDir, "index.html"), pageShell({
        title: `${state} ${subject} Standards — All Grades | TeacherAssist.ai`,
        description: `Every ${state} ${subject} standard, organized by grade — free, searchable reference for teachers.`,
        canonical: `${SITE_ORIGIN}/standards/${stateSlug}/${subjectSlug}/`,
        breadcrumb: `<a href="/">Home</a> / <a href="/standards/">Standards</a> / <a href="/standards/${stateSlug}/">${state}</a> / ${subject}`,
        body: `
          <h1>${state} ${subject} Standards</h1>
          <p class="subtitle">Search across every grade at once, or choose one below.</p>
          <input type="text" id="subjectSearch" placeholder="Search any ${subject} topic, e.g. 'ratios' or 'photosynthesis'…"
                 style="width:100%; padding:11px 14px; border:1px solid var(--border); border-radius:8px; font-size:0.9rem; margin-bottom:8px;" />
          <div id="subjectSearchResults" style="display:none; margin-bottom:20px;"></div>
          <ul class="plain-list">${gradeListHtml}</ul>
          ${SUBJECT_SEARCH_SCRIPT(searchIndexUrl)}
        `
      }));

      // ── Individual grade/topic pages — fetch full content ──
      for (const s of sets) {
        const gradeSlug = slugify(s.gradeBand || s.id);
        console.log(`  Building ${state} / ${subject} / ${s.gradeBand}…`);

        let full;
        try {
          full = await fetchJson(`${API_BASE}/api/public/standards/${s.id}`);
        } catch (err) {
          console.warn(`  ⚠️ Skipped ${s.id}: ${err.message}`);
          continue;
        }

        const pageUrl = `${SITE_ORIGIN}/standards/${stateSlug}/${subjectSlug}/${gradeSlug}.html`;
        sitemapUrls.push(pageUrl);

        fs.writeFileSync(path.join(subjectDir, `${gradeSlug}.html`), pageShell({
          title: `${s.displayName} | Free Standards Reference | TeacherAssist.ai`,
          description: `${s.displayName} — ${s.standardCount} standards, fully searchable, free. No signup required.`,
          canonical: pageUrl,
          breadcrumb: `<a href="/">Home</a> / <a href="/standards/">Standards</a> / <a href="/standards/${stateSlug}/">${state}</a> / <a href="/standards/${stateSlug}/${subjectSlug}/">${subject}</a> / ${s.gradeBand}`,
          body: `
            <h1>${s.displayName}</h1>
            <p class="subtitle">${s.standardCount} standards in this set. Click any domain to expand.</p>
            <div class="cta-box">
              Want a free lesson built around one of these standards?
              <br><a href="/quick-lesson.html?set=${encodeURIComponent(s.id)}">Build a Free Lesson →</a>
            </div>
            <input type="text" id="pageSearch" placeholder="Filter these ${s.standardCount} standards by keyword or ID…"
                   style="width:100%; padding:11px 14px; border:1px solid var(--border); border-radius:8px; font-size:0.9rem; margin-bottom:18px;" />
            ${renderDomainSections(full.standards)}
            ${IN_PAGE_SEARCH_SCRIPT}
          `
        }));

        // accumulate into this subject's cross-grade search index
        (full.standards || []).forEach(std => {
          subjectSearchIndex.push({
            standardId: std.standardId,
            domain: std.domain || "",
            skill: std.skill || "",
            description: std.description || "",
            gradeBand: s.gradeBand || s.displayName,
            pageUrl: `/standards/${stateSlug}/${subjectSlug}/${gradeSlug}.html`
          });
        });
      }

      fs.writeFileSync(path.join(subjectDir, "search-index.json"), JSON.stringify(subjectSearchIndex));
    }
  }

  // ── Sitemap ──
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map(u => `  <url><loc>${u}</loc></url>`).join("\n")}
</urlset>`;
  fs.writeFileSync("./sitemap-standards.xml", sitemapXml);

  console.log(`\nDone. Generated ${sitemapUrls.length} pages into ${OUTPUT_DIR}/`);
  console.log(`Sitemap written to ./sitemap-standards.xml — merge its <url> entries into your main sitemap.xml.`);
}

main().catch(err => {
  console.error("Build failed:", err);
  process.exit(1);
});