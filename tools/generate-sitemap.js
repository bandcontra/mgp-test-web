#!/usr/bin/env node
// Run: node tools/generate-sitemap.js
// Requires: REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in my-app/.env.local
// Writes: my-app/public/sitemap.xml

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../my-app/.env.local') });

const url = process.env.REACT_APP_SUPABASE_URL;
const key = process.env.REACT_APP_SUPABASE_ANON_KEY;
const BASE_URL = 'https://mgp.ge';

if (!url || !key) {
  console.error('Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

async function generate() {
  const { data: products, error } = await supabase
    .from('products')
    .select('id')
    .order('id', { ascending: true });

  if (error) {
    console.error('Supabase error:', error.message);
    process.exit(1);
  }

  const staticPages = [
    { loc: `${BASE_URL}/`, changefreq: 'weekly', priority: '1.0' },
    { loc: `${BASE_URL}/catalog`, changefreq: 'daily', priority: '0.9' },
    { loc: `${BASE_URL}/contact`, changefreq: 'monthly', priority: '0.6' },
  ];

  const productPages = products.map(p => ({
    loc: `${BASE_URL}/product/${p.id}`,
    changefreq: 'weekly',
    priority: '0.8',
  }));

  const allPages = [...staticPages, ...productPages];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(p => `  <url>
    <loc>${p.loc}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

  const outPath = path.join(__dirname, '../my-app/public/sitemap.xml');
  fs.writeFileSync(outPath, xml, 'utf8');
  console.log(`Sitemap written: ${allPages.length} URLs (${products.length} products)`);
}

generate();
