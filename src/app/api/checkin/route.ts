import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { logger } from "@/lib/logger";

const ML_API_ENDPOINT =
  process.env.NEXT_PUBLIC_ML_API_URL ||
  "https://yousairam.pythonanywhere.com/predict-risk";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      patientId,
      dayNumber,
      painScore,
      flexionDegrees,
      walkingStepsOrMeters = 0,
      swellingScore = 2,
      opioidPillsTaken = 0,
      feverReported = false,
      woundDrainageReported = false,
      calfPainReported = false,
      footDropReported = false,
      chestPainShortnessOfBreath = false,
      patientFreeNotes = "",
    } = body;

    logger.info("API", `Processing Day ${dayNumber} checkin submission for patient ${patientId}`);

    // Fetch patient baseline and prior checkin from Neon
    const patientRows = await sql`
      SELECT * FROM patients WHERE id = ${patientId} LIMIT 1;
    `;
    const patient = patientRows[0];

    const prevCheckinRows = await sql`
      SELECT pain_score, flexion_degrees, opioid_pills_taken
      FROM checkins
      WHERE patient_id = ${patientId}
      ORDER BY day_number DESC
      LIMIT 1;
    `;
    const prevCheckin = prevCheckinRows[0];

    // -------------------------------------------------------------------------
    // LAYER 1: DETERMINISTIC AAOS RED FLAGS (Immediate Clinical Override)
    // -------------------------------------------------------------------------
    let triageStatus: "RED" | "AMBER" | "GREEN" = "GREEN";
    let triageLayer = 3;
    let triageReason = "Recovery progressing within expected clinical parameters.";
    let clinicalAction = "Continue home rehabilitation exercises and cryotherapy.";
    let mlRiskProbability = 0.12;
    let mlRiskClassification = "LOW";
    let isGatedContentAllowed = true;

    if (calfPainReported) {
      triageStatus = "RED";
      triageLayer = 1;
      triageReason = "Deterministic Rule: Acute calf tenderness and asymmetrical swelling reported (Suspected DVT).";
      clinicalAction = "Urgent duplex venous ultrasound required. Contact surgical team immediately.";
      mlRiskProbability = 0.88;
      mlRiskClassification = "HIGH";
      isGatedContentAllowed = false;
    } else if (feverReported) {
      triageStatus = "RED";
      triageLayer = 1;
      triageReason = "Deterministic Rule: High fever ≥ 101.5°F (38.6°C) reported (Suspected Surgical Site Infection / Sepsis).";
      clinicalAction = "Immediate orthopedic evaluation. Joint aspiration & infection labs required.";
      mlRiskProbability = 0.92;
      mlRiskClassification = "HIGH";
      isGatedContentAllowed = false;
    } else if (woundDrainageReported) {
      triageStatus = "RED";
      triageLayer = 1;
      triageReason = "Deterministic Rule: Purulent wound discharge or incision dehiscence reported.";
      clinicalAction = "Clinical inspection required within 12 hours. Do not commence empirical oral antibiotics.";
      mlRiskProbability = 0.85;
      mlRiskClassification = "HIGH";
      isGatedContentAllowed = false;
    } else if (footDropReported) {
      triageStatus = "RED";
      triageLayer = 1;
      triageReason = "Deterministic Rule: Ankle dorsiflexion weakness / foot drop reported (Peroneal Neuropathy).";
      clinicalAction = "Urgent orthopedic exam. Loosen constricting knee braces or dressings immediately.";
      mlRiskProbability = 0.82;
      mlRiskClassification = "HIGH";
      isGatedContentAllowed = false;
    } else if (chestPainShortnessOfBreath) {
      triageStatus = "RED";
      triageLayer = 1;
      triageReason = "Emergency Rule: Sudden shortness of breath or chest pain reported (Suspected Pulmonary Embolism).";
      clinicalAction = "CALL 911 OR PROCEED TO EMERGENCY ROOM IMMEDIATELY.";
      mlRiskProbability = 0.99;
      mlRiskClassification = "HIGH";
      isGatedContentAllowed = false;
    } else if (prevCheckin) {
      // -----------------------------------------------------------------------
      // LAYER 2: MULTI-DAY RECOVERY TREND ENGINE (Statistical Delta)
      // -----------------------------------------------------------------------
      const painDelta = painScore - prevCheckin.pain_score;
      const flexionDelta = flexionDegrees - prevCheckin.flexion_degrees;

      if (painDelta >= 2.5 && flexionDelta <= 0) {
        triageStatus = "AMBER";
        triageLayer = 2;
        triageReason = `Recovery Trend Alert: Pain escalated by +${painDelta} pts (from ${prevCheckin.pain_score} to ${painScore}) while knee flexion stalled.`;
        clinicalAction = "Review ice/elevation compliance, rest intervals, and check for physical therapy strain.";
        mlRiskProbability = 0.52;
        mlRiskClassification = "MODERATE";
        isGatedContentAllowed = false;
      } else if (opioidPillsTaken - prevCheckin.opioid_pills_taken >= 2 && painScore >= 7) {
        triageStatus = "AMBER";
        triageLayer = 2;
        triageReason = "Recovery Trend Alert: Opioid consumption escalated with severe persistent pain (≥ 7/10).";
        clinicalAction = "Analgesic regimen review recommended to prevent hyperalgesia and dependence.";
        mlRiskProbability = 0.48;
        mlRiskClassification = "MODERATE";
        isGatedContentAllowed = false;
      }
    }

    // -------------------------------------------------------------------------
    // LAYER 3: LIVE ML MODEL INFERENCE (Server-to-Server WSGI API)
    // -------------------------------------------------------------------------
    if (triageStatus === "GREEN" && patient) {
      try {
        const mlPayload = {
          age: patient.age || 65,
          gender: patient.gender === "MALE" ? 1 : 2,
          oks_baseline: patient.baseline_oks || 18.0,
          eq5d_index: patient.baseline_eq5d || 0.42,
          comorbidity_count: patient.comorbidity_count || 2,
          has_heart_disease: patient.has_heart_disease ? 1 : 0,
          has_high_bp: patient.has_high_bp ? 1 : 0,
          has_diabetes: patient.has_diabetes ? 1 : 0,
          has_stroke: patient.has_stroke ? 1 : 0,
          has_arthritis: patient.has_arthritis ? 1 : 0,
        };

        const res = await fetch(ML_API_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mlPayload),
        });

        if (res.ok) {
          const data = await res.json();
          mlRiskProbability = data.risk_probability ?? 0.12;
          mlRiskClassification =
            mlRiskProbability >= 0.60
              ? "HIGH"
              : mlRiskProbability >= 0.25
              ? "MODERATE"
              : "LOW";

          if (mlRiskClassification === "HIGH") {
            triageStatus = "RED";
            triageLayer = 3;
            triageReason = `ML Risk Model: High predicted complication probability (${(mlRiskProbability * 100).toFixed(1)}%) based on multimorbidity profile and baseline joint status.`;
            clinicalAction = "Priority clinical contact recommended to optimize rehabilitation milestones.";
            isGatedContentAllowed = false;
          } else if (mlRiskClassification === "MODERATE" || painScore >= 7) {
            triageStatus = "AMBER";
            triageLayer = 3;
            triageReason = `Moderate complication risk (${(mlRiskProbability * 100).toFixed(1)}%). Current pain score: ${painScore}/10.`;
            clinicalAction = "Continue daily monitoring and adjust rest-to-activity balance.";
            isGatedContentAllowed = false;
          }
        }
      } catch (err) {
        logger.warn("ML_MODEL", "Server-to-server ML call timed out, using baseline rule", err);
      }
    }

    // -------------------------------------------------------------------------
    // PERSIST CHECK-IN TO NEON POSTGRESQL (1-per-day enforcement / update)
    // -------------------------------------------------------------------------
    const existingCheckin = await sql`
      SELECT id FROM checkins
      WHERE patient_id = ${patientId} AND day_number = ${dayNumber}
      ORDER BY created_at DESC
      LIMIT 1;
    `;

    const checkinId = existingCheckin.length > 0 ? existingCheckin[0].id : `chk-${Date.now()}`;

    if (existingCheckin.length > 0) {
      await sql`
        UPDATE checkins
        SET 
          pain_score = ${painScore},
          flexion_degrees = ${flexionDegrees},
          walking_steps_or_meters = ${walkingStepsOrMeters},
          swelling_score = ${swellingScore},
          opioid_pills_taken = ${opioidPillsTaken},
          fever_reported = ${feverReported},
          wound_drainage_reported = ${woundDrainageReported},
          calf_pain_reported = ${calfPainReported},
          foot_drop_reported = ${footDropReported},
          chest_pain_shortness_of_breath = ${chestPainShortnessOfBreath},
          patient_free_notes = ${patientFreeNotes},
          triage_status = ${triageStatus},
          triage_layer = ${triageLayer},
          triage_reason = ${triageReason},
          clinical_action = ${clinicalAction},
          ml_risk_probability = ${mlRiskProbability},
          ml_risk_classification = ${mlRiskClassification},
          doctor_acknowledged = FALSE,
          date = CURRENT_TIMESTAMP
        WHERE id = ${checkinId};
      `;
      logger.info("API", `Updated existing Day ${dayNumber} checkin ${checkinId} with status ${triageStatus}`);
    } else {
      await sql`
        INSERT INTO checkins (
          id, patient_id, day_number, pain_score, flexion_degrees, walking_steps_or_meters,
          swelling_score, opioid_pills_taken, fever_reported, wound_drainage_reported,
          calf_pain_reported, foot_drop_reported, chest_pain_shortness_of_breath,
          patient_free_notes, triage_status, triage_layer, triage_reason,
          clinical_action, ml_risk_probability, ml_risk_classification, doctor_acknowledged
        ) VALUES (
          ${checkinId}, ${patientId}, ${dayNumber}, ${painScore}, ${flexionDegrees},
          ${walkingStepsOrMeters}, ${swellingScore}, ${opioidPillsTaken}, ${feverReported},
          ${woundDrainageReported}, ${calfPainReported}, ${footDropReported},
          ${chestPainShortnessOfBreath}, ${patientFreeNotes}, ${triageStatus},
          ${triageLayer}, ${triageReason}, ${clinicalAction}, ${mlRiskProbability},
          ${mlRiskClassification}, FALSE
        );
      `;
      logger.info("API", `Successfully inserted Day ${dayNumber} checkin ${checkinId} with status ${triageStatus}`);
    }

    // Update patient's current status in Neon
    await sql`
      UPDATE patients
      SET 
        current_triage_status = ${triageStatus},
        current_risk_probability = ${mlRiskProbability},
        last_checkin_day = ${dayNumber},
        last_checkin_date = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${patientId};
    `;

    return NextResponse.json({
      success: true,
      data: {
        id: checkinId,
        triageStatus,
        triageLayer,
        triageReason,
        clinicalAction,
        mlRiskProbability,
        mlRiskClassification,
        isGatedContentAllowed,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error("API", "Failed to process patient check-in", errorMsg);
    return NextResponse.json(
      { success: false, error: "Check-in processing failed", details: errorMsg },
      { status: 500 }
    );
  }
}
