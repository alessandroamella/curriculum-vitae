import { mkdir } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer";

const HTML_FILES = [
  "cv-alessandro-amella.html",
  "en.html",
  "en-aarhus.html",
  "en-aarhus-student.html",
];

const outDir = resolve(process.argv[2] ?? "dist");
await mkdir(outDir, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
});

try {
  for (const file of HTML_FILES) {
    const page = await browser.newPage();
    // The pages pull Tailwind, Font Awesome and Google Fonts from CDNs, so wait
    // for the network to settle and for the webfonts to actually be ready
    await page.goto(pathToFileURL(resolve(file)).href, {
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
  }
} finally {
  await browser.close();
}
