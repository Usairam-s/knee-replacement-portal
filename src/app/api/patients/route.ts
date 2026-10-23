import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { logger } from "@/lib/logger";

const ML_API_ENDPOINT =
  process.env.NEXT_PUBLIC_ML_API_URL ||
  "https://yousairam.pythonanywhere.com/predict-risk";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get("doctorId");

    logger.info("API", `Fetching triage patients${doctorId ? ` for doctor ${doctorId}` : ""}`);

    const rows = doctorId
      ? await sql`
          SELECT 
            p.id,
            p.doctor_id AS "doctorId",
            d.name AS "doctorName",
            d.email AS "doctorEmail",
            p.name,
            p.email,
            p.age,
            p.gender,
            to_char(p.surgery_date, 'YYYY-MM-DD') AS "surgeryDate",
            p.knee_side AS "kneeSide",
            p.phone,
            p.access_token AS "accessToken",
            p.passcode AS "passcode",
            p.current_triage_status AS "currentTriageStatus",
            p.current_risk_probability AS "currentRiskProbability",
            p.last_checkin_day AS "lastCheckinDay",
            to_char(p.last_checkin_date, 'YYYY-MM-DD HH24:MI') AS "lastCheckinDate",
            p.baseline_oks AS "baselineOKS",
            p.baseline_eq5d AS "baselineEQ5D",
            p.comorbidity_count AS "comorbidityCount",
            p.has_high_bp AS "hasHighBloodPressure",
            p.has_diabetes AS "hasDiabetes",
            p.has_heart_disease AS "hasHeartDisease",
            p.has_stroke AS "hasStroke",
            p.has_arthritis AS "hasArthritis",
            p.ml_risk_tier AS "mlRiskTier",
            p.ml_risk_drivers AS "mlRiskDrivers",
            p.ml_action_plan AS "mlActionPlan"
          FROM patients p
          LEFT JOIN doctors d ON p.doctor_id = d.id
          WHERE p.doctor_id = ${doctorId}
          ORDER BY 
            CASE p.current_triage_status
              WHEN 'RED' THEN 1
              WHEN 'AMBER' THEN 2
              WHEN 'GREEN' THEN 3
              ELSE 4
            END,
            p.last_checkin_day DESC;
        `
      : await sql`
          SELECT 
            p.id,
            p.doctor_id AS "doctorId",
            d.name AS "doctorName",
            d.email AS "doctorEmail",
            p.name,
            p.email,
            p.age,
            p.gender,
            to_char(p.surgery_date, 'YYYY-MM-DD') AS "surgeryDate",
            p.knee_side AS "kneeSide",
            p.phone,
            p.access_token AS "accessToken",
            p.passcode AS "passcode",
            p.current_triage_status AS "currentTriageStatus",
            p.current_risk_probability AS "currentRiskProbability",
            p.last_checkin_day AS "lastCheckinDay",
            to_char(p.last_checkin_date, 'YYYY-MM-DD HH24:MI') AS "lastCheckinDate",
            p.baseline_oks AS "baselineOKS",
            p.baseline_eq5d AS "baselineEQ5D",
            p.comorbidity_count AS "comorbidityCount",
            p.has_high_bp AS "hasHighBloodPressure",
            p.has_diabetes AS "hasDiabetes",
            p.has_heart_disease AS "hasHeartDisease",
            p.has_stroke AS "hasStroke",
            p.has_arthritis AS "hasArthritis",
            p.ml_risk_tier AS "mlRiskTier",
            p.ml_risk_drivers AS "mlRiskDrivers",
            p.ml_action_plan AS "mlActionPlan"
          FROM patients p
          LEFT JOIN doctors d ON p.doctor_id = d.id
          ORDER BY 
            CASE p.current_triage_status
              WHEN 'RED' THEN 1
              WHEN 'AMBER' THEN 2
              WHEN 'GREEN' THEN 3
              ELSE 4
            END,
            p.last_checkin_day DESC;
        `;

    const parsedRows = rows.map((r: any) => ({
      ...r,
      mlRiskDrivers:
        typeof r.mlRiskDrivers === "string"
          ? (() => {
              try {
                return JSON.parse(r.mlRiskDrivers);
              } catch {
                return [r.mlRiskDrivers];
              }
            })()
          : Array.isArray(r.mlRiskDrivers)
          ? r.mlRiskDrivers
          : [],
    }));

    return NextResponse.json({ success: true, data: parsedRows });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error("API", "Failed to query patients", errorMsg);
    return NextResponse.json(
      { success: false, error: "System query failed", details: errorMsg },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      surgeryDate,
      kneeSide = "RIGHT",
      age = 65,
      gender = "FEMALE",
      phone = "",
      email = "",
      passcode = "1234",
      doctorId = "doc-101",
      doctorName = "Attending Surgeon",
      doctorEmail = "doctor@hospital.org",
      preOpKneeSeverity = "MODERATE", // 'MILD' | 'MODERATE' | 'SEVERE'
      hasHighBp = false,
      hasDiabetes = false,
      hasHeartDisease = false,
      hasStroke = false,
      hasArthritis = false,
      mobilityAssistance = "INDEPENDENT", // 'INDEPENDENT' | 'CANE' | 'WALKER'
    } = body;

    if (!name || !surgeryDate) {
      return NextResponse.json(
        { success: false, error: "Missing required patient name or surgery date" },
        { status: 400 }
      );
    }

    // 1. Ensure the doctor exists in the database before creating the patient
    const existingDoc = await sql`
      SELECT id FROM doctors 
      WHERE id = ${doctorId} OR clerk_id = ${doctorId} OR email = ${doctorEmail}
      LIMIT 1;
    `;

    if (existingDoc.length > 0) {
      await sql`
        UPDATE doctors
        SET 
          id = ${doctorId},
          clerk_id = ${doctorId},
          name = COALESCE(NULLIF(${doctorName}, ''), name),
          email = COALESCE(NULLIF(${doctorEmail}, ''), email),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${existingDoc[0].id};
      `;
    } else {
      await sql`
        INSERT INTO doctors (id, clerk_id, email, name, hospital, specialty)
        VALUES (
          ${doctorId},
          ${doctorId},
          ${doctorEmail || `${doctorId}@hospital.org`},
          ${doctorName || 'Attending Surgeon'},
          'Royal Orthopaedic Joint Arthroplasty Center',
          'Adult Reconstruction & Joint Replacement'
        );
      `;
    }

    // 2. Prepare patient fields & calculate baseline parameters for ML
    const cleanName = String(name).trim();
    const cleanPhone = phone ? String(phone).trim() : null;
    const cleanEmail = email && String(email).trim() ? String(email).trim() : null;
    const cleanPasscode = String(passcode || "1234").trim();
    const ageNum = Number(age) || 65;

    // Age band for LightGBM/XGBoost model: 1: <55, 2: 55-64, 3: 65-74, 4: 75-84, 5: 85+
    const ageBand = ageNum < 55 ? 1 : ageNum < 65 ? 2 : ageNum < 75 ? 3 : ageNum < 85 ? 4 : 5;
    
    // Baseline Oxford Knee Score (OKS): Severe: 12, Moderate: 18, Mild: 28
    const baselineOks = preOpKneeSeverity === "SEVERE" ? 12.0 : preOpKneeSeverity === "MILD" ? 28.0 : 18.0;
    const mobilityScore = mobilityAssistance === "WALKER" ? 3 : mobilityAssistance === "CANE" ? 2 : 1;
    const comorbidityCount =
      (hasHighBp ? 1 : 0) +
      (hasDiabetes ? 1 : 0) +
      (hasHeartDisease ? 1 : 0) +
      (hasStroke ? 1 : 0) +
      (hasArthritis ? 1 : 0);

    // 3. Immediately run the deployed hospital-grade ML Model (XGBoost + LightGBM ensemble)
    let mlRisk = 0.15;
    let mlTier = "LOW RISK / SAFE CLEARANCE";
    let mlDrivers: string[] = [];
    let mlAction = "Standard operative pathway with routine clinical rehabilitation.";

    try {
      const mlPayload = {
        age_band: ageBand,
        gender: gender === "MALE" ? 1 : 2,
        oks_t0_score: baselineOks,
        oks_t0_pain: preOpKneeSeverity === "SEVERE" ? 1 : 2,
        oks_t0_night_pain: preOpKneeSeverity === "SEVERE" ? 1 : 3,
        oks_t0_walking: mobilityAssistance === "WALKER" ? 1 : 2,
        oks_t0_stairs: mobilityAssistance === "WALKER" ? 1 : 2,
        high_bp: hasHighBp ? 1 : 0,
        diabetes: hasDiabetes ? 1 : 0,
        heart_disease: hasHeartDisease ? 1 : 0,
        stroke: hasStroke ? 1 : 0,
        lung_disease: 0,
        t0_mobility: mobilityScore,
        t0_disability: mobilityAssistance === "WALKER" ? 1 : 0,
        t0_eq_vas: preOpKneeSeverity === "SEVERE" ? 50 : 70,
        t0_anxiety: hasDiabetes || hasHeartDisease ? 2 : 1,
      };

      const mlRes = await fetch(ML_API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mlPayload),
      });

      if (mlRes.ok) {
        const mlData = await mlRes.json();
        mlRisk = mlData.risk_score ?? 0.15;
        mlTier = mlData.risk_tier ?? mlTier;
        mlDrivers = mlData.key_risk_drivers || [];
        mlAction = mlData.surgeon_action_plan || mlAction;
      }
    } catch (e) {
      logger.warn("API", "ML service call fallback used", e);
    }

    // 4. Generate unique patient recovery token
    const slug = cleanName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const accessToken = `pt-${slug || "patient"}-${randomSuffix}`;
    const patientId = `pat-${Date.now()}`;

    // Determine baseline triage status from ML risk tier
    const initialTriageStatus =
      mlRisk >= 0.50 || mlTier.toUpperCase().includes("HIGH") || mlTier.toUpperCase().includes("CRITICAL")
        ? "RED"
        : mlRisk >= 0.25 || mlTier.toUpperCase().includes("MODERATE")
        ? "AMBER"
        : "GREEN";

    await sql`
      INSERT INTO patients (
        id, doctor_id, name, email, age, gender, surgery_date, knee_side,
        phone, access_token, passcode, current_triage_status,
        current_risk_probability, last_checkin_day, baseline_oks,
        baseline_eq5d, comorbidity_count, has_high_bp, has_diabetes,
        has_heart_disease, has_stroke, has_arthritis, ml_risk_tier,
        ml_risk_drivers, ml_action_plan
      ) VALUES (
        ${patientId}, ${doctorId}, ${cleanName}, ${cleanEmail}, ${ageNum}, ${gender},
        ${surgeryDate}, ${kneeSide}, ${cleanPhone}, ${accessToken},
        ${cleanPasscode}, ${initialTriageStatus}, ${mlRisk}, 1, ${baselineOks},
        0.42, ${comorbidityCount}, ${hasHighBp}, ${hasDiabetes},
        ${hasHeartDisease}, ${hasStroke}, ${hasArthritis}, ${mlTier},
        ${JSON.stringify(mlDrivers)}, ${mlAction}
      );
    `;

    return NextResponse.json({
      success: true,
      message: "Patient enrolled successfully and linked to doctor",
      data: {
        id: patientId,
        doctorId,
        name: cleanName,
        surgeryDate,
        kneeSide,
        accessToken,
        passcode: cleanPasscode,
        link: `/patient/${accessToken}`,
        mlRiskProbability: mlRisk,
        mlRiskTier: mlTier,
        mlRiskDrivers: mlDrivers,
        mlActionPlan: mlAction,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error("API", "Failed to enroll new patient", errorMsg);
    return NextResponse.json(
      { success: false, error: "Failed to enroll patient in clinical care system", details: errorMsg },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("id");
    const clearAll = searchParams.get("all") === "true";

    if (clearAll) {
      await sql`DELETE FROM checkins;`;
      await sql`DELETE FROM patients;`;
      return NextResponse.json({
        success: true,
        message: "Clinical cohort cleared successfully.",
      });
    }

    if (patientId) {
      logger.info("API", `Deleting patient ${patientId}`);
      await sql`DELETE FROM checkins WHERE patient_id = ${patientId};`;
      await sql`DELETE FROM patients WHERE id = ${patientId};`;
      return NextResponse.json({
        success: true,
        message: `Patient removed from clinical records successfully.`,
      });
    }

    return NextResponse.json(
      { success: false, error: "Missing patient ID" },
      { status: 400 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error("API", "Failed to delete patient data", errorMsg);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
