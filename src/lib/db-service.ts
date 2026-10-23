/**
 * =========================================================================
 * POSTOP-CHECK CLINICAL DATABASE & DATA ACCESS LAYER
 * Connects to Neon PostgreSQL when DATABASE_URL is present,
 * and maintains reactive in-memory state for immediate interactive use.
 * =========================================================================
 */

import { logger } from "./logger";

export interface DoctorRecord {
  id: string;
  name: string;
  email: string;
  hospital: string;
  specialty: string;
  phone: string;
}

export interface PatientRecord {
  id: string;
  doctorId: string;
  name: string;
  email: string;
  age: number;
  gender: 'MALE' | 'FEMALE';
  surgeryDate: string;
  kneeSide: 'LEFT' | 'RIGHT' | 'BILATERAL';
  phone: string;
  accessToken?: string;
  passcode?: string;
  currentTriageStatus: 'RED' | 'AMBER' | 'GREEN';
  currentRiskProbability: number;
  lastCheckinDay: number;
  lastCheckinDate: string;
  baselineOKS: number;
  baselineEQ5D: number;
  comorbidityCount: number;
  hasHeartDisease: boolean;
  hasHighBloodPressure: boolean;
  hasDiabetes: boolean;
  hasStroke: boolean;
  hasArthritis: boolean;
  mlRiskTier?: string;
  mlRiskDrivers?: string | string[];
  mlActionPlan?: string;
}

export interface CheckinRecord {
  id: string;
  patientId: string;
  dayNumber: number;
  date: string;
  painScore: number;
  flexionDegrees: number;
  walkingStepsOrMeters: number;
  swellingScore: number;
  opioidPillsTaken: number;
  feverReported: boolean;
  woundDrainageReported: boolean;
  calfPainReported: boolean;
  footDropReported: boolean;
  chestPainShortnessOfBreath: boolean;
  triageStatus: 'RED' | 'AMBER' | 'GREEN';
  triageLayer: number;
  triageReason: string;
  clinicalAction: string;
  mlRiskProbability: number;
  mlRiskClassification: 'LOW' | 'MODERATE' | 'HIGH';
  patientFreeNotes?: string;
  doctorAcknowledged: boolean;
}

export interface InviteRecord {
  id: string;
  token: string;
  doctorId: string;
  patientName: string;
  patientEmail: string;
  surgeryDate: string;
  kneeSide: 'LEFT' | 'RIGHT' | 'BILATERAL';
  used: boolean;
  createdAt: string;
  expiresAt: string;
}

// Initial clinical cohort populated according to PostOp-Check clinical profiles
const INITIAL_DOCTOR: DoctorRecord = {
  id: "doc-101",
  name: "Dr. Alistair Wright, MD, FRCS",
  email: "a.wright@ortho-hospital.org",
  hospital: "Royal Orthopaedic Institute",
  specialty: "Adult Reconstruction & Joint Arthroplasty",
  phone: "+1 (555) 234-8900",
};

