import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer";

// Every CV is a top-level .html file, so pick them all up instead of keeping a list
const HTML_FILES = (await readdir(".")).filter((f) => extname(f) === ".html" && !f.startsWith(".")).sort();

// The phone number is kept out of the repo: it comes from CV_PHONE (a GitHub Actions
// secret in CI, a gitignored .env locally) and replaces the {{PHONE}} placeholders
try {
  process.loadEnvFile();
} catch {}
const phone = process.env.CV_PHONE;
if (!phone) throw new Error('CV_PHONE is not set (e.g. CV_PHONE="+45 12 34 56 78" in .env)');
const fillPlaceholders = (html) =>
  html
    .replaceAll("{{PHONE_TEL}}", phone.replace(/[^+\d]/g, ""))
    .replaceAll("{{PHONE}}", phone);

const outDir = resolve(process.argv[2] ?? "dist");
await mkdir(outDir, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
});

try {
  for (const file of HTML_FILES) {
    // Render a filled-in copy next to the original so relative assets still resolve
    const built = resolve(`.build-${file}`);
    await writeFile(built, fillPlaceholders(await readFile(file, "utf8")));

    const page = await browser.newPage();
    // The pages pull Tailwind, Font Awesome and Google Fonts from CDNs, so wait
    // for the network to settle and for the webfonts to actually be ready
    await page.goto(pathToFileURL(built).href, {
      waitUntil: "networkidle0",
      timeout: 60_000,
    });
    await page.evaluate(() => document.fonts.ready);

    const pdf = `${basename(file, extname(file))}.pdf`;
    await page.pdf({
      path: resolve(outDir, pdf),
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    console.log(`${file} -> ${pdf}`);
    await page.close();
    await rm(built);
  }
} finally {
  await browser.close();
}
