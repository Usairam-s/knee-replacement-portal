import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { logger } from "@/lib/logger";

interface PatientTemplate {
  name: string;
  age: number;
  gender: "FEMALE" | "MALE";
  side: "LEFT" | "RIGHT";
  preOpSeverity: "MILD" | "MODERATE" | "SEVERE";
  mobility: "INDEPENDENT" | "CANE" | "WALKER";
  highBp: boolean;
  diabetes: boolean;
  heartDisease: boolean;
  stroke: boolean;
  arthritis: boolean;
  baselineOks: number;
  mlRisk: number;
  mlTier: string;
  mlDrivers: string[];
  mlAction: string;
  finalStatus: "RED" | "AMBER" | "GREEN";
  days: {
    day: number;
    flexion: number;
    pain: number;
    walking: number;
    swelling: number;
    opioids: number;
    calf: boolean;
    wound: boolean;
    fever: boolean;
    status: "RED" | "AMBER" | "GREEN";
    reason: string;
    action: string;
  }[];
}

const PATIENT_TEMPLATES: PatientTemplate[] = [
  {
    name: "Sarah Jenkins",
    age: 68,
    gender: "FEMALE",
    side: "RIGHT",
    preOpSeverity: "SEVERE",
    mobility: "CANE",
    highBp: true,
    diabetes: false,
    heartDisease: false,
    stroke: false,
    arthritis: true,
    baselineOks: 12,
    mlRisk: 0.629,
    mlTier: "CRITICAL HIGH RISK / INTENSIVE SURVEILLANCE",
    mlDrivers: [
      "Severe baseline joint degeneration (Pre-op OKS < 15)",
      "High baseline pain and night pain",
      "Prior mobility restriction",
    ],
    mlAction: "Intensive 6-month clinical surveillance with weekly orthopedic check-in.",
    finalStatus: "RED",
    days: [
      { day: 1, flexion: 60, pain: 8, walking: 40, swelling: 2, opioids: 4, calf: false, wound: false, fever: false, status: "RED", reason: "Acute Post-Op Pain (8/10) with High Baseline Risk", action: "Inpatient cryotherapy and multimodal analgesia." },
      { day: 2, flexion: 65, pain: 7, walking: 65, swelling: 2, opioids: 3, calf: false, wound: false, fever: false, status: "AMBER", reason: "Discharge transition pain watch", action: "Active-assisted heel slides and calf pumps." },
      { day: 3, flexion: 70, pain: 6, walking: 90, swelling: 2, opioids: 3, calf: false, wound: false, fever: false, status: "AMBER", reason: "Flexion approaching 70° threshold", action: "Weight-bearing ambulation with walker." },
      { day: 4, flexion: 75, pain: 5, walking: 125, swelling: 1, opioids: 2, calf: false, wound: false, fever: false, status: "GREEN", reason: "Flexion velocity improving and opioid reduction", action: "Continue progressive home PT." },
      { day: 5, flexion: 80, pain: 5, walking: 160, swelling: 1, opioids: 2, calf: false, wound: false, fever: false, status: "GREEN", reason: "80° flexion milestone achieved", action: "Terminal quad sets and seated flexion." },
      { day: 6, flexion: 83, pain: 4, walking: 210, swelling: 1, opioids: 1, calf: false, wound: false, fever: false, status: "GREEN", reason: "Ambulatory tolerance exceeding 200m", action: "Transition from walker to single-point cane." },
      { day: 7, flexion: 85, pain: 4, walking: 250, swelling: 1, opioids: 1, calf: false, wound: false, fever: false, status: "GREEN", reason: "Subacute target approaching 90°", action: "Post-ambulation cryotherapy." },
      { day: 8, flexion: 87, pain: 4, walking: 290, swelling: 1, opioids: 0, calf: false, wound: false, fever: false, status: "GREEN", reason: "Opioid step-down complete", action: "Independent exercise protocol." },
      { day: 9, flexion: 86, pain: 6, walking: 220, swelling: 2, opioids: 1, calf: true, wound: false, fever: false, status: "RED", reason: "Layer 1 Deterministic Red Flag: Acute Unilateral Calf Pain / Posterior Edema", action: "IMMEDIATE EVALUATION: Venous duplex Doppler to rule out DVT." },
      { day: 10, flexion: 85, pain: 7, walking: 180, swelling: 3, opioids: 2, calf: true, wound: false, fever: false, status: "RED", reason: "Layer 1 Deterministic Red Flag: Persistent Calf Pain with Grade III Effusion", action: "URGENT SURGEON AUDIT: Surgical review and thrombosis workup." },
    ],
  },
  {
    name: "Robert Henderson",
    age: 72,
    gender: "MALE",
    side: "LEFT",
    preOpSeverity: "SEVERE",
    mobility: "WALKER",
    highBp: true,
    diabetes: true,
    heartDisease: true,
    stroke: false,
    arthritis: true,
    baselineOks: 11,
    mlRisk: 0.635,
    mlTier: "CRITICAL HIGH RISK / INTENSIVE SURVEILLANCE",
    mlDrivers: [
      "Severe joint compromise (OKS 11/48)",
      "High multimorbidity burden (3 chronic conditions)",
      "Pre-existing mobility deficit",
    ],
    mlAction: "Mandatory multidisciplinary surgical review with pre-habilitation.",
    finalStatus: "RED",
    days: [
      { day: 1, flexion: 55, pain: 8, walking: 30, swelling: 3, opioids: 4, calf: false, wound: false, fever: false, status: "RED", reason: "High Baseline Risk (71%) + Severe Joint Effusion", action: "Elevation, ice, and gentle passive ROM." },
      { day: 2, flexion: 58, pain: 7, walking: 40, swelling: 2, opioids: 3, calf: false, wound: false, fever: false, status: "AMBER", reason: "Pain watch during mobilization", action: "Gentle ankle pumps." },
      { day: 3, flexion: 60, pain: 7, walking: 50, swelling: 2, opioids: 3, calf: false, wound: false, fever: false, status: "AMBER", reason: "Flexion lag (<65° on Day 3)", action: "Passive extension over roll." },
      { day: 4, flexion: 62, pain: 6, walking: 65, swelling: 2, opioids: 2, calf: false, wound: false, fever: false, status: "AMBER", reason: "Slow kinematic velocity", action: "Quad sets with biofeedback." },
      { day: 5, flexion: 65, pain: 6, walking: 80, swelling: 2, opioids: 2, calf: false, wound: false, fever: false, status: "AMBER", reason: "Flexion below 70° on Day 5", action: "Supervised outpatient PT." },
      { day: 6, flexion: 68, pain: 5, walking: 100, swelling: 2, opioids: 2, calf: false, wound: false, fever: false, status: "AMBER", reason: "Gradual improvement", action: "Maintain seated heel slides." },
      { day: 7, flexion: 70, pain: 5, walking: 120, swelling: 1, opioids: 1, calf: false, wound: false, fever: false, status: "AMBER", reason: "70° achieved with persistent stiffness", action: "Active-assisted wall slides." },
      { day: 8, flexion: 70, pain: 7, walking: 90, swelling: 2, opioids: 2, calf: false, wound: true, fever: false, status: "RED", reason: "Layer 1 Red Flag: Persistent Wound Ooze with Serosanguinous Drainage > 72h", action: "URGENT WOUND AUDIT: Examine incision margin for surgical site infection." },
    ],
  },
  {
    name: "Samuel K. Mensah",
    age: 70,
    gender: "MALE",
    side: "LEFT",
    preOpSeverity: "SEVERE",
    mobility: "WALKER",
    highBp: true,
    diabetes: true,
    heartDisease: false,
    stroke: false,
    arthritis: true,
    baselineOks: 13,
    mlRisk: 0.653,
    mlTier: "CRITICAL HIGH RISK / INTENSIVE SURVEILLANCE",
    mlDrivers: ["Severe pre-op joint degradation", "Type 2 Diabetes Mellitus", "Advanced Age"],
    mlAction: "High-surveillance protocol with glycemic control optimization.",
    finalStatus: "RED",
    days: [
      { day: 1, flexion: 55, pain: 9, walking: 25, swelling: 3, opioids: 4, calf: false, wound: false, fever: false, status: "RED", reason: "Severe baseline risk & post-op pain 9/10", action: "Cryo-cuff and high limb elevation." },
      { day: 2, flexion: 60, pain: 8, walking: 35, swelling: 3, opioids: 4, calf: false, wound: false, fever: false, status: "RED", reason: "Persistent severe resting pain", action: "Review pain medication regimen." },
      { day: 3, flexion: 62, pain: 7, walking: 50, swelling: 2, opioids: 3, calf: false, wound: false, fever: false, status: "AMBER", reason: "Flexion improving but velocity lagging", action: "Bedside physical therapy." },
      { day: 4, flexion: 65, pain: 8, walking: 40, swelling: 3, opioids: 3, calf: false, wound: true, fever: true, status: "RED", reason: "Layer 1 Red Flag: Low-Grade Fever (38.2°C) with Wound Erythema", action: "URGENT SURGEON EVALUATION: CBC, ESR/CRP, and wound swab." },
    ],
  },
  {
    name: "Margaret Thatchwell",
    age: 76,
    gender: "FEMALE",
    side: "LEFT",
    preOpSeverity: "SEVERE",
    mobility: "WALKER",
    highBp: true,
    diabetes: false,
    heartDisease: true,
    stroke: true,
    arthritis: true,
    baselineOks: 14,
    mlRisk: 0.611,
    mlTier: "CRITICAL HIGH RISK / INTENSIVE SURVEILLANCE",
    mlDrivers: ["Prior Stroke / Neurological deficit", "Severe baseline joint damage", "Age > 75"],
    mlAction: "Fall-prevention protocol with dedicated PT supervision.",
    finalStatus: "RED",
    days: [
      { day: 1, flexion: 50, pain: 8, walking: 20, swelling: 3, opioids: 4, calf: false, wound: false, fever: false, status: "RED", reason: "Initial high risk & motor hesitation", action: "Assisted transfer training." },
      { day: 2, flexion: 55, pain: 7, walking: 35, swelling: 2, opioids: 3, calf: false, wound: false, fever: false, status: "AMBER", reason: "Cautious mobilization", action: "Quad sets with bolster support." },
      { day: 3, flexion: 58, pain: 8, walking: 25, swelling: 3, opioids: 3, calf: true, wound: false, fever: false, status: "RED", reason: "Layer 1 Red Flag: Unilateral Calf Tenderness with Walking Reluctance", action: "Duplex ultrasound to rule out deep vein thrombosis." },
    ],
  },
  {
    name: "Thomas Bradley",
    age: 74,
    gender: "MALE",
    side: "RIGHT",
    preOpSeverity: "SEVERE",
    mobility: "CANE",
    highBp: true,
    diabetes: false,
    heartDisease: false,
    stroke: false,
    arthritis: true,
    baselineOks: 15,
    mlRisk: 0.542,
    mlTier: "CRITICAL HIGH RISK",
    mlDrivers: ["Advanced degenerative changes", "Age 74", "High blood pressure"],
    mlAction: "Close monitoring of active extension deficit and early discharge safety.",
    finalStatus: "RED",
    days: [
      { day: 1, flexion: 55, pain: 8, walking: 30, swelling: 3, opioids: 4, calf: false, wound: false, fever: false, status: "RED", reason: "High pre-op baseline risk (54%)", action: "Elevation and early ankle pump exercises." },
      { day: 2, flexion: 58, pain: 8, walking: 35, swelling: 3, opioids: 4, calf: false, wound: false, fever: false, status: "RED", reason: "Severe pain unresponsive to baseline analgesia", action: "Consult acute pain management service." },
    ],
  },
  {
    name: "Elena Rostova",
    age: 61,
    gender: "FEMALE",
    side: "RIGHT",
    preOpSeverity: "MODERATE",
    mobility: "INDEPENDENT",
    highBp: true,
    diabetes: false,
    heartDisease: false,
    stroke: false,
    arthritis: true,
    baselineOks: 20,
    mlRisk: 0.385,
    mlTier: "MODERATE RISK SURVEILLANCE",
    mlDrivers: ["Moderate baseline joint restriction (OKS 20)", "Mild flexion contracture"],
    mlAction: "Targeted physical therapy focusing on terminal extension deficit.",
    finalStatus: "AMBER",
    days: [
      { day: 1, flexion: 65, pain: 7, walking: 45, swelling: 2, opioids: 3, calf: false, wound: false, fever: false, status: "AMBER", reason: "Moderate baseline risk surveillance", action: "Terminal knee extension drills." },
      { day: 2, flexion: 68, pain: 6, walking: 60, swelling: 2, opioids: 3, calf: false, wound: false, fever: false, status: "AMBER", reason: "Kinematic progression on watch", action: "Active heel slides." },
      { day: 3, flexion: 72, pain: 5, walking: 85, swelling: 2, opioids: 2, calf: false, wound: false, fever: false, status: "AMBER", reason: "Flexion advancing smoothly", action: "Progress walking distance with cane." },
      { day: 4, flexion: 75, pain: 5, walking: 110, swelling: 1, opioids: 2, calf: false, wound: false, fever: false, status: "GREEN", reason: "Kinematic velocity on track", action: "Begin seated knee extension active holds." },
      { day: 5, flexion: 78, pain: 5, walking: 130, swelling: 2, opioids: 2, calf: false, wound: false, fever: false, status: "AMBER", reason: "Mild swelling increase following exercise", action: "Cold pack after sessions and leg elevation." },
      { day: 6, flexion: 78, pain: 5, walking: 140, swelling: 2, opioids: 2, calf: false, wound: false, fever: false, status: "AMBER", reason: "Layer 2 Alert: Flexion plateau at 78° across 48h", action: "Add passive knee flexion stretch over chair edge." },
    ],
  },
  {
    name: "David K. Miller",
    age: 69,
    gender: "MALE",
    side: "LEFT",
    preOpSeverity: "MODERATE",
    mobility: "CANE",
    highBp: false,
    diabetes: false,
    heartDisease: false,
    stroke: false,
    arthritis: true,
    baselineOks: 22,
    mlRisk: 0.341,
    mlTier: "MODERATE RISK SURVEILLANCE",
    mlDrivers: ["Sub-optimal baseline quadriceps torque", "Mild extension lag"],
    mlAction: "Focus on VMO activation and patellar mobilization.",
    finalStatus: "AMBER",
    days: [
      { day: 1, flexion: 65, pain: 6, walking: 50, swelling: 2, opioids: 3, calf: false, wound: false, fever: false, status: "AMBER", reason: "Early post-op monitoring", action: "Straight leg raises with quad cueing." },
      { day: 2, flexion: 70, pain: 5, walking: 80, swelling: 2, opioids: 2, calf: false, wound: false, fever: false, status: "GREEN", reason: "Good 70° milestone", action: "Continue gait retraining." },
      { day: 3, flexion: 72, pain: 5, walking: 100, swelling: 2, opioids: 2, calf: false, wound: false, fever: false, status: "AMBER", reason: "Layer 2: 10° Extension lag noted during standing", action: "Prone hangs and towel roll extensions." },
      { day: 4, flexion: 74, pain: 5, walking: 115, swelling: 2, opioids: 2, calf: false, wound: false, fever: false, status: "AMBER", reason: "Extension deficit persists", action: "Dedicated physical therapy review." },
    ],
  },
  {
    name: "Patricia O'Connor",
    age: 64,
    gender: "FEMALE",
    side: "RIGHT",
    preOpSeverity: "MODERATE",
    mobility: "INDEPENDENT",
    highBp: true,
    diabetes: false,
    heartDisease: false,
    stroke: false,
    arthritis: true,
    baselineOks: 21,
    mlRisk: 0.312,
    mlTier: "MODERATE RISK SURVEILLANCE",
    mlDrivers: ["Controlled hypertension", "Moderate joint damage"],
    mlAction: "Standard care pathway with regular kinematic check-ins.",
    finalStatus: "AMBER",
    days: [
      { day: 1, flexion: 65, pain: 6, walking: 45, swelling: 2, opioids: 3, calf: false, wound: false, fever: false, status: "AMBER", reason: "Post-op baseline surveillance", action: "Gentle heel slides." },
      { day: 2, flexion: 70, pain: 5, walking: 70, swelling: 2, opioids: 2, calf: false, wound: false, fever: false, status: "GREEN", reason: "Meeting Day 2 targets", action: "Progress cane walking." },
      { day: 3, flexion: 70, pain: 6, walking: 75, swelling: 2, opioids: 2, calf: false, wound: false, fever: false, status: "AMBER", reason: "Layer 2: ROM plateau at 70°", action: "Warm-up before stretching sessions." },
    ],
  },
  {
    name: "Arthur Pendelton",
    age: 62,
    gender: "MALE",
    side: "RIGHT",
    preOpSeverity: "MILD",
    mobility: "INDEPENDENT",
    highBp: false,
    diabetes: false,
    heartDisease: false,
    stroke: false,
    arthritis: true,
    baselineOks: 27,
    mlRisk: 0.142,
    mlTier: "LOW RISK CLEARANCE / OPTIMAL RECOVERY",
    mlDrivers: ["Good baseline joint flexibility (OKS 27)", "No chronic comorbidities"],
    mlAction: "Standard fast-track recovery pathway.",
    finalStatus: "GREEN",
    days: [
      { day: 1, flexion: 70, pain: 5, walking: 60, swelling: 2, opioids: 2, calf: false, wound: false, fever: false, status: "GREEN", reason: "Favorable baseline & excellent early ROM", action: "Early unassisted ambulation training." },
      { day: 2, flexion: 76, pain: 4, walking: 95, swelling: 1, opioids: 2, calf: false, wound: false, fever: false, status: "GREEN", reason: "High flexion velocity progression", action: "Active heel slides and calf stretches." },
      { day: 3, flexion: 82, pain: 3, walking: 140, swelling: 1, opioids: 1, calf: false, wound: false, fever: false, status: "GREEN", reason: "Exceeding Day 3 benchmarks (82°)", action: "Transition off walking aid as tolerated." },
      { day: 4, flexion: 88, pain: 3, walking: 190, swelling: 1, opioids: 1, calf: false, wound: false, fever: false, status: "GREEN", reason: "Approaching 90° functional flexion target", action: "Stationary bike rock-and-roll cadence." },
      { day: 5, flexion: 92, pain: 2, walking: 240, swelling: 1, opioids: 0, calf: false, wound: false, fever: false, status: "GREEN", reason: "Opioid-free with 92° active flexion", action: "Full revolutions on stationary cycling." },
      { day: 6, flexion: 95, pain: 2, walking: 310, swelling: 0, opioids: 0, calf: false, wound: false, fever: false, status: "GREEN", reason: "Optimal recovery trajectory on track", action: "Maintain independent home exercise regimen." },
    ],
  },
  {
    name: "Beatrice Holloway",
    age: 58,
    gender: "FEMALE",
    side: "LEFT",
    preOpSeverity: "MILD",
    mobility: "INDEPENDENT",
    highBp: false,
    diabetes: false,
    heartDisease: false,
    stroke: false,
    arthritis: true,
    baselineOks: 28,
    mlRisk: 0.118,
    mlTier: "LOW RISK CLEARANCE / OPTIMAL RECOVERY",
    mlDrivers: ["Younger surgical candidate (58y)", "High baseline functional score (OKS 28)"],
    mlAction: "Enhanced recovery fast-track pathway.",
    finalStatus: "GREEN",
    days: [
      { day: 1, flexion: 72, pain: 4, walking: 70, swelling: 1, opioids: 2, calf: false, wound: false, fever: false, status: "GREEN", reason: "Excellent initial flexion & low pain", action: "Early active mobilization." },
      { day: 2, flexion: 78, pain: 3, walking: 110, swelling: 1, opioids: 1, calf: false, wound: false, fever: false, status: "GREEN", reason: "Rapid kinematic velocity", action: "Terminal knee extension holds." },
      { day: 3, flexion: 85, pain: 3, walking: 170, swelling: 1, opioids: 1, calf: false, wound: false, fever: false, status: "GREEN", reason: "Exceeding functional goals", action: "Step-ups and balance training." },
      { day: 4, flexion: 90, pain: 2, walking: 230, swelling: 0, opioids: 0, calf: false, wound: false, fever: false, status: "GREEN", reason: "90° threshold achieved on Day 4", action: "Outdoor walking as tolerated." },
      { day: 5, flexion: 96, pain: 2, walking: 320, swelling: 0, opioids: 0, calf: false, wound: false, fever: false, status: "GREEN", reason: "Superior kinematic recovery", action: "Progressive functional rehabilitation." },
    ],
  },
  {
    name: "Franklin Vance",
    age: 63,
    gender: "MALE",
    side: "RIGHT",
    preOpSeverity: "MILD",
    mobility: "INDEPENDENT",
    highBp: true,
    diabetes: false,
    heartDisease: false,
    stroke: false,
    arthritis: true,
    baselineOks: 26,
    mlRisk: 0.155,
    mlTier: "LOW RISK CLEARANCE",
    mlDrivers: ["Good baseline function", "Well-controlled blood pressure"],
    mlAction: "Fast-track recovery with outpatient physiotherapy.",
    finalStatus: "GREEN",
    days: [
      { day: 1, flexion: 68, pain: 5, walking: 55, swelling: 2, opioids: 2, calf: false, wound: false, fever: false, status: "GREEN", reason: "Safe baseline trajectory", action: "Bedside quad sets." },
      { day: 2, flexion: 75, pain: 4, walking: 90, swelling: 1, opioids: 2, calf: false, wound: false, fever: false, status: "GREEN", reason: "Good progress", action: "Gentle heel slides." },
      { day: 3, flexion: 80, pain: 3, walking: 140, swelling: 1, opioids: 1, calf: false, wound: false, fever: false, status: "GREEN", reason: "80° achieved", action: "Independent ambulation." },
      { day: 4, flexion: 86, pain: 2, walking: 200, swelling: 1, opioids: 0, calf: false, wound: false, fever: false, status: "GREEN", reason: "Opioid free and strong quad control", action: "Continue home exercise program." },
    ],
  },
  {
    name: "Grace Montgomery",
    age: 60,
    gender: "FEMALE",
    side: "LEFT",
    preOpSeverity: "MILD",
    mobility: "INDEPENDENT",
    highBp: false,
    diabetes: false,
    heartDisease: false,
    stroke: false,
    arthritis: true,
    baselineOks: 29,
    mlRisk: 0.105,
    mlTier: "LOW RISK CLEARANCE",
    mlDrivers: ["High baseline mobility", "No comorbidity burden"],
    mlAction: "Standard fast-track clinical protocol.",
    finalStatus: "GREEN",
    days: [
      { day: 1, flexion: 70, pain: 4, walking: 65, swelling: 1, opioids: 2, calf: false, wound: false, fever: false, status: "GREEN", reason: "Excellent baseline clearance", action: "Early active mobilization." },
      { day: 2, flexion: 78, pain: 3, walking: 105, swelling: 1, opioids: 1, calf: false, wound: false, fever: false, status: "GREEN", reason: "Meeting all day 2 targets", action: "Independent cane walking." },
      { day: 3, flexion: 85, pain: 2, walking: 160, swelling: 0, opioids: 0, calf: false, wound: false, fever: false, status: "GREEN", reason: "High recovery velocity", action: "Progressive functional milestones." },
    ],
  },
];

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const count = Math.max(1, Math.min(25, Number(body.count) || 8));
    const clearExisting = body.clearExisting !== false; // Default: true (replaces cohort)
    const doctorId = body.doctorId || "user_3KfFrfuRZifUeqMzjaoOkVK1hdB";
    const doctorName = body.doctorName || "Dr. Usairam";
    const doctorEmail = body.doctorEmail || "doctor@hospital.org";

    logger.info("API", `Generating ${count} synthetic test patients (clearExisting=${clearExisting})`);

    // Ensure doctor exists in DB
    await sql`
      INSERT INTO doctors (id, name, email, specialty)
      VALUES (${doctorId}, ${doctorName}, ${doctorEmail}, 'Orthopedic Arthroplasty')
      ON CONFLICT (id) DO UPDATE 
      SET name = EXCLUDED.name, email = EXCLUDED.email;
    `;

    if (clearExisting) {
      await sql`DELETE FROM checkins;`;
      await sql`DELETE FROM patients;`;
    }

    // Pick templates up to count
    const selectedTemplates: PatientTemplate[] = [];
    for (let i = 0; i < count; i++) {
      const template = PATIENT_TEMPLATES[i % PATIENT_TEMPLATES.length];
      if (i >= PATIENT_TEMPLATES.length) {
        // Add random variation for counts > template pool
        const copy = JSON.parse(JSON.stringify(template));
        copy.name = `${template.name} (${String.fromCharCode(65 + Math.floor(i / PATIENT_TEMPLATES.length))})`;
        selectedTemplates.push(copy);
      } else {
        selectedTemplates.push(template);
      }
    }

    let insertedPatients = 0;
    let insertedCheckins = 0;

    for (let i = 0; i < selectedTemplates.length; i++) {
      const p = selectedTemplates[i];
      const pId = `pat-${Date.now()}-${i + 1}`;
      const slug = p.name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
      const pToken = `pt-${slug}-${Math.random().toString(36).substring(2, 6)}`;
      const pPasscode = "1234";

      const totalDays = p.days.length;
      const surgeryDateStr = new Date(Date.now() - totalDays * 86400000).toISOString().split("T")[0];
      const comorbidityCount = (p.highBp ? 1 : 0) + (p.diabetes ? 1 : 0) + (p.heartDisease ? 1 : 0) + (p.stroke ? 1 : 0) + (p.arthritis ? 1 : 0);

      await sql`
        INSERT INTO patients (
          id, doctor_id, name, email, age, gender, surgery_date, knee_side,
          phone, access_token, passcode, current_triage_status,
          current_risk_probability, last_checkin_day, baseline_oks,
          baseline_eq5d, comorbidity_count, has_high_bp, has_diabetes,
          has_heart_disease, has_stroke, has_arthritis, ml_risk_tier,
          ml_risk_drivers, ml_action_plan
        ) VALUES (
          ${pId}, ${doctorId}, ${p.name}, ${`${slug}@example.com`}, ${p.age}, ${p.gender},
          ${surgeryDateStr}, ${p.side}, ${`+1 (555) 431-${1000 + i}`}, ${pToken},
          ${pPasscode}, ${p.finalStatus}, ${p.mlRisk}, ${totalDays}, ${p.baselineOks},
          0.45, ${comorbidityCount}, ${p.highBp}, ${p.diabetes},
          ${p.heartDisease}, ${p.stroke}, ${p.arthritis}, ${p.mlTier},
          ${JSON.stringify(p.mlDrivers)}, ${p.mlAction}
        );
      `;
      insertedPatients++;

      // Insert all days for this patient
      for (const d of p.days) {
        const cId = `chk-${pId}-${d.day}`;
        const checkinDate = new Date(Date.now() - (totalDays - d.day) * 86400000).toISOString();
        const layer = d.status === "RED" ? 1 : d.status === "AMBER" ? 2 : 4;

        await sql`
          INSERT INTO checkins (
            id, patient_id, day_number, date, pain_score, flexion_degrees,
            walking_steps_or_meters, swelling_score, opioid_pills_taken,
            fever_reported, wound_drainage_reported, calf_pain_reported,
            foot_drop_reported, triage_status, triage_layer, triage_reason,
            clinical_action, ml_risk_probability, ml_risk_classification,
            doctor_acknowledged
          ) VALUES (
            ${cId}, ${pId}, ${d.day}, ${checkinDate}, ${d.pain}, ${d.flexion},
            ${d.walking}, ${d.swelling}, ${d.opioids}, ${d.fever}, ${d.wound},
            ${d.calf}, false, ${d.status}, ${layer}, ${d.reason}, ${d.action},
            ${p.mlRisk}, ${p.mlRisk >= 0.5 ? "HIGH" : p.mlRisk >= 0.25 ? "MODERATE" : "LOW"}, false
          );
        `;
        insertedCheckins++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully generated ${insertedPatients} test patients with ${insertedCheckins} daily check-in records.`,
      patientsGenerated: insertedPatients,
      checkinsGenerated: insertedCheckins,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error("API", "Failed to generate test cohort data", errorMsg);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