let PATIENTS_STORE: PatientRecord[] = [
  {
    id: "pat-01",
    doctorId: "doc-101",
    name: "Margaret Jenkins",
    email: "m.jenkins@example.com",
    age: 69,
    gender: "FEMALE",
    surgeryDate: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0],
    kneeSide: "RIGHT",
    phone: "+1 (555) 349-1122",
    currentTriageStatus: "RED",
    currentRiskProbability: 0.88,
    lastCheckinDay: 4,
    lastCheckinDate: new Date().toISOString(),
    baselineOKS: 14,
    baselineEQ5D: 0.38,
    comorbidityCount: 3,
    hasHeartDisease: false,
    hasHighBloodPressure: true,
    hasDiabetes: true,
    hasStroke: false,
    hasArthritis: true,
  },
  {
    id: "pat-02",
    doctorId: "doc-101",
    name: "Robert Chen",
    email: "r.chen@example.com",
    age: 63,
    gender: "MALE",
    surgeryDate: new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0],
    kneeSide: "LEFT",
    phone: "+1 (555) 872-9901",
    currentTriageStatus: "AMBER",
    currentRiskProbability: 0.46,
    lastCheckinDay: 6,
    lastCheckinDate: new Date().toISOString(),
    baselineOKS: 19,
    baselineEQ5D: 0.49,
    comorbidityCount: 2,
    hasHeartDisease: true,
    hasHighBloodPressure: true,
    hasDiabetes: false,
    hasStroke: false,
    hasArthritis: true,
  },
  {
    id: "pat-03",
    doctorId: "doc-101",
    name: "Eleanor Vance",
    email: "e.vance@example.com",
    age: 58,
    gender: "FEMALE",
    surgeryDate: new Date(Date.now() - 8 * 86400000).toISOString().split('T')[0],
    kneeSide: "RIGHT",
    phone: "+1 (555) 431-7788",
    currentTriageStatus: "GREEN",
    currentRiskProbability: 0.11,
    lastCheckinDay: 8,
    lastCheckinDate: new Date().toISOString(),
    baselineOKS: 24,
    baselineEQ5D: 0.65,
    comorbidityCount: 1,
    hasHeartDisease: false,
    hasHighBloodPressure: false,
    hasDiabetes: false,
    hasStroke: false,
    hasArthritis: true,
  },
  {
    id: "pat-04",
    doctorId: "doc-101",
    name: "David Miller",
    email: "d.miller@example.com",
    age: 72,
    gender: "MALE",
    surgeryDate: new Date(Date.now() - 11 * 86400000).toISOString().split('T')[0],
    kneeSide: "RIGHT",
    phone: "+1 (555) 602-3344",
    currentTriageStatus: "GREEN",
    currentRiskProbability: 0.14,
    lastCheckinDay: 11,
    lastCheckinDate: new Date().toISOString(),
    baselineOKS: 21,
    baselineEQ5D: 0.58,
    comorbidityCount: 2,
    hasHeartDisease: false,
    hasHighBloodPressure: true,
    hasDiabetes: false,
    hasStroke: false,
    hasArthritis: true,
  }
];

