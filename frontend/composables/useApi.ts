import type {
  ChecklistItem,
  Paginated,
  Profile,
  Program,
  ProgramSummary,
  Readiness,
  Reminder,
  TimelineEvent,
} from "~/types/api";

// Field selections matching the TS types.
const PROGRAM = "id name degreeType institution description applicationDeadline";
const REQUIREMENT = "id programId type title description dueOffsetDays required evidenceType";
const PROFILE = "id name email educationLevel gpa testScores targetTerm";
const CHECKLIST_ITEM =
  "id requirementId type title description required evidenceType dueDate status notes counselorNotes";
const TIMELINE = "id title date status relatedRequirementId required";
const READINESS = `profileId programId program { id name applicationDeadline } readinessScore completedRequired totalRequired missingRequirements { requirementId type title dueDate required } nextMilestones { ${TIMELINE} } timeline { ${TIMELINE} }`;
const SUMMARY =
  "program { id name degreeType institution applicationDeadline } readinessScore completedRequired totalRequired missingCount nextDueDate";
const REMINDER =
  "requirementId programId programName title type dueDate status required daysUntil overdue";

interface GqlResponse<T> {
  data?: T;
  errors?: { message: string; extensions?: { code?: string; details?: unknown } }[];
}

/**
 * Typed GraphQL client. The whole UI talks to the single `/graphql` endpoint;
 * method signatures mirror the resolvers so stores/pages stay declarative.
 */
export function useApi() {
  const config = useRuntimeConfig();
  // During SSR use the server-only base (internal Docker DNS); in the browser
  // the public base. Both point at the GraphQL endpoint.
  const base = (import.meta.server ? config.apiBaseServer : config.public.apiBase) as string;

  async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    const res = await $fetch<GqlResponse<T>>(base, {
      method: "POST",
      body: { query, variables },
    });
    if (res.errors?.length) {
      const e = res.errors[0]!;
      // Shape the thrown error like the stores expect (err.data.error.message).
      const err = new Error(e.message) as Error & { data?: unknown };
      err.data = {
        error: { code: e.extensions?.code, message: e.message, details: e.extensions?.details },
      };
      throw err;
    }
    return res.data as T;
  }

  return {
    listPrograms: (params: {
      search?: string;
      degreeType?: string;
      page?: number;
      pageSize?: number;
    }) =>
      gql<{ programs: Paginated<Program> }>(
        `query($search:String,$degreeType:String,$page:Int,$pageSize:Int){
           programs(search:$search,degreeType:$degreeType,page:$page,pageSize:$pageSize){
             data { ${PROGRAM} } page pageSize total } }`,
        params,
      ).then((d) => d.programs),

    getProgram: (id: string) =>
      gql<{ program: Program }>(
        `query($id:ID!){ program(id:$id){ ${PROGRAM} requirements { ${REQUIREMENT} } } }`,
        { id },
      ).then((d) => d.program),

    createProfile: (body: Record<string, unknown>) =>
      gql<{ createProfile: Profile }>(
        `mutation($input:CreateProfileInput!){ createProfile(input:$input){ ${PROFILE} } }`,
        { input: body },
      ).then((d) => d.createProfile),

    getProfile: (id: string) =>
      gql<{ profile: Profile }>(`query($id:ID!){ profile(id:$id){ ${PROFILE} } }`, { id }).then(
        (d) => d.profile,
      ),

    updateProfile: (id: string, body: Record<string, unknown>) =>
      gql<{ updateProfile: Profile }>(
        `mutation($id:ID!,$input:UpdateProfileInput!){ updateProfile(id:$id,input:$input){ ${PROFILE} } }`,
        { id, input: body },
      ).then((d) => d.updateProfile),

    createChecklist: (profileId: string, programId: string) =>
      gql<{ createChecklist: Readiness }>(
        `mutation($p:ID!,$prog:ID!){ createChecklist(profileId:$p,programId:$prog){ ${READINESS} } }`,
        { p: profileId, prog: programId },
      ).then((d) => d.createChecklist),

    updateChecklistItem: (
      profileId: string,
      requirementId: string,
      body: { status?: string; notes?: string; counselorNotes?: string },
    ) =>
      gql<{ updateChecklistItem: ChecklistItem }>(
        `mutation($p:ID!,$r:ID!,$input:UpdateChecklistItemInput!){
           updateChecklistItem(profileId:$p,requirementId:$r,input:$input){ ${CHECKLIST_ITEM} } }`,
        { p: profileId, r: requirementId, input: body },
      ).then((d) => d.updateChecklistItem),

    getChecklist: (profileId: string, programId: string) =>
      gql<{ checklist: ChecklistItem[] }>(
        `query($p:ID!,$prog:ID!){ checklist(profileId:$p,programId:$prog){ ${CHECKLIST_ITEM} } }`,
        { p: profileId, prog: programId },
      ).then((d) => d.checklist),

    getReadiness: (profileId: string, programId: string) =>
      gql<{ readiness: Readiness }>(
        `query($p:ID!,$prog:ID!){ readiness(profileId:$p,programId:$prog){ ${READINESS} } }`,
        { p: profileId, prog: programId },
      ).then((d) => d.readiness),

    getTimeline: (profileId: string, programId: string) =>
      gql<{ timeline: TimelineEvent[] }>(
        `query($p:ID!,$prog:ID!){ timeline(profileId:$p,programId:$prog){ ${TIMELINE} } }`,
        { p: profileId, prog: programId },
      ).then((d) => d.timeline),

    listProfilePrograms: (profileId: string) =>
      gql<{ programSummaries: ProgramSummary[] }>(
        `query($p:ID!){ programSummaries(profileId:$p){ ${SUMMARY} } }`,
        { p: profileId },
      ).then((d) => d.programSummaries),

    getReminders: (profileId: string, withinDays = 14) =>
      gql<{ reminders: Reminder[] }>(
        `query($p:ID!,$w:Int){ reminders(profileId:$p,withinDays:$w){ ${REMINDER} } }`,
        { p: profileId, w: withinDays },
      ).then((d) => d.reminders),
  };
}
