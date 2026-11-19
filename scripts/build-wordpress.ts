// Assembles dist-wordpress/wordpress-block.html: the map as one block of HTML
// to paste into the classic editor's "Code" tab of a WordPress page. Runs
// after `vite build --mode wordpress` (npm run build:wordpress).
//
// Paste safety: WordPress filters post content before showing it. wpautop
// adds <p>/<br> at blank lines and line breaks, wptexturize curls quotes, and
// do_shortcode replaces any [name] that matches a registered shortcode, even
// inside <script>. So the app (JavaScript, CSS, and course data) travels as
// gzip + base64: one line of A–Z, a–z, 0–9, "+", "/" and "=", which none of
// those filters touch. A short loader decodes it with the browser's own
// DecompressionStream (no network request) and runs it. The checks below
// stop the build if anything unsafe gets into the block.
//
// Node runs this file directly (type stripping), so use only TypeScript that
// erases to plain JavaScript.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { gzipSync } from 'node:zlib'

const root = join(import.meta.dirname, '..')
const buildDir = join(root, 'dist-wordpress/build')
const outDir = join(root, 'dist-wordpress')
const blockPath = join(outDir, 'wordpress-block.html')
const testTemplate = join(root, 'docs/wordpress-test.html')
const testPath = join(outDir, 'wordpress-test.html')

const MOUNT_ID = 'cse-prereq-map' // src/embed.tsx
const TEXT_LINK_ID = 'cse-prereq-map-text' // src/embed.tsx

// The wrapper the Peer Advisers designed; [MAP GOES HERE] is replaced below.
const WRAPPER = `<section aria-labelledby="prereq-map-heading" style="background:#f7f5fb; border:1px solid #e0dcea; border-top:4px solid #b7a57a; border-radius:12px; padding:40px; margin:32px 0;">
  <h2 id="prereq-map-heading" style="color:#4b2e83; margin-top:0;">CSE Course Prerequisite Map</h2>
  <p style="font-size:1.15em; color:#1a1a1a; max-width:800px;">See how CSE courses connect. Search for a course to find out what you need to take first and what it leads to next.</p>
  <h3 style="color:#1a1a1a;">How to use the map</h3>
  <ol role="list" style="list-style:none; padding:0; margin:0 0 24px; display:flex; flex-wrap:wrap; gap:24px;">
    <li style="flex:1 1 220px; display:flex; gap:14px;"><span aria-hidden="true" style="flex:0 0 32px; height:32px; border-radius:50%; background:#4b2e83; color:#fff; font-weight:700; display:flex; align-items:center; justify-content:center;">1</span><span><strong>Search for a course</strong> by number or title (like 332 or Data Structures and Parallelism), or select any course on the map.</span></li>
    <li style="flex:1 1 220px; display:flex; gap:14px;"><span aria-hidden="true" style="flex:0 0 32px; height:32px; border-radius:50%; background:#4b2e83; color:#fff; font-weight:700; display:flex; align-items:center; justify-content:center;">2</span><span><strong>See its path:</strong> prerequisites appear on the left, and the courses it leads to appear on the right.</span></li>
    <li style="flex:1 1 220px; display:flex; gap:14px;"><span aria-hidden="true" style="flex:0 0 32px; height:32px; border-radius:50%; background:#4b2e83; color:#fff; font-weight:700; display:flex; align-items:center; justify-content:center;">3</span><span><strong>Read the lines:</strong> a solid line means required, dashed lines into a "1 of 2" box mean choose one, and "≥ 2.0" is the minimum grade.</span></li>
    <li style="flex:1 1 220px; display:flex; gap:14px;"><span aria-hidden="true" style="flex:0 0 32px; height:32px; border-radius:50%; background:#4b2e83; color:#fff; font-weight:700; display:flex; align-items:center; justify-content:center;">4</span><span><strong>Pick your degree</strong> (CS, CS: Data Science, or CE) to see which courses are required and which count as electives.</span></li>
  </ol>
  <p style="color:#595959; max-width:800px;">This map is a planning aid made by Allen School Peer Advisers. Always confirm requirements in the UW Course Catalog and your MyPlan degree audit.</p>
  [MAP GOES HERE]
</section>`