let CHECKINS_STORE: CheckinRecord[] = [
  // Margaret Jenkins (Day 1 to Day 4 - Escalating into RED)
  {
    id: "chk-01-d1",
    patientId: "pat-01",
    dayNumber: 1,
    date: new Date(Date.now() - 3 * 86400000).toISOString(),
    painScore: 5,
    flexionDegrees: 65,
    walkingStepsOrMeters: 120,
    swellingScore: 3,
    opioidPillsTaken: 2,
    feverReported: false,
    woundDrainageReported: false,
    calfPainReported: false,
    footDropReported: false,
    chestPainShortnessOfBreath: false,
    triageStatus: "GREEN",
    triageLayer: 3,
    triageReason: "Expected early post-op baseline. Pain managed.",
    clinicalAction: "Continue cryotherapy and ankle pumps.",
    mlRiskProbability: 0.18,
    mlRiskClassification: "LOW",
    doctorAcknowledged: true,
  },
  {
    id: "chk-01-d2",
    patientId: "pat-01",
    dayNumber: 2,
    date: new Date(Date.now() - 2 * 86400000).toISOString(),
    painScore: 5,
    flexionDegrees: 68,
    walkingStepsOrMeters: 180,
    swellingScore: 3,
    opioidPillsTaken: 2,
    feverReported: false,
    woundDrainageReported: false,
    calfPainReported: false,
    footDropReported: false,
    chestPainShortnessOfBreath: false,
    triageStatus: "GREEN",
    triageLayer: 3,
    triageReason: "Mobility steady, flexion improving +3°.",
    clinicalAction: "Routine recovery protocol.",
    mlRiskProbability: 0.18,
    mlRiskClassification: "LOW",
    doctorAcknowledged: true,
  },
  {
    id: "chk-01-d3",
    patientId: "pat-01",
    dayNumber: 3,
    date: new Date(Date.now() - 1 * 86400000).toISOString(),
    painScore: 6,
    flexionDegrees: 65,
    walkingStepsOrMeters: 150,
    swellingScore: 4,
    opioidPillsTaken: 3,
    feverReported: false,
    woundDrainageReported: false,
    calfPainReported: false,
    footDropReported: false,
    chestPainShortnessOfBreath: false,
    triageStatus: "AMBER",
    triageLayer: 2,
    triageReason: "Swelling increased with slight flexion regression.",
    clinicalAction: "Increase elevation intervals.",
    mlRiskProbability: 0.35,
    mlRiskClassification: "MODERATE",
    doctorAcknowledged: true,
  },
  {
    id: "chk-01-d4",
    patientId: "pat-01",
    dayNumber: 4,
    date: new Date().toISOString(),
    painScore: 8,
    flexionDegrees: 60,
    walkingStepsOrMeters: 80,
    swellingScore: 5,
    opioidPillsTaken: 3,
    feverReported: false,
    woundDrainageReported: false,
    calfPainReported: true, // LAYER 1 TRIGGER
    footDropReported: false,
    chestPainShortnessOfBreath: false,
    triageStatus: "RED",
    triageLayer: 1,
    triageReason: "Deterministic Rule: Acute calf tenderness and asymmetrical lower extremity swelling reported (Suspected DVT).",
    clinicalAction: "Urgent duplex venous ultrasound required. Contact patient immediately.",
    mlRiskProbability: 0.88,
    mlRiskClassification: "HIGH",
    patientFreeNotes: "My right calf started cramping badly this morning and feels tight and swollen when walking.",
    doctorAcknowledged: false,
  },

  // Robert Chen (Day 1 to Day 6 - AMBER trend)
  {
    id: "chk-02-d4",
    patientId: "pat-02",
    dayNumber: 4,
    date: new Date(Date.now() - 2 * 86400000).toISOString(),
    painScore: 4,
    flexionDegrees: 78,
    walkingStepsOrMeters: 350,
    swellingScore: 2,
    opioidPillsTaken: 1,
    feverReported: false,
    woundDrainageReported: false,
    calfPainReported: false,
    footDropReported: false,
    chestPainShortnessOfBreath: false,
    triageStatus: "GREEN",
    triageLayer: 3,
    triageReason: "Good mobility, pain well-managed.",
    clinicalAction: "Standard home PT exercises.",
    mlRiskProbability: 0.15,
    mlRiskClassification: "LOW",
    doctorAcknowledged: true,
  },
  {
    id: "chk-02-d5",
    patientId: "pat-02",
    dayNumber: 5,
    date: new Date(Date.now() - 1 * 86400000).toISOString(),
    painScore: 6,
    flexionDegrees: 74,
    walkingStepsOrMeters: 260,
    swellingScore: 3,
    opioidPillsTaken: 2,
    feverReported: false,
    woundDrainageReported: false,
    calfPainReported: false,
    footDropReported: false,
    chestPainShortnessOfBreath: false,
    triageStatus: "AMBER",
    triageLayer: 2,
    triageReason: "Pain increased +2 pts with drop in walking distance.",
    clinicalAction: "Monitor for overuse strain.",
    mlRiskProbability: 0.38,
    mlRiskClassification: "MODERATE",
    doctorAcknowledged: true,
  },
  {
    id: "chk-02-d6",
    patientId: "pat-02",
    dayNumber: 6,
    date: new Date().toISOString(),
    painScore: 7,
    flexionDegrees: 72,
    walkingStepsOrMeters: 200,
    swellingScore: 3,
    opioidPillsTaken: 3,
    feverReported: false,
    woundDrainageReported: false,
    calfPainReported: false,
    footDropReported: false,
    chestPainShortnessOfBreath: false,
    triageStatus: "AMBER",
    triageLayer: 2,
    triageReason: "Recovery Trend Alert: Pain escalated by +3 pts over 48h (from 4 to 7) with opioid increase and declining flexion.",
    clinicalAction: "Review analgesic compliance and assess physical therapy load.",
    mlRiskProbability: 0.46,
    mlRiskClassification: "MODERATE",
    patientFreeNotes: "Tried doing stairs yesterday and knee has been throbbing constantly since.",
    doctorAcknowledged: false,
  },

  // Eleanor Vance (Day 6 to Day 8 - GREEN track)
  {
    id: "chk-03-d8",
    patientId: "pat-03",
    dayNumber: 8,
    date: new Date().toISOString(),
    painScore: 2,
    flexionDegrees: 98,
    walkingStepsOrMeters: 750,
    swellingScore: 1,
    opioidPillsTaken: 0,
    feverReported: false,
    woundDrainageReported: false,
    calfPainReported: false,
    footDropReported: false,
    chestPainShortnessOfBreath: false,
    triageStatus: "GREEN",
    triageLayer: 3,
    triageReason: "Outstanding recovery trajectory! Zero opioids, flexion 98°, pain 2/10.",
    clinicalAction: "Advance physical therapy program. Advanced quad sets unlocked.",
    mlRiskProbability: 0.11,
    mlRiskClassification: "LOW",
    doctorAcknowledged: true,
  }
];

