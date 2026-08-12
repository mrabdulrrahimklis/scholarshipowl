/**
 * Deterministic seed data. Fixed ids + upserts make this idempotent and stable
 * for tests and the UI. Run with `bun run seed`.
 */
import { prisma } from "./client.ts";

type SeedRequirement = {
  id: string;
  type: string;
  title: string;
  description: string;
  dueOffsetDays: number;
  required: boolean;
  evidenceType: string;
};

type SeedProgram = {
  id: string;
  name: string;
  degreeType: string;
  institution: string;
  description: string;
  applicationDeadline: string; // YYYY-MM-DD
  requirements: SeedRequirement[];
};

// Common requirement set (stable ids per program via prefix).
function reqs(prefix: string): SeedRequirement[] {
  return [
    {
      id: `${prefix}-req-application`,
      type: "application",
      title: "Submit online application",
      description: "Complete and submit the program's online application form.",
      dueOffsetDays: 0,
      required: true,
      evidenceType: "link",
    },
    {
      id: `${prefix}-req-transcript`,
      type: "transcript",
      title: "Official transcripts",
      description: "Request official transcripts from all prior institutions.",
      dueOffsetDays: 30,
      required: true,
      evidenceType: "file",
    },
    {
      id: `${prefix}-req-testscore`,
      type: "test_score",
      title: "Standardized test scores",
      description: "Submit official standardized test scores.",
      dueOffsetDays: 21,
      required: true,
      evidenceType: "score",
    },
    {
      id: `${prefix}-req-essay`,
      type: "essay",
      title: "Personal statement",
      description: "Write a personal statement (500–800 words).",
      dueOffsetDays: 14,
      required: true,
      evidenceType: "text",
    },
    {
      id: `${prefix}-req-recommendation`,
      type: "recommendation",
      title: "Letters of recommendation",
      description: "Secure two letters of recommendation.",
      dueOffsetDays: 21,
      required: true,
      evidenceType: "file",
    },
    {
      id: `${prefix}-req-financial`,
      type: "financial",
      title: "Financial aid / FAFSA (optional)",
      description: "Optionally submit financial aid documentation.",
      dueOffsetDays: 7,
      required: false,
      evidenceType: "file",
    },
  ];
}

const SEED_PROGRAMS: SeedProgram[] = [
  {
    id: "prog-cs-bachelors",
    name: "B.S. Computer Science",
    degreeType: "bachelors",
    institution: "Northbridge University",
    description: "Undergraduate computer science with an emphasis on systems and AI.",
    applicationDeadline: "2026-12-01",
    requirements: reqs("prog-cs-bachelors"),
  },
  {
    id: "prog-ds-masters",
    name: "M.S. Data Science",
    degreeType: "masters",
    institution: "Lakeside Institute of Technology",
    description: "Graduate program covering statistics, ML, and data engineering.",
    applicationDeadline: "2027-01-15",
    requirements: reqs("prog-ds-masters"),
  },
  {
    id: "prog-bio-phd",
    name: "Ph.D. Molecular Biology",
    degreeType: "phd",
    institution: "Cedarwood Research University",
    description: "Doctoral research program in molecular and cellular biology.",
    applicationDeadline: "2026-11-15",
    requirements: reqs("prog-bio-phd"),
  },
  {
    id: "prog-mba",
    name: "M.B.A. Business Administration",
    degreeType: "masters",
    institution: "Harborview School of Business",
    description: "Full-time MBA with concentrations in finance and entrepreneurship.",
    applicationDeadline: "2027-02-01",
    requirements: reqs("prog-mba"),
  },
  {
    id: "prog-ux-cert",
    name: "Certificate in UX Design",
    degreeType: "certificate",
    institution: "Northbridge University",
    description: "Professional certificate in user experience and product design.",
    applicationDeadline: "2026-10-01",
    requirements: reqs("prog-ux-cert"),
  },
];

async function seed() {
  console.log("🌱 Seeding programs + requirements...");
  for (const p of SEED_PROGRAMS) {
    await prisma.program.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        name: p.name,
        degreeType: p.degreeType,
        institution: p.institution,
        description: p.description,
        applicationDeadline: p.applicationDeadline,
      },
    });

    for (const r of p.requirements) {
      await prisma.requirement.upsert({
        where: { id: r.id },
        update: {},
        create: {
          id: r.id,
          programId: p.id,
          type: r.type,
          title: r.title,
          description: r.description,
          dueOffsetDays: r.dueOffsetDays,
          required: r.required,
          evidenceType: r.evidenceType,
        },
      });
    }
  }
  console.log(`✅ Seed complete: ${SEED_PROGRAMS.length} programs.`);
}

seed()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("❌ Seed failed:", err);
    await prisma.$disconnect();
    process.exit(1);
  });

export { SEED_PROGRAMS };