// 1. The app: JavaScript with the CSS inlined as a string (src/wordpress.tsx reads CSE_MAP_CSS).
const js = readFileSync(join(buildDir, 'map.js'), 'utf8')
// rem would follow the theme's root font size (often 62.5%), so use px.
const css = readFileSync(join(buildDir, 'map.css'), 'utf8').replace(
  /(\d*\.?\d+)rem\b/g,
  (_, n: string) => `${Number((Number(n) * 16).toFixed(3))}px`,
)
const app = `(function(){var CSE_MAP_CSS=${JSON.stringify(css)};\n${js}\n})();`

// 2. gzip + base64, and a loader that only uses characters WordPress leaves
//    alone (no &, <, [, or quotes it could curl).
const payload = gzipSync(Buffer.from(app, 'utf8'), { level: 9 }).toString('base64')
const loader =
  '(function(){' +
  `var host=document.getElementById("${MOUNT_ID}");` +
  'if(!host)return;' +
  'if(!window.DecompressionStream){host.textContent="The interactive map needs a newer browser. Use the course list link below.";return}' +
  `var b="${payload}";` +
  'var bytes=Uint8Array.from(atob(b),function(c){return c.charCodeAt(0)});' +
  'new Response(new Response(bytes).body.pipeThrough(new DecompressionStream("gzip"))).text().then(function(code){' +
  'var s=document.createElement("script");s.textContent=code;document.body.appendChild(s)' +
  '})' +
  '})();'

// 3. The block: skip link, mount point, text link (the skip link's target), script.
const map = [
  `<p style="margin:0 0 8px;"><a href="#${TEXT_LINK_ID}">Skip the interactive map</a></p>`,
  `<div id="${MOUNT_ID}"></div>`,
  `<p style="margin:12px 0 0;"><a id="${TEXT_LINK_ID}" href="?view=list">View the course list as text</a></p>`,
  `<script>${loader}</script>`,
].join('\n  ')
const block = `${WRAPPER.replace('[MAP GOES HERE]', map)}\n`

// 4. Paste-safety checks: stop the build rather than write something WordPress could break.
const script = loader
const problems: string[] = []
if (/\n\s*\n/.test(block)) problems.push('a blank line (wpautop would add <p> tags)')
if (block.includes('<!--')) problems.push('an HTML comment')
if ((block.match(/<script/gi) ?? []).length !== 1) problems.push('more or fewer than one <script>')
if (/[^\x20-\x7e]/.test(script)) problems.push('a non-ASCII character or line break in the script')
if (/<\/script/i.test(script) || script.includes('<')) problems.push('"<" inside the script')
if (/[[\]]/.test(script)) problems.push('"[" or "]" inside the script (a shortcode could match)')
if (script.includes('&')) problems.push('an "&" inside the script')
if (!/^[A-Za-z0-9+/=]+$/.test(payload)) problems.push('a payload character outside base64')
if (problems.length) {
  console.error(`build-wordpress: not written. The block contains ${problems.join('; ')}.`)
  process.exit(1)
}

mkdirSync(outDir, { recursive: true })
writeFileSync(blockPath, block)

// 5. A test page: the block inside a page styled like a WordPress theme.
const template = readFileSync(testTemplate, 'utf8')
if (template.split('{{WORDPRESS_BLOCK}}').length !== 2) {
  console.error('build-wordpress: docs/wordpress-test.html must contain the {{WORDPRESS_BLOCK}} marker exactly once.')
  process.exit(1)
}
writeFileSync(testPath, template.replace('{{WORDPRESS_BLOCK}}', () => block))

const kb = (n: number) => `${(n / 1024).toFixed(0)} KB`
console.log(
  `build-wordpress: wrote ${relative(root, blockPath)} (${kb(Buffer.byteLength(block))}; ` +
    `app ${kb(Buffer.byteLength(app))} before gzip, ${kb(payload.length)} as base64) and ${relative(root, testPath)}`,
)
