/* =========================
   USERS & AUTH
========================= */
export type UserRole = "admin" | "supervisor" | "team_leader" | "collector" | "hidden_admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

/* =========================
   CLIENTS
========================= */
export interface Client {
  id: string;
  name: string;
  customerId?: string;
  email?: string;
  company?: string;
  notes?: string;
  imageUrl?: string;
  ownerId?: string;
  portfolioType?: "ACTIVE" | "WRITEOFF";
  domainType?: "FIRST" | "THIRD" | "WRITEOFF";
  branch?: string;
  cycleStartDate?: string;
  cycleEndDate?: string;
  createdAt?: Date;
}

export interface ClientFull extends Client {
  phones?: Phone[];
  addresses?: Address[];
  loans?: Loan[];
  actions?: Action[];
  osint?: OSINT;
  calls?: CallLog[];
  followups?: Followup[];
}

/* =========================
   PHONES
========================= */
export interface Phone {
  id: string;
  clientId: string;
  phone: string;
}

/* =========================
   ADDRESSES
========================= */
export interface Address {
  id: string;
  clientId: string;
  address: string;
  city?: string;
  area?: string;
  lat?: number;
  lng?: number;
  isPrimary?: boolean;
}

/* =========================
   LOANS
========================= */
export interface Loan {
  id: string;
  clientId: string;
  loanType: string;
  emi?: number;
  balance?: number;
  overdue?: number;
  bucket?: number;
  penaltyEnabled?: boolean;
  penaltyAmount?: number;
  amountDue?: number;
}

/* =========================
   ACTIONS
========================= */
export interface Action {
  id: string;
  clientId: string;
  userId: string;
  actionType: "CALL" | "VISIT" | "WHATSAPP" | "EMAIL" | "SMS";
  note?: string;
  createdAt?: Date;
}

/* =========================
   OSINT
========================= */
export interface OSINT {
  id: string;
  clientId: string;
  social?: Record<string, any>;
  workplace?: Record<string, any>;
  webResults?: any[];
  imageResults?: any[];
  summary?: string;
  confidenceScore?: number;
}

/* =========================
   CALL LOGS
========================= */
export interface CallLog {
  id: string;
  clientId: string;
  userId: string;
  callStatus: "answered" | "no_answer" | "promised" | "refused" | "callback";
  duration?: number;
  createdAt?: Date;
}

/* =========================
   FOLLOW-UPS
========================= */
export interface Followup {
  id: string;
  clientId: string;
  scheduledFor: string;
  note?: string;
  createdAt?: Date;
}

/* =========================
   RISK & AI
========================= */
export interface RiskResult {
  score: number;
  label: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  breakdown: {
    bucket: number;
    amount: number;
    data: number;
    inactivity: number;
    ai: number;
  };
  meta: {
    urgencyLevel: number;
    isActionRequired: boolean;
    riskTrend: "increasing" | "stable" | "decreasing";
  };
}

export interface AIResult {
  behaviorPrediction: string;
  paymentProbability: number;
  strategy: string;
  tone: "soft" | "balanced" | "firm" | "aggressive";
  nextAction: string;
  summary: string;
  confidence: number;
  redFlags: string[];
  strengths: string[];
  riskBoost: number;
  urgency: number;
}

export interface CallScript {
  opening: string;
  mainBody: string;
  objectionHandling: string[];
  closing: string;
  whatsappMessage: string;
}

/* =========================
   DECISION ENGINE
========================= */
export type FinalAction = "CALL" | "FOLLOW" | "VISIT" | "WAIT" | "LEGAL";

export interface DecisionResult {
  action: FinalAction;
  priority: number;
  reason: string;
  suggestedTime: string;
}

/* =========================
   CALL LIST
========================= */
export interface CallListItem {
  id: string;
  name: string;
  totalDue: number;
  riskScore: number;
  lastContact?: string;
  priority: number;
  phone: string;
}

/* =========================
   MAP
========================= */
export interface MapClient {
  id: string;
  name: string;
  lat: number;
  lng: number;
  risk: string;
  priority: number;
  totalDue: number;
  phone?: string;
  address?: string;
}

/* =========================
   API RESPONSES
========================= */
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
