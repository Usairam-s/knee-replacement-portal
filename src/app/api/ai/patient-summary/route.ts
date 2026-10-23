import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const { patientId } = await request.json();

    if (!patientId) {
      return NextResponse.json(
        { success: false, error: "Missing required patientId" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: "OpenAI API key is not configured" },
        { status: 500 }
      );
    }

    logger.info("API", `Generating clinical recovery brief for patient ${patientId}`);

    // 1. Fetch patient profile
    const patients = await sql`
      SELECT 
        id, name, age, gender, surgery_date AS "surgeryDate",
        knee_side AS "kneeSide", current_triage_status AS "currentTriageStatus",
        current_risk_probability AS "currentRiskProbability",
        last_checkin_day AS "lastCheckinDay",
        baseline_oks AS "baselineOKS",
        comorbidity_count AS "comorbidityCount",
        has_high_bp AS "hasHighBp",
        has_diabetes AS "hasDiabetes",
        has_heart_disease AS "hasHeartDisease",
        has_stroke AS "hasStroke",
        has_arthritis AS "hasArthritis",
        ml_risk_tier AS "mlRiskTier",
        ml_risk_drivers AS "mlRiskDrivers",
        ml_action_plan AS "mlActionPlan"
      FROM patients
      WHERE id = ${patientId}
      LIMIT 1;
    `;

    if (patients.length === 0) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 }
      );
    }

    const patient = patients[0];

    // 2. Fetch all longitudinal check-ins
    const checkins = await sql`
      SELECT 
        day_number AS "dayNumber",
        to_char(date, 'YYYY-MM-DD') AS "date",
        pain_score AS "painScore",
        flexion_degrees AS "flexionDegrees",
        walking_steps_or_meters AS "walkingMeters",
        swelling_score AS "swellingScore",
        opioid_pills_taken AS "opioidPills",
        fever_reported AS "fever",
        wound_drainage_reported AS "woundDrainage",
        calf_pain_reported AS "calfPain",
        foot_drop_reported AS "footDrop",
        chest_pain_shortness_of_breath AS "chestPain",
        triage_status AS "triageStatus",
        triage_reason AS "triageReason",
        clinical_action AS "clinicalAction"
      FROM checkins
      WHERE patient_id = ${patientId}
      ORDER BY day_number ASC;
    `;

    // 3. Assemble clinical data summary prompt
    const checkinHistoryText = checkins.length === 0
      ? "No daily check-ins submitted yet. Patient is at Post-Op Day 1."
      : checkins.map((c: any) => 
          `Day ${c.dayNumber}: Flexion ${c.flexionDegrees}°, Pain ${c.painScore}/10, Walking ${c.walkingMeters}m, Swelling Grade ${c.swellingScore} (0=none, 1=mild, 2=mod, 3=severe), Opioids ${c.opioidPills} pills/day. Red Flags: Fever=${c.fever}, WoundDrainage=${c.woundDrainage}, CalfPain=${c.calfPain}, FootDrop=${c.footDrop}. Status: ${c.triageStatus}. Trigger: ${c.triageReason}`
        ).join("\n");

    // Format ML risk drivers
    let formattedDrivers = "Standard surgical profile";
    if (patient.mlRiskDrivers) {
      if (Array.isArray(patient.mlRiskDrivers)) {
        formattedDrivers = patient.mlRiskDrivers.join("; ");
      } else if (typeof patient.mlRiskDrivers === "string") {
        try {
          const parsed = JSON.parse(patient.mlRiskDrivers);
          formattedDrivers = Array.isArray(parsed) ? parsed.join("; ") : patient.mlRiskDrivers;
        } catch {
          formattedDrivers = patient.mlRiskDrivers;
        }
      }
    }

    const systemPrompt = `You are the Chief Orthopedic Surgeon and Lead Physical Therapist reviewing a Total Knee Arthroplasty (TKA) recovery trajectory. 
Analyze both the pre-operative ML risk model forecast (baseline joint status, OKS, multimorbidity, predicted complication risk) AND the longitudinal daily check-in tele-monitoring data from Day 1 to present. 
Correlate whether the patient's actual recovery trajectory aligns with or diverges from their pre-operative ML risk forecast.
Write an authoritative, rigorous clinical summary using precise medical, biomechanical, and physiotherapeutic terminology (e.g., active range of motion [AROM], Arthrogenic Muscle Inhibition [AMI], Vastus Medialis Obliquus [VMO], capsular distension, Wells criteria for DVT, periprosthetic joint infection [PJI], extensor lag).

Return a strict, valid JSON object with the following schema:
{
  "executiveSummary": "2-3 sentence overarching clinical synthesis of this patient's current trajectory, correlating their pre-op ML risk with active recovery trends or alerts.",
  "kinematicProgress": "Detailed assessment of active knee flexion delta, functional walking distance, and sagittal tibiofemoral mobility.",
  "painAndEffusion": "Assessment of numeric pain score trajectory (NPRS), opioid sparing/weaning, and joint effusion impact on VMO recruitment (AMI).",
  "complicationAnalysis": "Analysis of any reported red flags (DVT symptoms, drainage, fever) or trajectory plateaus and the underlying pathology suspected.",
  "surgeonRecommendations": "2-3 concrete directives for the attending orthopedic surgeon.",
  "physiotherapyDirectives": "2-3 concrete directives for the physical therapist (including whether exercises must be paused or progressed).",
  "triageVerdict": "A short, all-caps verdict (e.g., 'URGENT SURGICAL ESCALATION REQUIRED', 'MODERATE KINEMATIC PLATEAU AUDIT', or 'SAFE CLEARANCE - CONTINUE ACTIVE REHABILITATION')"
}`;

    const userPrompt = `Patient Clinical Profile & Pre-Op AI Risk Model:
- Name: ${patient.name} (${patient.age}y ${patient.gender})
- Surgery Date: ${patient.surgeryDate} (${patient.kneeSide} Knee TKA)
- Pre-op Baseline Oxford Knee Score (OKS): ${patient.baselineOKS || "N/A"}/48
- Multimorbidities: High BP: ${patient.hasHighBp}, Diabetes: ${patient.hasDiabetes}, Heart Disease: ${patient.hasHeartDisease}, Stroke: ${patient.hasStroke}, Arthritis: ${patient.hasArthritis} (Total Comorbidities: ${patient.comorbidityCount})
- Pre-Op ML Risk Probability: ${(patient.currentRiskProbability * 100).toFixed(1)}% (${patient.mlRiskTier || "Standard Risk"})
- Pre-Op ML Key Risk Drivers: ${formattedDrivers}
- Pre-Op ML Recommended Action Plan: ${patient.mlActionPlan || "Standard operative rehabilitation pathway"}
- Current Triage Status: ${patient.currentTriageStatus}
- Total Check-ins Recorded: ${checkins.length} days

Post-Operative Daily Tele-Monitoring Check-in Log:
${checkinHistoryText}

Please correlate the patient's pre-operative ML risk model forecast with their daily check-in recovery data, and generate the comprehensive AI Clinical Recovery Brief now.`;

    const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
    });

    if (!openAiResponse.ok) {
      const errText = await openAiResponse.text();
      logger.error("API", "OpenAI call failed", errText);
      return NextResponse.json(
        { success: false, error: "OpenAI generation failed", details: errText },
        { status: 502 }
      );
    }

    const aiData = await openAiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    const parsedSummary = JSON.parse(content);

    return NextResponse.json({
      success: true,
      summary: parsedSummary,
      generatedAt: new Date().toISOString(),
      patientMeta: {
        id: patient.id,
        name: patient.name,
        currentStatus: patient.currentTriageStatus,
        lastCheckinDay: patient.lastCheckinDay,
        checkinCount: checkins.length,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error("API", "Error generating clinical brief", errorMsg);
    return NextResponse.json(
      { success: false, error: "Failed to generate brief", details: errorMsg },
      { status: 500 }
    );
  }
}
