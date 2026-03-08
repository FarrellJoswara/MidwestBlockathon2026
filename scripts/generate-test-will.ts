/**
 * ─────────────────────────────────────────────────────────────────────
 *  Generate a test will PDF for local development
 * ─────────────────────────────────────────────────────────────────────
 *
 *  Usage:
 *    npx tsx scripts/generate-test-will.ts
 *
 *  Output:
 *    scripts/test_will.pdf
 * ─────────────────────────────────────────────────────────────────────
 */

import PDFDocument from "pdfkit";
import { createWriteStream } from "fs";
import { resolve } from "path";

const OUTPUT_PATH = resolve(__dirname, "test_will.pdf");

function generateTestWill() {
  const doc = new PDFDocument({ margin: 60, size: "LETTER" });
  const stream = createWriteStream(OUTPUT_PATH);
  doc.pipe(stream);

  // ── Title ────────────────────────────────────────────────────────────
  doc
    .fontSize(22)
    .font("Helvetica-Bold")
    .text("LAST WILL AND TESTAMENT", { align: "center" })
    .moveDown(0.5);

  doc
    .fontSize(12)
    .font("Helvetica")
    .text("of", { align: "center" })
    .moveDown(0.3);

  doc
    .fontSize(16)
    .font("Helvetica-Bold")
    .text("Marcus Anthony Rivera", { align: "center" })
    .moveDown(1.5);

  // ── Preamble ────────────────────────────────────────────────────────
  doc
    .fontSize(11)
    .font("Helvetica")
    .text(
      "I, Marcus Anthony Rivera, of Cook County, Illinois, being of sound mind and memory, " +
        "do hereby declare this instrument to be my Last Will and Testament, revoking all " +
        "previous wills and codicils made by me.",
      { align: "justify" }
    )
    .moveDown(1);

  // ── Article I: Executor ─────────────────────────────────────────────
  doc
    .fontSize(13)
    .font("Helvetica-Bold")
    .text("ARTICLE I — APPOINTMENT OF EXECUTOR")
    .moveDown(0.4);

  doc
    .fontSize(11)
    .font("Helvetica")
    .text(
      "I hereby appoint my trusted friend and attorney, Jasmine Elaine Carter, as the " +
        "Executor of this Will. Should Jasmine Elaine Carter be unable or unwilling to serve, " +
        "I appoint David Michael Ortiz as Alternate Executor.",
      { align: "justify" }
    )
    .moveDown(1);

  // ── Article II: Beneficiaries ───────────────────────────────────────
  doc
    .fontSize(13)
    .font("Helvetica-Bold")
    .text("ARTICLE II — DISTRIBUTION OF ASSETS")
    .moveDown(0.4);

  doc
    .fontSize(11)
    .font("Helvetica")
    .text(
      "I direct that my assets be distributed as follows:",
      { align: "justify" }
    )
    .moveDown(0.5);

  // Beneficiary 1
  doc
    .font("Helvetica-Bold")
    .text("Section 2.1 — Sofia Marie Rivera (Daughter)")
    .font("Helvetica")
    .text(
      "I bequeath to my daughter, Sofia Marie Rivera, the sum of 10,000 dollars " +
        "from my bank account, representing approximately forty percent (40%) " +
        "of my bank account.",
      { align: "justify" }
    )
    .moveDown(0.5);

  // Beneficiary 2
  doc
    .font("Helvetica-Bold")
    .text("Section 2.2 — Elijah James Rivera (Son)")
    .font("Helvetica")
    .text(
      "I bequeath to my son, Elijah James Rivera, my 2016 Honda Accord sedan, " +
        "VIN 1HGBH41JXMN109186, currently registered in the state of Illinois.",
      { align: "justify" }
    )
    .moveDown(0.5);

  // Beneficiary 3
  doc
    .font("Helvetica-Bold")
    .text("Section 2.3 — Angela Denise Rivera (Wife)")
    .font("Helvetica")
    .text(
      "I bequeath to my wife, Angela Denise Rivera, the family residence located " +
        "at 4521 Maple Drive, Evanston, Illinois, along with all furnishings and personal " +
        "property contained therein.",
      { align: "justify" }
    )
    .moveDown(0.5);

  // Beneficiary 4
  doc
    .font("Helvetica-Bold")
    .text("Section 2.4 — Midwest Community Arts Foundation")
    .font("Helvetica")
    .text(
      "I bequeath to the Midwest Community Arts Foundation the sum of $5,000 " +
        "as a charitable donation to support youth arts programming.",
      { align: "justify" }
    )
    .moveDown(1);

  // ── Article III: Conditions ─────────────────────────────────────────
  doc
    .fontSize(13)
    .font("Helvetica-Bold")
    .text("ARTICLE III — CONDITIONS AND PROVISIONS")
    .moveDown(0.4);

  doc
    .fontSize(11)
    .font("Helvetica")
    .text(
      "3.1  All beneficiaries must be of legal age (18 years or older) at the time of " +
        "distribution. If any beneficiary is a minor, their share shall be held in trust " +
        "by the Executor until they reach the age of majority.",
      { align: "justify" }
    )
    .moveDown(0.3);

  doc.text(
    "3.2  The Executor shall distribute all assets within sixty (60) " +
      "days of the declaration of death, subject to completion of all legal requirements.",
    { align: "justify" }
  )
  .moveDown(0.3);

  doc.text(
    "3.3  Should any beneficiary predecease me, their share shall be divided equally " +
      "among the remaining beneficiaries named in this Will.",
    { align: "justify" }
  )
  .moveDown(1);

  // ── Article IV: Additional Instructions ─────────────────────────────
  doc
    .fontSize(13)
    .font("Helvetica-Bold")
    .text("ARTICLE IV — ADDITIONAL INSTRUCTIONS")
    .moveDown(0.4);

  doc
    .fontSize(11)
    .font("Helvetica")
    .text(
      "I request that no extraordinary measures be taken to contest the terms of this Will. " +
        "The Executor has full authority to manage, sell, or transfer any assets as " +
        "necessary to fulfill the distributions specified herein. All fees and costs " +
        "associated with the settlement of this estate shall be deducted from the estate's residual balance.",
      { align: "justify" }
    )
    .moveDown(1.5);

  // ── Signature Block ─────────────────────────────────────────────────
  doc
    .text("IN WITNESS WHEREOF, I have signed this Will on the 7th day of March, 2026.")
    .moveDown(1.5);

  doc
    .text("_________________________________")
    .text("Marcus Anthony Rivera, Testator")
    .moveDown(1);

  doc
    .text("WITNESSES:")
    .moveDown(0.5)
    .text("_________________________________")
    .text("Witness 1: Name and Signature")
    .moveDown(0.5)
    .text("_________________________________")
    .text("Witness 2: Name and Signature");

  doc.end();

  return new Promise<void>((resolve) => {
    stream.on("finish", () => {
      console.log(`✅ Test will PDF generated: ${OUTPUT_PATH}`);
      resolve();
    });
  });
}

generateTestWill().catch(console.error);
