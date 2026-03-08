/**
 * ─────────────────────────────────────────────────────────────────────
 *  Generate multiple example will PDFs for local development / demos
 * ─────────────────────────────────────────────────────────────────────
 *
 *  Usage:
 *    npx tsx scripts/generate-example-wills.ts
 *
 *  Output:
 *    scripts/example-wills/*.pdf
 * ─────────────────────────────────────────────────────────────────────
 */

import PDFDocument from "pdfkit";
import { createWriteStream, mkdirSync, existsSync } from "fs";
import { resolve } from "path";

const OUT_DIR = resolve(__dirname, "example-wills");

type BeneficiarySection = { title: string; body: string };
type WillConfig = {
  testatorName: string;
  location: string;
  preamble?: string;
  executor: string;
  alternateExecutor?: string;
  beneficiaries: BeneficiarySection[];
  conditions: string[];
  additionalInstructions: string;
  date: string;
  slug: string;
};

function writeWillSection(
  doc: PDFKit.PDFDocument,
  title: string,
  body: string,
  isBoldTitle = true
) {
  if (isBoldTitle) doc.font("Helvetica-Bold");
  doc.text(title).font("Helvetica").text(body, { align: "justify" }).moveDown(0.5);
}

function generateOneWill(config: WillConfig): Promise<string> {
  const outPath = resolve(OUT_DIR, `${config.slug}.pdf`);
  const doc = new PDFDocument({ margin: 60, size: "LETTER" });
  const stream = createWriteStream(outPath);
  doc.pipe(stream);

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
    .text(config.testatorName, { align: "center" })
    .moveDown(1.5);

  const preamble =
    config.preamble ||
    `I, ${config.testatorName}, of ${config.location}, being of sound mind and memory, do hereby declare this instrument to be my Last Will and Testament, revoking all previous wills and codicils made by me.`;
  doc.fontSize(11).font("Helvetica").text(preamble, { align: "justify" }).moveDown(1);

  doc.fontSize(13).font("Helvetica-Bold").text("ARTICLE I — APPOINTMENT OF EXECUTOR").moveDown(0.4);
  const executorText = config.alternateExecutor
    ? `I hereby appoint ${config.executor} as the Executor of this Will. Should ${config.executor} be unable or unwilling to serve, I appoint ${config.alternateExecutor} as Alternate Executor.`
    : `I hereby appoint ${config.executor} as the Executor of this Will.`;
  doc.fontSize(11).font("Helvetica").text(executorText, { align: "justify" }).moveDown(1);

  doc.fontSize(13).font("Helvetica-Bold").text("ARTICLE II — DISTRIBUTION OF ASSETS").moveDown(0.4);
  doc.fontSize(11).font("Helvetica").text("I direct that my assets be distributed as follows:", { align: "justify" }).moveDown(0.5);

  config.beneficiaries.forEach((b) => writeWillSection(doc, b.title + "\n", b.body));

  doc.fontSize(13).font("Helvetica-Bold").text("ARTICLE III — CONDITIONS AND PROVISIONS").moveDown(0.4);
  doc.fontSize(11).font("Helvetica");
  config.conditions.forEach((c) => {
    doc.text(c, { align: "justify" }).moveDown(0.3);
  });
  doc.moveDown(1);

  doc.fontSize(13).font("Helvetica-Bold").text("ARTICLE IV — ADDITIONAL INSTRUCTIONS").moveDown(0.4);
  doc.fontSize(11).font("Helvetica").text(config.additionalInstructions, { align: "justify" }).moveDown(1.5);

  doc.text(`IN WITNESS WHEREOF, I have signed this Will on the ${config.date}.`).moveDown(1.5);
  doc.text("_________________________________").text(`${config.testatorName}, Testator`).moveDown(1);
  doc.text("WITNESSES:").moveDown(0.5).text("_________________________________").text("Witness 1: Name and Signature").moveDown(0.5).text("_________________________________").text("Witness 2: Name and Signature");

  doc.end();

  return new Promise((res, rej) => {
    stream.on("finish", () => res(outPath));
    stream.on("error", rej);
  });
}

