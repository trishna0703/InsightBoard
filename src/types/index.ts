export type InsightStage = 'Observation' | 'Insight' | 'Actionable' | 'Impact';

export type Priority = 'P1' | 'P2' | 'P3' | 'P4';

export type Category =
  | 'Efficacy'
  | 'Safety'
  | 'Access'
  | 'Competitive Intel'
  | 'Patient Journey'
  | 'Market Dynamics';

export interface CategoryRecord {
  id: string;
  name: string;
  color: string;
}

export interface HCP {
  id: string;
  name: string;
  specialty: string;
  institution: string;
}

export interface Tag {
  id: string;
  name: string;
}

export interface InsightActivity {
  id: string;
  insightId: string;
  userId: string;
  userName: string;
  action: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}

export interface Insight {
  id: string;
  nodeId: string;
  title: string;
  description: string;
  stage: InsightStage;
  priority: Priority;
  category: Category | null;
  categoryId: string | null;
  drugName: string | null;
  columnOrder: number;
  hcp: HCP | null;
  tags: Tag[];
  activities: InsightActivity[];
  createdAt: string;
  updatedAt: string;
  teamId: string;
  userId: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  teamId: string;
}

// Discriminated union for stage transitions
export type StageTransition =
  | { type: 'ADVANCE'; from: InsightStage; to: InsightStage }
  | { type: 'REVERT'; from: InsightStage; to: InsightStage }
  | { type: 'BLOCKED'; reason: 'already_at_start' | 'already_at_end' };

export interface FilterState {
  search: string;
  priorities: Priority[];
  categories: Category[];
  hcpId: string | null;
  tagIds: string[];
  dateRange: { start: string | null; end: string | null };
}