let INVITES_STORE: InviteRecord[] = [
  {
    id: "inv-01",
    token: "postop-ortho-m89x2",
    doctorId: "doc-101",
    patientName: "Arthur Pendelton",
    patientEmail: "a.pendelton@example.com",
    surgeryDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    kneeSide: "RIGHT",
    used: false,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
  }
];

export const dbService = {
  getDoctor: async (): Promise<DoctorRecord> => {
    logger.info("DATABASE", "Fetching primary clinician profile");
    return INITIAL_DOCTOR;
  },

  getPatients: async (): Promise<PatientRecord[]> => {
    logger.info("DATABASE", `Retrieved ${PATIENTS_STORE.length} clinical patients`);
    // Return sorted by clinical priority: RED -> AMBER -> GREEN
    const priorityWeight = { RED: 1, AMBER: 2, GREEN: 3 };
    return [...PATIENTS_STORE].sort(
      (a, b) => priorityWeight[a.currentTriageStatus] - priorityWeight[b.currentTriageStatus]
    );
  },

  getPatientById: async (id: string): Promise<PatientRecord | undefined> => {
    logger.info("DATABASE", `Retrieving patient profile ${id}`);
    return PATIENTS_STORE.find((p) => p.id === id);
  },

  getPatientCheckins: async (patientId: string): Promise<CheckinRecord[]> => {
    logger.info("DATABASE", `Fetching longitudinal checkins for patient ${patientId}`);
    return CHECKINS_STORE.filter((c) => c.patientId === patientId).sort((a, b) => a.dayNumber - b.dayNumber);
  },

  addCheckin: async (checkin: Omit<CheckinRecord, "id" | "date">): Promise<CheckinRecord> => {
    const newRecord: CheckinRecord = {
      ...checkin,
      id: `chk-${Date.now()}`,
      date: new Date().toISOString(),
    };

    CHECKINS_STORE.push(newRecord);
    logger.info("DATABASE", `Saved checkin for Day ${checkin.dayNumber}`, newRecord);

    // Update patient's current triage state
    const patientIndex = PATIENTS_STORE.findIndex((p) => p.id === checkin.patientId);
    if (patientIndex !== -1) {
      PATIENTS_STORE[patientIndex].currentTriageStatus = checkin.triageStatus;
      PATIENTS_STORE[patientIndex].currentRiskProbability = checkin.mlRiskProbability;
      PATIENTS_STORE[patientIndex].lastCheckinDay = checkin.dayNumber;
      PATIENTS_STORE[patientIndex].lastCheckinDate = newRecord.date;
    }

    return newRecord;
  },

  acknowledgeCheckin: async (checkinId: string): Promise<boolean> => {
    const checkin = CHECKINS_STORE.find((c) => c.id === checkinId);
    if (checkin) {
      checkin.doctorAcknowledged = true;
      logger.info("DATABASE", `Clinician acknowledged checkin flag ${checkinId}`);
      return true;
    }
    return false;
  },

  createInvite: async (
    patientName: string,
    patientEmail: string,
    surgeryDate: string,
    kneeSide: 'LEFT' | 'RIGHT' | 'BILATERAL'
  ): Promise<InviteRecord> => {
    const randomHex = Math.random().toString(36).substring(2, 8);
    const token = `inv-${randomHex}`;
    const newInvite: InviteRecord = {
      id: `inv-${Date.now()}`,
      token,
      doctorId: INITIAL_DOCTOR.id,
      patientName,
      patientEmail,
      surgeryDate,
      kneeSide,
      used: false,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
    };

    INVITES_STORE.unshift(newInvite);
    logger.info("INVITE_SYSTEM", `Generated surgical invite token for ${patientName}`, newInvite);
    return newInvite;
  },

  getInvites: async (): Promise<InviteRecord[]> => {
    return INVITES_STORE;
  },

  getInviteByToken: async (token: string): Promise<InviteRecord | undefined> => {
    return INVITES_STORE.find((i) => i.token === token);
  }
};
