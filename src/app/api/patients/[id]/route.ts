import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { logger } from "@/lib/logger";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    logger.info("API", `Fetching patient ${id} and longitudinal check-in trajectory from Neon`);

    const patients = await sql`
      SELECT 
        id,
        doctor_id AS "doctorId",
        name,
        email,
        age,
        gender,
        to_char(surgery_date, 'YYYY-MM-DD') AS "surgeryDate",
        knee_side AS "kneeSide",
        phone,
        access_token AS "accessToken",
        passcode AS "passcode",
        current_triage_status AS "currentTriageStatus",
        current_risk_probability AS "currentRiskProbability",
        last_checkin_day AS "lastCheckinDay",
        baseline_oks AS "baselineOKS",
        baseline_eq5d AS "baselineEQ5D",
        comorbidity_count AS "comorbidityCount",
        has_high_bp AS "hasHighBloodPressure",
        has_diabetes AS "hasDiabetes",
        has_heart_disease AS "hasHeartDisease",
        has_stroke AS "hasStroke",
        has_arthritis AS "hasArthritis",
        ml_risk_tier AS "mlRiskTier",
        ml_risk_drivers AS "mlRiskDrivers",
        ml_action_plan AS "mlActionPlan"
      FROM patients
      WHERE id = ${id}
      LIMIT 1;
    `;

    if (patients.length === 0) {
      return NextResponse.json({ success: false, error: "Patient record not found" }, { status: 404 });
    }

    const patient = {
      ...patients[0],
      mlRiskDrivers: typeof patients[0].mlRiskDrivers === "string" ? (() => {
        try { return JSON.parse(patients[0].mlRiskDrivers); } catch { return [patients[0].mlRiskDrivers]; }
      })() : Array.isArray(patients[0].mlRiskDrivers) ? patients[0].mlRiskDrivers : [],
    };

    const checkins = await sql`
      SELECT 
        id,
        patient_id AS "patientId",
        day_number AS "dayNumber",
        date,
        pain_score AS "painScore",
        flexion_degrees AS "flexionDegrees",
        walking_steps_or_meters AS "walkingStepsOrMeters",
        swelling_score AS "swellingScore",
        opioid_pills_taken AS "opioidPillsTaken",
        fever_reported AS "feverReported",
        wound_drainage_reported AS "woundDrainageReported",
        calf_pain_reported AS "calfPainReported",
        foot_drop_reported AS "footDropReported",
        triage_status AS "triageStatus",
        triage_layer AS "triageLayer",
        triage_reason AS "triageReason",
        clinical_action AS "clinicalAction",
        ml_risk_probability AS "mlRiskProbability",
        ml_risk_classification AS "mlRiskClassification",
        patient_free_notes AS "patientFreeNotes",
        doctor_acknowledged AS "doctorAcknowledged"
      FROM checkins
      WHERE patient_id = ${id}
      ORDER BY day_number ASC;
    `;

    return NextResponse.json({
      success: true,
      patient,
      checkins,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error("API", "Failed to retrieve patient profile", errorMsg);
    return NextResponse.json(
      { success: false, error: "System query failed", details: errorMsg },
      { status: 500 }
    );
  }
}
