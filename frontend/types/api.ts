export type DegreeType = "bachelors" | "masters" | "phd" | "certificate";
export type ChecklistStatus = "not_started" | "in_progress" | "complete";
export type RequirementType =
  "transcript" | "test_score" | "essay" | "recommendation" | "application" | "financial";

export interface Requirement {
  id: string;
  programId: string;
  type: RequirementType;
  title: string;
  description: string;
  dueOffsetDays: number;
  required: boolean;
  evidenceType: string;
}

export interface Program {
  id: string;
  name: string;
  degreeType: DegreeType;
  institution: string;
  description: string;
  applicationDeadline: string;
  createdAt?: string;
  requirements?: Requirement[];
}

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  educationLevel: string;
  gpa: number | null;
  testScores: string | null;
  targetTerm: string;
}

export interface ChecklistItem {
  id: string | null; // checklist item id (null until generated)
  requirementId: string;
  type: RequirementType;
  title: string;
  description: string;
  required: boolean;
  evidenceType: string;
  dueDate: string;
  status: ChecklistStatus;
  notes: string; // student's own notes
  counselorNotes: string; // counselor notes per requirement
}

export interface ProgramSummary {
  program: {
    id: string;
    name: string;
    degreeType: DegreeType;
    institution: string;
    applicationDeadline: string;
  };
  readinessScore: number;
  completedRequired: number;
  totalRequired: number;
  missingCount: number;
  nextDueDate: string | null;
}

export interface Reminder {
  requirementId: string;
  programId: string;
  programName: string;
  title: string;
  type: RequirementType;
  dueDate: string;
  status: ChecklistStatus;
  required: boolean;
  daysUntil: number; // negative = overdue
  overdue: boolean;
}

export interface MissingRequirement {
  requirementId: string;
  type: RequirementType;
  title: string;
  dueDate: string;
  required: boolean;
}

export interface TimelineEvent {
  id: string;
  title: string;
  date: string;
  status: ChecklistStatus;
  relatedRequirementId: string;
  required: boolean;
}

export interface Readiness {
  profileId: string;
  programId: string;
  program: { id: string; name: string; applicationDeadline: string };
  readinessScore: number;
  completedRequired: number;
  totalRequired: number;
  missingRequirements: MissingRequirement[];
  nextMilestones: TimelineEvent[];
  timeline: TimelineEvent[];
}
