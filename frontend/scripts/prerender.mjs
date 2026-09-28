import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer, loadEnv } from 'vite';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(projectDir, 'dist');
const fileEnv = loadEnv('production', projectDir, '');
const productionHost = process.env.SITE_URL || fileEnv.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) || 'https://india-lgd-index-api.vercel.app';
if (!productionHost) throw new Error('Set SITE_URL or VERCEL_PROJECT_PRODUCTION_URL before building.');
const siteUrl = new URL(productionHost);
if (siteUrl.protocol !== 'https:' || siteUrl.pathname !== '/' || siteUrl.search || siteUrl.hash) {
  throw new Error('SITE_URL must be an HTTPS origin without a path, query, or fragment.');
}
const apiBaseUrl = process.env.VITE_API_BASE_URL || fileEnv.VITE_API_BASE_URL || siteUrl.origin;
if (!apiBaseUrl || !/^https:\/\/[^/]+\/?$/.test(apiBaseUrl)) {
  throw new Error('Set VITE_API_BASE_URL to an HTTPS API origin before building.');
}
process.env.VITE_API_BASE_URL = apiBaseUrl;

const preview = process.env.VERCEL_ENV === 'preview';
const escapeXml = (value) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const template = await fs.readFile(path.join(distDir, 'index.html'), 'utf8');
const vite = await createServer({ root: projectDir, server: { middlewareMode: true }, appType: 'custom', mode: 'production' });

try {
  const { AppContent } = await vite.ssrLoadModule('/src/App.jsx');
  const { LGD_GUIDES } = await vite.ssrLoadModule('/src/content/guidesData.js');
  const mainPages = [
    { route: '/', file: path.join(distDir, 'index.html'), title: 'India LGD Index — free keyless administrative API', description: 'Look up Indian states, districts, sub-districts and development blocks by LGD code through a free, keyless JSON API.' },
    { route: '/docs', file: path.join(distDir, 'docs', 'index.html'), title: 'API documentation — India LGD Index', description: 'Developer reference for five keyless India LGD endpoints, filters, errors, rate limits and data attribution.' },
    { route: '/guides', file: path.join(distDir, 'guides', 'index.html'), title: 'Technical Guides & SEO Reference — India LGD Index', description: 'Authoritative developer guides for India Local Government Directory, Census mappings, and KYC address verification.' },
  ];
  const guidePages = LGD_GUIDES.map((g) => ({
    route: `/guides/${g.id}`,
    file: path.join(distDir, 'guides', g.id, 'index.html'),
    title: `${g.title} — India LGD Index`,
    description: g.summary,
  }));
  const pages = [...mainPages, ...guidePages];
  for (const page of pages) {
    const body = renderToString(React.createElement(MemoryRouter, { initialEntries: [page.route] }, React.createElement(AppContent)));
    if (!body.includes('<h1')) throw new Error(`No rendered heading for ${page.route}`);
    const canonical = new URL(page.route, siteUrl).href;
    let html = template
      .replace('<div id="root"></div>', `<div id="root">${body}</div>`)
      .replace(/<title>[^<]*<\/title>/, `<title>${escapeXml(page.title)}</title>`)
      .replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${escapeXml(page.description)}" />`)
      .replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, preview ? '' : `<link rel="canonical" href="${escapeXml(canonical)}" />`)
      .replace(/<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${escapeXml(canonical)}" />`);
    if (preview) {
      html = html.replace('</head>', '    <meta name="robots" content="noindex, nofollow" />\n</head>');
    }
    await fs.mkdir(path.dirname(page.file), { recursive: true });
    await fs.writeFile(page.file, html);
  }
  const spa = template
    .replace(/<title>[^<]*<\/title>/, '<title>India LGD Index — interactive tools</title>')
    .replace('</head>', '    <meta name="robots" content="noindex, nofollow" />\n</head>');
  await fs.writeFile(path.join(distDir, 'spa.html'), spa);
  await fs.writeFile(path.join(distDir, 'robots.txt'), preview ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl.href}sitemap.xml\n`);
  if (preview) {
    // Vite copies public/sitemap.xml into dist before prerendering.
    await fs.rm(path.join(distDir, 'sitemap.xml'), { force: true });
  } else {
    const sitemapEntries = pages.map((page) => {
      const loc = new URL(page.route, siteUrl).href;
      const priority = page.route === '/' ? '1.0' : page.route.startsWith('/guides/') ? '0.8' : '0.9';
      return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>2026-09-27</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
    }).join('\n');
    await fs.writeFile(path.join(distDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</urlset>\n`);
  }
  console.log(`Prerendered /, /docs, and /guides; generated SPA fallback, robots${preview ? '' : ', and sitemap'}.`);
} finally {
  await vite.close();
}