const EXAMPLE_WILLS: WillConfig[] = [
  {
    slug: "marcus-rivera",
    testatorName: "Marcus Anthony Rivera",
    location: "Cook County, Illinois",
    executor: "Jasmine Elaine Carter",
    alternateExecutor: "David Michael Ortiz",
    beneficiaries: [
      {
        title: "Section 2.1 — Sofia Marie Rivera (Daughter)",
        body:
          "I bequeath to my daughter, Sofia Marie Rivera, the sum of 10,000 dollars from my bank account, representing approximately forty percent (40%) of my bank account.",
      },
      {
        title: "Section 2.2 — Elijah James Rivera (Son)",
        body:
          "I bequeath to my son, Elijah James Rivera, my 2016 Honda Accord sedan, VIN 1HGBH41JXMN109186, currently registered in the state of Illinois.",
      },
      {
        title: "Section 2.3 — Angela Denise Rivera (Wife)",
        body:
          "I bequeath to my wife, Angela Denise Rivera, the family residence located at 4521 Maple Drive, Evanston, Illinois, along with all furnishings and personal property contained therein.",
      },
      {
        title: "Section 2.4 — Midwest Community Arts Foundation",
        body:
          "I bequeath to the Midwest Community Arts Foundation the sum of $5,000 as a charitable donation to support youth arts programming.",
      },
    ],
    conditions: [
      "3.1  All beneficiaries must be of legal age (18 years or older) at the time of distribution. If any beneficiary is a minor, their share shall be held in trust by the Executor until they reach the age of majority.",
      "3.2  The Executor shall distribute all assets within sixty (60) days of the declaration of death, subject to completion of all legal requirements.",
      "3.3  Should any beneficiary predecease me, their share shall be divided equally among the remaining beneficiaries named in this Will.",
    ],
    additionalInstructions:
      "I request that no extraordinary measures be taken to contest the terms of this Will. The Executor has full authority to manage, sell, or transfer any assets as necessary to fulfill the distributions specified herein. All fees and costs associated with the settlement of this estate shall be deducted from the estate's residual balance.",
    date: "7th day of March, 2026",
  },
  {
    slug: "elizabeth-chen",
    testatorName: "Elizabeth Mei Chen",
    location: "King County, Washington",
    executor: "James Chen",
    alternateExecutor: "Linda Park",
    beneficiaries: [
      {
        title: "Section 2.1 — James Chen (Brother)",
        body:
          "I bequeath to my brother, James Chen, fifty percent (50%) of my investment portfolio and my condominium located at 1800 South Jackson Street, Unit 4B, Seattle, Washington.",
      },
      {
        title: "Section 2.2 — Northwest Animal Rescue",
        body:
          "I bequeath to Northwest Animal Rescue the sum of $15,000 to support their no-kill shelter and adoption programs.",
      },
      {
        title: "Section 2.3 — Emma Chen (Niece)",
        body:
          "I bequeath to my niece, Emma Chen, the sum of $25,000 to be used for her education, and my personal library and art collection.",
      },
    ],
    conditions: [
      "3.1  If my brother James predeceases me, his share shall pass to his daughter Emma Chen.",
      "3.2  Charitable bequests shall be distributed within ninety (90) days of probate.",
      "3.3  The Executor may sell any asset if necessary to satisfy debts or facilitate distribution.",
    ],
    additionalInstructions:
      "I have made no other wills or codicils. The Executor shall pay all valid debts and expenses of my estate before making distributions. I request a simple memorial service; any costs shall be paid from the residue of my estate.",
    date: "1st day of March, 2026",
  },
  {
    slug: "robert-williams",
    testatorName: "Robert James Williams",
    location: "Hennepin County, Minnesota",
    executor: "Patricia Williams",
    alternateExecutor: "Michael Williams",
    beneficiaries: [
      {
        title: "Section 2.1 — Patricia Williams (Spouse)",
        body:
          "I bequeath to my wife, Patricia Williams, our marital home at 890 Oak Ridge Lane, Minneapolis, Minnesota, and sixty percent (60%) of our joint brokerage account.",
      },
      {
        title: "Section 2.2 — Michael Williams (Son)",
        body:
          "I bequeath to my son, Michael Williams, my one-third (1/3) ownership interest in Williams & Sons Landscaping LLC, along with the company truck and equipment.",
      },
      {
        title: "Section 2.3 — Sarah Williams Thompson (Daughter)",
        body:
          "I bequeath to my daughter, Sarah Williams Thompson, the sum of $50,000 and the cabin property at 44 Lakeview Road, Brainerd, Minnesota.",
      },
    ],
    conditions: [
      "3.1  My spouse shall have a life estate in the marital home if she survives me; the remainder shall pass to our children in equal shares.",
      "3.2  Business interests shall be transferred in accordance with the operating agreement of Williams & Sons Landscaping LLC.",
      "3.3  Any beneficiary who contests this Will shall forfeit their share, which shall pass to the other beneficiaries.",
    ],
    additionalInstructions:
      "I have discussed these wishes with my family. The Executor is authorized to continue operation of the business during the administration of my estate and to sell the business if it is in the best interest of the beneficiaries.",
    date: "15th day of February, 2026",
  },
  {
    slug: "maria-santos",
    testatorName: "Maria Elena Santos",
    location: "Milwaukee County, Wisconsin",
    executor: "Carlos Santos",
    alternateExecutor: "Rosa Martinez",
    beneficiaries: [
      {
        title: "Section 2.1 — Carlos Santos (Son)",
        body:
          "I bequeath to my son, Carlos Santos, the two-family residence at 2100 South 5th Street, Milwaukee, Wisconsin, including all rental income accrued at my death.",
      },
      {
        title: "Section 2.2 — Ana Santos (Daughter)",
        body:
          "I bequeath to my daughter, Ana Santos, the sum of $40,000 from my savings and my 2020 Toyota RAV4, VIN 2T3P1RFV5LC123456.",
      },
      {
        title: "Section 2.3 — St. Adalbert's Parish",
        body:
          "I bequeath to St. Adalbert's Parish the sum of $10,000 for the maintenance of the church and its food pantry.",
      },
    ],
    conditions: [
      "3.1  If Carlos or Ana predecease me, that child's share shall pass to their descendants per stirpes.",
      "3.2  The Executor shall distribute tangible personal property (jewelry, household items) as he determines fair among my children.",
      "3.3  All distributions shall be made only after payment of my just debts and administration expenses.",
    ],
    additionalInstructions:
      "I have provided for my two children to the best of my ability. I request that my Executor communicate with all beneficiaries in a timely manner. Any dispute regarding personal property shall be resolved by the Executor, whose decision shall be final.",
    date: "22nd day of February, 2026",
  },
];

async function main() {
  if (!existsSync(OUT_DIR)) {
    mkdirSync(OUT_DIR, { recursive: true });
    console.log(`Created folder: ${OUT_DIR}`);
  }

  console.log(`Generating ${EXAMPLE_WILLS.length} example wills...\n`);
  for (const config of EXAMPLE_WILLS) {
    await generateOneWill(config);
    console.log(`  ✅ ${config.slug}.pdf`);
  }
  console.log(`\nDone. All wills saved to: ${OUT_DIR}`);
}

main().catch(console.error);
