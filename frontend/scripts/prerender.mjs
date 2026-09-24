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
const productionHost = process.env.SITE_URL || fileEnv.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
if (!productionHost) throw new Error('Set SITE_URL or VERCEL_PROJECT_PRODUCTION_URL before building.');
const siteUrl = new URL(productionHost);
if (siteUrl.protocol !== 'https:' || siteUrl.pathname !== '/' || siteUrl.search || siteUrl.hash) {
  throw new Error('SITE_URL must be an HTTPS origin without a path, query, or fragment.');
}
const apiBaseUrl = process.env.VITE_API_BASE_URL || fileEnv.VITE_API_BASE_URL;
if (!apiBaseUrl || !/^https:\/\/[^/]+\/?$/.test(apiBaseUrl)) {
  throw new Error('Set VITE_API_BASE_URL to the Render HTTPS origin before building.');
}

const preview = process.env.VERCEL_ENV === 'preview';
const escapeXml = (value) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const template = await fs.readFile(path.join(distDir, 'index.html'), 'utf8');
const vite = await createServer({ root: projectDir, server: { middlewareMode: true }, appType: 'custom' });

try {
  const { AppContent } = await vite.ssrLoadModule('/src/App.jsx');
  const pages = [
    { route: '/', file: path.join(distDir, 'index.html'), title: 'India LGD Index — free keyless administrative API', description: 'Look up Indian states, districts, sub-districts and development blocks by LGD code through a free, keyless JSON API.' },
    { route: '/docs', file: path.join(distDir, 'docs', 'index.html'), title: 'API documentation — India LGD Index', description: 'Developer reference for five keyless India LGD endpoints, filters, errors, rate limits and data attribution.' },
  ];
  for (const page of pages) {
    const body = renderToString(React.createElement(MemoryRouter, { initialEntries: [page.route] }, React.createElement(AppContent)));
    if (!body.includes('<h1')) throw new Error(`No rendered heading for ${page.route}`);
    const canonical = new URL(page.route, siteUrl).href;
    const html = template
      .replace('<div id="root"></div>', `<div id="root">${body}</div>`)
      .replace(/<title>[^<]*<\/title>/, `<title>${escapeXml(page.title)}</title>`)
      .replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${escapeXml(page.description)}" />`)
      .replace('</head>', `${preview ? '    <meta name="robots" content="noindex, nofollow" />\n' : `    <link rel="canonical" href="${escapeXml(canonical)}" />\n`}</head>`);
    await fs.mkdir(path.dirname(page.file), { recursive: true });
    await fs.writeFile(page.file, html);
  }
  const spa = template
    .replace(/<title>[^<]*<\/title>/, '<title>India LGD Index — interactive tools</title>')
    .replace('</head>', '    <meta name="robots" content="noindex, nofollow" />\n</head>');
  await fs.writeFile(path.join(distDir, 'spa.html'), spa);
  await fs.writeFile(path.join(distDir, 'robots.txt'), preview ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\nSitemap: ${siteUrl.href}sitemap.xml\n`);
  if (!preview) {
    const entries = pages.map((page) => `  <url><loc>${escapeXml(new URL(page.route, siteUrl).href)}</loc></url>`).join('\n');
    await fs.writeFile(path.join(distDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`);
  }
  console.log('Prerendered / and /docs; generated SPA fallback, robots, and sitemap.');
} finally {
  await vite.close();
}
