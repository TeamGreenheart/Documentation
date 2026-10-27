#!/usr/bin/env node
/*
 * Builds the documentation site from src/.
 *
 *   node build.js
 *
 * Output:
 *   index.html               the full manual (every section on one page)
 *   <slug>/index.html        one page per entry in PAGES, e.g. customizer/index.html
 *
 * Content lives in src/sections/<section-id>.html, one <section class="doc-section"> per file.
 * Links between sections are written as plain "#id" in the source; the build rewrites them to
 * "../<slug>/#id" when the target lives on a different page.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');

// Folder pages, in menu order. Each page shows one or more sections.
const PAGES = [
  { slug: 'introduction',  title: 'Introduction',      sections: ['introduction'] },
  { slug: 'content-types', title: 'Content Types',     sections: ['content-types'] },
  { slug: 'editor',        title: 'Editor & Blocks',   sections: ['adding-editing', 'block-library'] },
  { slug: 'customizer',    title: 'Customizing Theme', sections: ['customizing-theme'] },
  { slug: 'features',      title: 'Special Features',  sections: ['special-features'] },
  { slug: 'support',       title: 'Support',           sections: ['reporting-issues', 'requesting-features'] },
];

const SITE_TITLE = 'Greenheart Documentation';
const DESCRIPTION = 'User manual for managing the Greenheart Exchange, Greenheart International and Greenheart Travel websites.';

const HERO = `      <header class="manual-hero">
        <p class="eyebrow">Website Manual</p>
        <h1>Greenheart Documentation</h1>
        <p class="lede">How to manage content on the Greenheart Exchange, Greenheart International and Greenheart Travel websites.</p>
      </header>
`;

const CHEVRON = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>';

// ---------- Read sections ----------

const sectionOrder = PAGES.flatMap((p) => p.sections);
const sections = {};
const idToSection = {};
const errors = [];

for (const id of sectionOrder) {
  const file = path.join(SRC, 'sections', id + '.html');
  if (!fs.existsSync(file)) {
    errors.push(`Missing section file: src/sections/${id}.html`);
    continue;
  }
  const html = fs.readFileSync(file, 'utf8');

  const head = html.match(/<section class="doc-section" id="([^"]+)">\s*<h2>([\s\S]*?)<\/h2>/);
  if (!head || head[1] !== id) {
    errors.push(`src/sections/${id}.html must start with <section class="doc-section" id="${id}"><h2>…</h2>`);
    continue;
  }

  const subs = [...html.matchAll(/<div class="doc-sub" id="([^"]+)"([^>]*)>\s*<h3>([\s\S]*?)<\/h3>/g)].map((m) => ({
    id: m[1],
    title: m[3].trim(),
    sites: (m[2].match(/data-sites="([^"]*)"/) || [])[1] || '',
  }));

  sections[id] = {
    id,
    html,
    title: head[2].replace(/<span class="num">[\s\S]*?<\/span>/, '').trim(),
    subs,
  };

  for (const m of html.matchAll(/\sid="([^"]+)"/g)) {
    if (idToSection[m[1]]) errors.push(`Duplicate id "${m[1]}" in ${idToSection[m[1]]} and ${id}`);
    idToSection[m[1]] = id;
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const sectionToSlug = {};
for (const page of PAGES) for (const s of page.sections) sectionToSlug[s] = page.slug;

// ---------- Helpers ----------

// page is null for the full manual at the root.
function href(id, page) {
  if (id === 'top') return '#top';
  const onPage = page ? page.sections.includes(idToSection[id]) : true;
  if (onPage) return '#' + id;
  return (page ? '../' : '') + sectionToSlug[idToSection[id]] + '/#' + id;
}

function rewriteLinks(html, page, sectionId) {
  return html.replace(/href="#([^"]*)"/g, (whole, id) => {
    if (id && id !== 'top' && !idToSection[id]) {
      console.warn(`Warning: link to unknown "#${id}" in src/sections/${sectionId}.html`);
      return whole;
    }
    return id ? `href="${href(id, page)}"` : whole;
  });
}

function indent(html, spaces) {
  const pad = ' '.repeat(spaces);
  return html.replace(/\n$/, '').split('\n').map((l) => (l ? pad + l : l)).join('\n') + '\n';
}

function toc(page) {
  return sectionOrder.map((id) => {
    const s = sections[id];
    const label = s.title;
    let out = `      <li class="toc-section"><div class="toc-row"><a href="${href(id, page)}">${label}</a>`;
    if (s.subs.length) {
      out += `<button class="toc-expand" type="button" aria-expanded="false" aria-label="Show ${label} sub-sections">${CHEVRON}</button>`;
    }
    out += '</div>';
    if (s.subs.length) {
      out += '\n        <ul class="toc-sub">\n';
      out += s.subs.map((sub) =>
        `          <li${sub.sites ? ` data-sites="${sub.sites}"` : ''}><a href="${href(sub.id, page)}">${sub.title}</a></li>`
      ).join('\n');
      out += '\n        </ul>\n      ';
    }
    return out + '</li>';
  }).join('\n');
}

function pagerFor(page) {
  const i = PAGES.indexOf(page);
  const prev = PAGES[i - 1];
  const next = PAGES[i + 1];
  if (!prev && !next) return '';
  return '      <nav class="pager" aria-label="More pages">\n' +
    (prev ? `        <a class="pager-prev" href="../${prev.slug}/"><span>Previous</span>${prev.title}</a>\n` : '') +
    (next ? `        <a class="pager-next" href="../${next.slug}/"><span>Next</span>${next.title}</a>\n` : '') +
    '      </nav>\n';
}

// ---------- Render ----------

const layout = fs.readFileSync(path.join(SRC, 'layout.html'), 'utf8');

function render({ page, title }) {
  const ids = page ? page.sections : sectionOrder;
  const content = ids.map((id) => indent(rewriteLinks(sections[id].html, page, id), 6)).join('\n') +
    (page ? pagerFor(page) : '');
  const vars = {
    title,
    description: DESCRIPTION,
    base: page ? '../' : '',
    home: page ? '../' : './',
    toc: toc(page),
    hero: page ? '' : HERO,
    content,
  };
  return layout.replace(/\{\{(\w+)\}\}/g, (m, key) => (key in vars ? vars[key] : m));
}

fs.writeFileSync(path.join(ROOT, 'index.html'), render({ page: null, title: SITE_TITLE }));
console.log('index.html');

for (const page of PAGES) {
  const dir = path.join(ROOT, page.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), render({ page, title: `${page.title} – ${SITE_TITLE}` }));
  console.log(page.slug + '/index.html');
}
