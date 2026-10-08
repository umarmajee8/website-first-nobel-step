import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const production = process.argv.includes('--dist');
const root = new URL(production ? './dist/' : './', import.meta.url);
const assets = production ? root : new URL('./public/', root);
const origin = 'https://firstnoblestep.com';
const read = (base, file) => fs.readFileSync(new URL(file, base), 'utf8');
const normalizedText = element => element.textContent.replace(/\s+/g, ' ').trim();
const pngSize = file => {
  const image = fs.readFileSync(new URL(file, assets));
  assert.deepEqual(image.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), `${file} must be a valid PNG, not HTML or corrupted text`);
  assert.equal(image.subarray(12, 16).toString(), 'IHDR', `${file} must contain a PNG header`);
  return { width: image.readUInt32BE(16), height: image.readUInt32BE(20) };
};
const content = (document, attribute, name) => {
  const elements = document.querySelectorAll(`meta[${attribute}="${name}"]`);
  assert.equal(elements.length, 1, `${name} must occur exactly once`);
  return elements[0].getAttribute('content');
};

const pages = [
  ['index.html', root, `${origin}/`],
  ['privacy-policy.html', assets, `${origin}/privacy-policy.html`],
  ['terms-and-conditions.html', assets, `${origin}/terms-and-conditions.html`],
];
const titles = new Set();
for (const [file, directory, canonical] of pages) {
  const dom = new JSDOM(read(directory, file));
  const { document } = dom.window;
  const title = document.title;
  assert.equal(document.querySelectorAll('title').length, 1);
  assert(title.length > 10 && title.length <= 65, `${file} needs a concise title`);
  assert(!titles.has(title), `${file} needs a unique title`);
  titles.add(title);
  const description = content(document, 'name', 'description');
  assert(description.length >= 100 && description.length <= 160, `${file} needs a useful description`);
  assert.equal(document.querySelectorAll('link[rel="canonical"]').length, 1);
  assert.equal(document.querySelector('link[rel="canonical"]').getAttribute('href'), canonical);
  assert.equal(content(document, 'name', 'robots'), 'index, follow, max-image-preview:large');
  assert.equal(content(document, 'property', 'og:title'), title);
  assert.equal(content(document, 'property', 'og:description'), description);
  assert.equal(content(document, 'property', 'og:url'), canonical);
  assert.equal(content(document, 'property', 'og:site_name'), 'First Noble Step');
  assert.equal(content(document, 'property', 'og:type'), 'website');
  assert.equal(content(document, 'property', 'og:image'), `${origin}/social-preview.png`);
  assert.equal(content(document, 'property', 'og:image:type'), 'image/png');
  assert.equal(content(document, 'property', 'og:image:width'), '1200');
  assert.equal(content(document, 'property', 'og:image:height'), '630');
  assert.match(content(document, 'property', 'og:image:alt'), /SECP and FBR/);
  assert.equal(content(document, 'name', 'twitter:card'), 'summary_large_image');
  assert.equal(content(document, 'name', 'twitter:title'), title);
  assert.equal(content(document, 'name', 'twitter:description'), description);
  assert.equal(content(document, 'name', 'twitter:image'), `${origin}/social-preview.png`);
  assert.equal(content(document, 'name', 'twitter:image:alt'), content(document, 'property', 'og:image:alt'));
  assert.equal(document.querySelector('link[rel="icon"]').getAttribute('href'), '/favicon.png');
  console.log(`PASS: ${file} has unique metadata, a production canonical URL, and valid social-preview tags`);
  dom.window.close();
}

const html = read(root, 'index.html');
const home = new JSDOM(html);
const { document } = home.window;
assert.match(document.title, /SECP & FBR Registered Company/);
assert.match(content(document, 'name', 'description'), /registered with SECP and FBR in Pakistan/);
assert.equal(document.querySelectorAll('h1').length, 1, 'homepage needs one primary heading');
assert.equal(normalizedText(document.getElementById('company-registration-status')), 'SECP & FBR Registered');
const registrationText = normalizedText(document.getElementById('company-registration'));
assert.match(registrationText, /registered with the Securities and Exchange Commission of Pakistan \(SECP\) and the Federal Board of Revenue \(FBR\)/);
assert(!document.getElementById('company-registration').classList.contains('hidden'), 'registration details must be visible to visitors, not just crawlers');
console.log('PASS: SECP and FBR registration appears in the search metadata and visible company information');

