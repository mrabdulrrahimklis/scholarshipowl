/**
 * Demo data for tracking — creates one profile with THREE started programs so
 * the dashboard, My Programs comparison, counselor notes, and (crucially) the
 * Reminders page are all populated.
 *
 * One program ("HCI — Spring Intake") is given a near-term deadline computed
 * relative to *today*, so its requirements land as overdue / due-soon items that
 * show up on the Reminders page immediately. Idempotent (fixed ids + upserts).
 *
 * Run:  npm run seed:demo   (host)   or via docker exec (see README/commands)
 */
import { prisma } from "./client.ts";
import { computeDueDate } from "../domain/dueDate.ts";

const PROFILE_ID = "demo-profile-tracker";

function isoAddDays(days: number): string {
  const n = new Date();
  const ms = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()) + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

type Req = {
  id: string;
  type: string;
  title: string;
  description: string;
  dueOffsetDays: number;
  required: boolean;
  evidenceType: string;
};

function reqs(prefix: string): Req[] {
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

// A demo program whose deadline is ~25 days out → near-term due dates.
const HCI_ID = "prog-hci-spring";
const HCI_DEADLINE = isoAddDays(25);

async function upsertDemoProgram() {
  await prisma.program.upsert({
    where: { id: HCI_ID },
    update: { applicationDeadline: HCI_DEADLINE }, // keep it near-term on re-run
    create: {
      id: HCI_ID,
      name: "M.S. Human-Computer Interaction (Spring Intake)",
      degreeType: "masters",
      institution: "Riverside Design Institute",
      description: "Spring-intake HCI master's — imminent deadline for demo tracking.",
      applicationDeadline: HCI_DEADLINE,
    },
  });
  for (const r of reqs(HCI_ID)) {
    await prisma.requirement.upsert({
      where: { id: r.id },
      update: {},
      create: { ...r, programId: HCI_ID },
    });
  }
}

/** Create/refresh checklist items for a program with computed due dates + state. */
async function seedChecklist(
  programId: string,
  deadline: string,
  programReqs: Req[],
  completed: Set<string>,
  inProgress: Set<string>,
  counselor: Record<string, string>,
  notes: Record<string, string>,
) {
  for (const r of programReqs) {
    const dueDate = computeDueDate(deadline, r.dueOffsetDays);
    const status = completed.has(r.id)
      ? "complete"
      : inProgress.has(r.id)
        ? "in_progress"
        : "not_started";
    await prisma.checklistItem.upsert({
      where: { profileId_requirementId: { profileId: PROFILE_ID, requirementId: r.id } },
      update: { dueDate, status, counselorNotes: counselor[r.id] ?? "", notes: notes[r.id] ?? "" },
      create: {
        profileId: PROFILE_ID,
        requirementId: r.id,
        dueDate,
        status,
        counselorNotes: counselor[r.id] ?? "",
        notes: notes[r.id] ?? "",
      },
    });
  }
}

async function main() {
  console.log("🌱 Seeding demo tracking data…");

  // Profile
  await prisma.studentProfile.upsert({
    where: { id: PROFILE_ID },
    update: {},
    create: {
      id: PROFILE_ID,
      name: "Jordan Ellis",
      email: "jordan.ellis@example.com",
      educationLevel: "Bachelors",
      gpa: 3.6,
      testScores: "GRE 324",
      targetTerm: "Spring 2027",
    },
  });

  await upsertDemoProgram();

  // Program 1 — HCI (near-term → drives reminders). Complete one item so score > 0.
  await seedChecklist(
    HCI_ID,
    HCI_DEADLINE,
    reqs(HCI_ID),
    new Set([`${HCI_ID}-req-recommendation`]),
    new Set([`${HCI_ID}-req-testscore`]),
    {
      [`${HCI_ID}-req-transcript`]:
        "Overdue — email the registrar today and forward me the receipt.",
    },
    { [`${HCI_ID}-req-essay`]: "Draft outline done; needs a second paragraph." },
  );

  // Programs 2 & 3 — existing seeded programs (far-future dates), varied progress.
  const cs = await prisma.program.findUnique({ where: { id: "prog-cs-bachelors" } });
  const ds = await prisma.program.findUnique({ where: { id: "prog-ds-masters" } });
  if (cs) {
    await seedChecklist(
      cs.id,
      cs.applicationDeadline,
      reqs(cs.id),
      new Set([`${cs.id}-req-transcript`, `${cs.id}-req-testscore`, `${cs.id}-req-essay`]),
      new Set(),
      { [`${cs.id}-req-recommendation`]: "Ask Prof. Nkosi — she knows your work best." },
      {},
    );
  }
  if (ds) {
    await seedChecklist(
      ds.id,
      ds.applicationDeadline,
      reqs(ds.id),
      new Set([`${ds.id}-req-transcript`]),
      new Set(),
      {},
      {},
    );
  }

  const items = await prisma.checklistItem.count({ where: { profileId: PROFILE_ID } });
  console.log(`✅ Demo ready. Profile id: ${PROFILE_ID}`);
  console.log(`   ${items} checklist items across 3 programs; HCI deadline ${HCI_DEADLINE}.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error("❌ Demo seed failed:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
