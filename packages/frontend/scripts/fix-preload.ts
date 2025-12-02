/**
 * Post-build script to fix invalid preload 'as' attribute
 *
 * Waku generates `<link rel="preload" as="stylesheet">` but the correct value
 * should be `as="style"` per W3C spec. This script fixes all generated HTML files.
 *
 * See: https://github.com/vercel/next.js/issues/84569
 */

import { Glob } from "bun";
import { readFile, writeFile } from "node:fs/promises";

const glob = new Glob("**/*.html");
const distDir = new URL("../dist", import.meta.url).pathname;

let fixedCount = 0;

for await (const file of glob.scan(distDir)) {
  const filePath = `${distDir}/${file}`;
  const content = await readFile(filePath, "utf-8");

  // Fix as="stylesheet" to as="style" for preload links
  const fixed = content.replace(
    /<link rel="preload"([^>]*) as="stylesheet"/g,
    '<link rel="preload"$1 as="style"'
  );

  if (fixed !== content) {
    await writeFile(filePath, fixed, "utf-8");
    fixedCount++;
    console.log(`Fixed: ${file}`);
  }
}

console.log(`\nFixed ${fixedCount} HTML file(s)`);