const scripts = document.querySelectorAll('script[type="application/ld+json"]');
assert.equal(scripts.length, 1);
const schema = JSON.parse(scripts[0].textContent);
assert.equal(schema['@context'], 'https://schema.org');
const organization = schema['@graph'].find(entry => entry['@type'] === 'Organization');
const website = schema['@graph'].find(entry => entry['@type'] === 'WebSite');
const webpage = schema['@graph'].find(entry => entry['@type'] === 'WebPage');
assert.equal(organization['@id'], `${origin}/#organization`);
assert.equal(organization.legalName, 'First Noble Step (Private) Limited');
assert.equal(organization.url, `${origin}/`);
assert.equal(organization.description, registrationText);
assert.equal(organization.logo.url, `${origin}/brand-logo.png`);
assert.deepEqual(pngSize('brand-logo.png'), { width: organization.logo.width, height: organization.logo.height });
assert.equal(organization.address.addressLocality, 'Lahore');
assert.equal(organization.address.addressCountry, 'PK');
assert.equal(organization.telephone, '+923332288877');
assert.equal(organization.email, 'support@firstnoblestep.com');
assert.equal(organization.parentOrganization.name, 'UN33B GROUP OF COMPANIES');
assert.equal(website.publisher['@id'], organization['@id']);
assert.equal(webpage.isPartOf['@id'], website['@id']);
assert.equal(webpage.about['@id'], organization['@id']);
assert.equal(webpage.name, document.title);
assert.equal(webpage.description, content(document, 'name', 'description'));
console.log('PASS: linked Organization, WebSite, and WebPage structured data matches the real site content');

assert.deepEqual(pngSize('social-preview.png'), { width: 1200, height: 630 });
assert.deepEqual(pngSize('favicon.png'), { width: 192, height: 192 });
assert(!html.includes('data:image/png;base64,'), 'large duplicated base64 logos must be replaced with cacheable assets');
const logos = document.querySelectorAll('img[src="/brand-logo.png"]');
assert.equal(logos.length, 2);
for (const logo of logos) {
  assert.equal(logo.getAttribute('width'), '266');
  assert.equal(logo.getAttribute('height'), '370');
  assert.match(logo.alt, /First Noble Step/);
}
assert.equal(logos[1].getAttribute('loading'), 'lazy');
console.log('PASS: social image, square favicon, and cacheable company logos are valid and dimensioned');
home.window.close();

const sitemap = new JSDOM(read(assets, 'sitemap.xml'), { contentType: 'application/xml' });
assert.equal(sitemap.window.document.documentElement.namespaceURI, 'http://www.sitemaps.org/schemas/sitemap/0.9');
const urls = [...sitemap.window.document.querySelectorAll('loc')].map(element => element.textContent);
assert.deepEqual(new Set(urls), new Set(pages.map(([, , canonical]) => canonical)));
assert.equal(urls.length, new Set(urls).size);
for (const date of sitemap.window.document.querySelectorAll('lastmod')) assert.match(date.textContent, /^\d{4}-\d{2}-\d{2}$/);
sitemap.window.close();
const robots = read(assets, 'robots.txt');
assert.match(robots, /User-agent: \*/);
assert.match(robots, /Allow: \/\s/);
assert.match(robots, /Disallow: \/api\//);
assert.match(robots, /Sitemap: https:\/\/firstnoblestep\.com\/sitemap\.xml/);
assert(!/Disallow: \/(?:payment|marketing-email)\.html/.test(robots), 'crawlers must be able to read the noindex tags');
for (const file of ['payment.html', 'marketing-email.html']) {
  const dom = new JSDOM(read(assets, file));
  assert.equal(content(dom.window.document, 'name', 'robots'), 'noindex, follow');
  assert(!urls.includes(`${origin}/${file}`));
  dom.window.close();
}
console.log('PASS: sitemap lists public content, robots permits crawling, and payment/email templates are noindex');

if (!production) {
  const metadata = JSON.parse(read(root, 'metadata.json'));
  assert.equal(metadata.name, 'First Noble Step');
  assert.match(metadata.description, /SECP and FBR/);
}
console.log(`SEO TEST DONE (${production ? 'production build' : 'source'})`);
