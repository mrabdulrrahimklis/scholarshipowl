import { GraphQLError } from "graphql";
import { createSchema } from "graphql-yoga";
import { ZodError } from "zod";
import { prisma } from "../db/client.ts";
import { ApiError } from "../middleware/errors.ts";
import {
  createChecklistBody,
  createProfileBody,
  listProgramsQuery,
  remindersQuery,
  updateChecklistItemBody,
  updateProfileBody,
} from "../validation/schemas.ts";
import { getProgram, listPrograms } from "../services/programs.ts";
import { createProfile, getProfile, updateProfile } from "../services/profiles.ts";
import {
  createOrRefreshChecklist,
  getChecklist,
  getProfileProgramSummaries,
  getReadiness,
  getReminders,
  getTimeline,
  updateChecklistItem,
} from "../services/checklist.ts";

// Map the same errors the REST layer uses onto GraphQLErrors so clients get real
// messages + codes (instead of Yoga's default masking).
async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ZodError) {
      throw new GraphQLError("Request validation failed", {
        extensions: { code: "BAD_USER_INPUT", details: e.flatten() },
      });
    }
    if (e instanceof ApiError) {
      throw new GraphQLError(e.message, {
        extensions: { code: e.code, http: { status: e.status } },
      });
    }
    throw e;
  }
}

const typeDefs = /* GraphQL */ `
  type Query {
    "Liveness check"
    health: String!
    "List/filter/paginate programs"
    programs(search: String, degreeType: String, page: Int, pageSize: Int): ProgramPage!
    "A single program with its requirements"
    program(id: ID!): Program
    profile(id: ID!): Profile
    checklist(profileId: ID!, programId: ID!): [ChecklistItem!]!
    readiness(profileId: ID!, programId: ID!): Readiness!
    timeline(profileId: ID!, programId: ID!): [TimelineEvent!]!
    "Stretch: all started programs with readiness scores (comparison)"
    programSummaries(profileId: ID!): [ProgramSummary!]!
    "Stretch: upcoming/overdue reminders across all programs"
    reminders(profileId: ID!, withinDays: Int): [Reminder!]!
  }

  type Mutation {
    createProfile(input: CreateProfileInput!): Profile!
    updateProfile(id: ID!, input: UpdateProfileInput!): Profile!
    "Generate (or re-evaluate) a checklist; returns readiness"
    createChecklist(profileId: ID!, programId: ID!): Readiness!
    updateChecklistItem(
      profileId: ID!
      requirementId: ID!
      input: UpdateChecklistItemInput!
    ): ChecklistItem!
  }

  type ProgramPage {
    data: [Program!]!
    page: Int!
    pageSize: Int!
    total: Int!
  }

  type Program {
    id: ID!
    name: String!
    degreeType: String!
    institution: String!
    description: String!
    applicationDeadline: String!
    requirements: [Requirement!]
  }

  type Requirement {
    id: ID!
    programId: ID!
    type: String!
    title: String!
    description: String!
    dueOffsetDays: Int!
    required: Boolean!
    evidenceType: String!
  }

  type Profile {
    id: ID!
    name: String!
    email: String!
    educationLevel: String!
    gpa: Float
    testScores: String
    targetTerm: String!
  }

  type ChecklistItem {
    id: ID
    requirementId: ID!
    type: String!
    title: String!
    description: String!
    required: Boolean!
    evidenceType: String!
    dueDate: String!
    status: String!
    notes: String!
    counselorNotes: String!
  }

  type MissingRequirement {
    requirementId: ID!
    type: String!
    title: String!
    dueDate: String!
    required: Boolean!
  }

  type TimelineEvent {
    id: ID!
    title: String!
    date: String!
    status: String!
    relatedRequirementId: ID!
    required: Boolean!
  }

  type ReadinessProgram {
    id: ID!
    name: String!
    applicationDeadline: String!
  }

  type Readiness {
    profileId: ID!
    programId: ID!
    program: ReadinessProgram!
    readinessScore: Float!
    completedRequired: Int!
    totalRequired: Int!
    missingRequirements: [MissingRequirement!]!
    nextMilestones: [TimelineEvent!]!
    timeline: [TimelineEvent!]!
  }

  type ProgramSummaryProgram {
    id: ID!
    name: String!
    degreeType: String!
    institution: String!
    applicationDeadline: String!
  }

  type ProgramSummary {
    program: ProgramSummaryProgram!
    readinessScore: Float!
    completedRequired: Int!
    totalRequired: Int!
    missingCount: Int!
    nextDueDate: String
  }

  type Reminder {
    requirementId: ID!
    programId: ID!
    programName: String!
    title: String!
    type: String!
    dueDate: String!
    status: String!
    required: Boolean!
    daysUntil: Int!
    overdue: Boolean!
  }

  input CreateProfileInput {
    name: String!
    email: String!
    educationLevel: String!
    gpa: Float
    testScores: String
    targetTerm: String!
  }

  input UpdateProfileInput {
    name: String
    email: String
    educationLevel: String
    gpa: Float
    testScores: String
    targetTerm: String
  }

  input UpdateChecklistItemInput {
    status: String
    notes: String
    counselorNotes: String
  }
`;

const resolvers = {
  Query: {
    health: () => "ok",
    programs: (_: unknown, args: Record<string, unknown>) =>
      guard(() => listPrograms(listProgramsQuery.parse(args))),
    program: (_: unknown, { id }: { id: string }) => guard(() => getProgram(id)),
    profile: (_: unknown, { id }: { id: string }) => guard(() => getProfile(id)),
    checklist: (_: unknown, a: { profileId: string; programId: string }) =>
      guard(() => getChecklist(a.profileId, a.programId)),
    readiness: (_: unknown, a: { profileId: string; programId: string }) =>
      guard(() => getReadiness(a.profileId, a.programId)),
    timeline: (_: unknown, a: { profileId: string; programId: string }) =>
      guard(() => getTimeline(a.profileId, a.programId)),
    programSummaries: (_: unknown, { profileId }: { profileId: string }) =>
      guard(() => getProfileProgramSummaries(profileId)),
    reminders: (_: unknown, a: { profileId: string; withinDays?: number }) =>
      guard(() => {
        const { withinDays } = remindersQuery.parse({ withinDays: a.withinDays });
        return getReminders(a.profileId, withinDays);
      }),
  },
  Mutation: {
    createProfile: (_: unknown, { input }: { input: unknown }) =>
      guard(() => createProfile(createProfileBody.parse(input))),
    updateProfile: (_: unknown, { id, input }: { id: string; input: unknown }) =>
      guard(() => updateProfile(id, updateProfileBody.parse(input))),
    createChecklist: (_: unknown, a: { profileId: string; programId: string }) =>
      guard(() => {
        createChecklistBody.parse({ programId: a.programId });
        return createOrRefreshChecklist(a.profileId, a.programId);
      }),
    updateChecklistItem: (
      _: unknown,
      a: { profileId: string; requirementId: string; input: unknown },
    ) =>
      guard(async () => {
        const patch = updateChecklistItemBody.parse(a.input);
        await updateChecklistItem(a.profileId, a.requirementId, patch);
        // Return the enriched checklist item (with requirement metadata).
        const req = await prisma.requirement.findUnique({
          where: { id: a.requirementId },
          select: { programId: true },
        });
        if (!req) throw ApiError.notFound(`Requirement ${a.requirementId} not found`);
        const checklist = await getChecklist(a.profileId, req.programId);
        return checklist.find((c) => c.requirementId === a.requirementId)!;
      }),
  },
};

export const schema = createSchema({ typeDefs, resolvers });
