import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PDFDocument, StandardFonts } from "pdf-lib";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FOOTER_LOGO_PATH = path.join(
  __dirname,
  "../assets/logo-splunk-cisco-footer.png"
);

export async function generatePDF(htmlContent, outputPath) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setContent(htmlContent, {
    waitUntil: ["load", "domcontentloaded", "networkidle0"],
  });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: {
      top: "20mm",
      bottom: "20mm",
      left: "20mm",
      right: "20mm",
    },
  });

  await browser.close();

  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];

  const { width } = lastPage.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Optional footer text (uncomment to enable)
  // const footerText = '© 2025 Splunk Education';
  // const fontSize = 10;
  // const textWidth = font.widthOfTextAtSize(footerText, fontSize);
  // lastPage.drawText(footerText, {
  //   x: (width - textWidth) / 2,
  //   y: 20,
  //   size: fontSize,
  //   font,
  //   color: rgb(0.2, 0.2, 0.2),
  // });

  const logoBytes = fs.readFileSync(FOOTER_LOGO_PATH);
  const image = await pdfDoc.embedPng(logoBytes);

  const maxFooterWidth = 481.9; // A4 page width minus margins
  const scale = maxFooterWidth / image.width;
  const pngDims = image.scale(scale);

  lastPage.drawImage(image, {
    x: (width - pngDims.width) / 2,
    y: 40,
    width: pngDims.width,
    height: pngDims.height,
  });

  const finalPdf = await pdfDoc.save();
  fs.writeFileSync(outputPath, finalPdf);
}
