/**
 * Integration tests for the GraphQL API (the app's only API) against SQLite.
 * Covers the core flow, the stretch features, and the persisted timeline.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { createApp } from "../src/app.ts";
import { prisma } from "../src/db/client.ts";

const CS = "prog-cs-bachelors";
const DS = "prog-ds-masters";
const TRANSCRIPT = "prog-cs-bachelors-req-transcript";
const APPLICATION = "prog-cs-bachelors-req-application";

let server: Server;
let url: string;
let profileId: string;

beforeAll(async () => {
  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => resolve());
  });
  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  url = `http://127.0.0.1:${port}/graphql`;
});

afterAll(async () => {
  if (profileId) await prisma.studentProfile.delete({ where: { id: profileId } }).catch(() => {});
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await prisma.$disconnect();
});

async function gql(query: string, variables: Record<string, unknown> = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  return res.json() as Promise<{ data?: any; errors?: any[] }>;
}

describe("GraphQL API", () => {
  it("responds to the health query", async () => {
    const r = await gql(`{ health }`);
    expect(r.data.health).toBe("ok");
  });

  it("queries programs", async () => {
    const r = await gql(`{ programs(pageSize: 2) { total data { id name } } }`);
    expect(r.errors).toBeUndefined();
    expect(r.data.programs.total).toBeGreaterThanOrEqual(5);
    expect(r.data.programs.data).toHaveLength(2);
  });

  it("returns a coded validation error for a bad createProfile", async () => {
    const r = await gql(`mutation($i: CreateProfileInput!){ createProfile(input:$i){ id } }`, {
      i: { name: "", email: "nope", educationLevel: "x", targetTerm: "y" },
    });
    expect(r.errors?.[0].extensions.code).toBe("BAD_USER_INPUT");
  });

  it("runs the core flow: createProfile → createChecklist → complete → readiness/timeline", async () => {
    const created = await gql(
      `mutation($i: CreateProfileInput!){ createProfile(input:$i){ id gpa } }`,
      {
        i: {
          name: "GQL Tester",
          email: "gql@example.com",
          educationLevel: "Bachelors",
          gpa: 3.7,
          targetTerm: "Fall 2027",
        },
      },
    );
    profileId = created.data.createProfile.id;
    expect(created.data.createProfile.gpa).toBe(3.7);

    const gen = await gql(
      `mutation($p: ID!, $prog: ID!){ createChecklist(profileId:$p, programId:$prog){ readinessScore totalRequired } }`,
      { p: profileId, prog: CS },
    );
    expect(gen.data.createChecklist.readinessScore).toBe(0);
    expect(gen.data.createChecklist.totalRequired).toBe(5);

    const upd = await gql(
      `mutation($p: ID!, $r: ID!, $i: UpdateChecklistItemInput!){ updateChecklistItem(profileId:$p, requirementId:$r, input:$i){ status title } }`,
      { p: profileId, r: TRANSCRIPT, i: { status: "complete" } },
    );
    expect(upd.data.updateChecklistItem.status).toBe("complete");
    expect(upd.data.updateChecklistItem.title).toBe("Official transcripts");

    const rd = await gql(
      `query($p: ID!, $prog: ID!){
         readiness(profileId:$p, programId:$prog){ readinessScore completedRequired }
         timeline(profileId:$p, programId:$prog){ date status relatedRequirementId }
       }`,
      { p: profileId, prog: CS },
    );
    expect(rd.data.readiness.completedRequired).toBe(1);
    expect(rd.data.readiness.readinessScore).toBeCloseTo(0.2, 5);
    const dates = rd.data.timeline.map((e: any) => e.date);
    expect(dates).toEqual([...dates].sort());
  });

  it("persists timeline events (real table) synced on status change", async () => {
    const rows = await prisma.timelineEvent.findMany({ where: { profileId, programId: CS } });
    expect(rows).toHaveLength(6);
    const transcript = rows.find((r) => r.relatedRequirementId === TRANSCRIPT)!;
    expect(transcript.status).toBe("complete");
    expect(transcript.date).toBe("2026-11-01");
  });

  it("stores counselor notes independently of student notes", async () => {
    await gql(
      `mutation($p: ID!, $r: ID!, $i: UpdateChecklistItemInput!){ updateChecklistItem(profileId:$p, requirementId:$r, input:$i){ notes counselorNotes } }`,
      { p: profileId, r: APPLICATION, i: { notes: "mine", counselorNotes: "submit early" } },
    );
    const r = await gql(
      `query($p: ID!, $prog: ID!){ checklist(profileId:$p, programId:$prog){ requirementId notes counselorNotes } }`,
      { p: profileId, prog: CS },
    );
    const item = r.data.checklist.find((c: any) => c.requirementId === APPLICATION);
    expect(item.notes).toBe("mine");
    expect(item.counselorNotes).toBe("submit early");
  });

  it("summarizes multiple programs, best readiness first", async () => {
    await gql(
      `mutation($p: ID!, $prog: ID!){ createChecklist(profileId:$p, programId:$prog){ readinessScore } }`,
      { p: profileId, prog: DS },
    );
    const r = await gql(
      `query($p: ID!){ programSummaries(profileId:$p){ program { id } readinessScore } }`,
      { p: profileId },
    );
    expect(r.data.programSummaries).toHaveLength(2);
    expect(r.data.programSummaries[0].program.id).toBe(CS); // 0.2 > 0
    expect(r.data.programSummaries[0].readinessScore).toBeCloseTo(0.2, 5);
  });

  it("clears a profile field when updateProfile is given null", async () => {
    const upd = await gql(
      `mutation($id: ID!, $i: UpdateProfileInput!){ updateProfile(id:$id, input:$i){ gpa } }`,
      { id: profileId, i: { gpa: null } },
    );
    expect(upd.errors).toBeUndefined();
    expect(upd.data.updateProfile.gpa).toBeNull(); // was 3.7, now cleared
  });

  it("rejects an empty updateProfile with a validation error", async () => {
    const r = await gql(
      `mutation($id: ID!, $i: UpdateProfileInput!){ updateProfile(id:$id, input:$i){ id } }`,
      { id: profileId, i: {} },
    );
    expect(r.errors?.[0].extensions.code).toBe("BAD_USER_INPUT");
  });

  it("refuses to create an orphan checklist item for a not-started program", async () => {
    // prog-mba is never started by this profile.
    const r = await gql(
      `mutation($p: ID!, $r: ID!, $i: UpdateChecklistItemInput!){ updateChecklistItem(profileId:$p, requirementId:$r, input:$i){ id } }`,
      { p: profileId, r: "prog-mba-req-essay", i: { status: "complete" } },
    );
    expect(r.errors?.[0].extensions.code).toBe("bad_request");
  });

  it("returns reminders ordered by due date, excluding completed", async () => {
    const r = await gql(
      `query($p: ID!){ reminders(profileId:$p, withinDays: 365){ requirementId dueDate daysUntil overdue } }`,
      { p: profileId },
    );
    const reminders = r.data.reminders;
    expect(reminders.length).toBeGreaterThan(0);
    const dates = reminders.map((x: any) => x.dueDate);
    expect(dates).toEqual([...dates].sort());
    expect(reminders.some((x: any) => x.requirementId === TRANSCRIPT)).toBe(false); // completed
  });
});
