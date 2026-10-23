import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { logger } from "@/lib/logger";

export async function GET(
  request: Request,
  props: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await props.params;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Access token is required" },
        { status: 400 }
      );
    }

    logger.info("API", `Fetching patient profile for access token: ${token}`);

    const patientRows = await sql`
      SELECT 
        p.id,
        p.doctor_id AS "doctorId",
        p.name,
        p.age,
        p.gender,
        to_char(p.surgery_date, 'YYYY-MM-DD') AS "surgeryDate",
        p.knee_side AS "kneeSide",
        p.phone,
        p.access_token AS "accessToken",
        p.passcode,
        p.current_triage_status AS "currentTriageStatus",
        p.current_risk_probability AS "currentRiskProbability",
        p.last_checkin_day AS "lastCheckinDay",
        to_char(p.last_checkin_date, 'YYYY-MM-DD HH24:MI') AS "lastCheckinDate",
        d.name AS "doctorName",
        d.hospital,
        d.specialty
      FROM patients p
      LEFT JOIN doctors d ON p.doctor_id = d.id
      WHERE p.access_token = ${token}
      LIMIT 1;
    `;

    if (patientRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid patient access link" },
        { status: 404 }
      );
    }

    const patient = patientRows[0];

    // Calculate current post-op recovery day
    const surgeryTime = new Date(patient.surgeryDate).getTime();
    const daysSince = Math.max(1, Math.floor((Date.now() - surgeryTime) / 86400000));
    const currentPostOpDay = Math.max(patient.lastCheckinDay || 1, daysSince);

    // Fetch all check-ins for this patient ordered by day_number ASC
    const checkinRows = await sql`
      SELECT 
        id,
        day_number AS "dayNumber",
        to_char(date, 'YYYY-MM-DD HH24:MI') AS "dateFormatted",
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
        chest_pain_shortness_of_breath AS "chestPainShortnessOfBreath",
        patient_free_notes AS "patientFreeNotes",
        triage_status AS "triageStatus",
        triage_layer AS "triageLayer",
        triage_reason AS "triageReason",
        clinical_action AS "clinicalAction",
        ml_risk_probability AS "mlRiskProbability",
        ml_risk_classification AS "mlRiskClassification"
      FROM checkins
      WHERE patient_id = ${patient.id}
      ORDER BY day_number ASC;
    `;

    // Check if patient already completed a check-in today
    const latestCheckin = checkinRows.length > 0 ? checkinRows[checkinRows.length - 1] : null;
    let hasCompletedToday = false;

    if (latestCheckin) {
      const checkinDate = new Date(latestCheckin.date);
      const today = new Date();
      // Considered submitted today if calendar date matches OR check-in day equals currentPostOpDay
      hasCompletedToday =
        checkinDate.toDateString() === today.toDateString() ||
        latestCheckin.dayNumber === currentPostOpDay;
    }

    return NextResponse.json({
      success: true,
      data: {
        patient: {
          id: patient.id,
          name: patient.name,
          age: patient.age,
          gender: patient.gender,
          surgeryDate: patient.surgeryDate,
          kneeSide: patient.kneeSide,
          postOpDay: currentPostOpDay,
          currentTriageStatus: patient.currentTriageStatus,
          doctorName: patient.doctorName || "Orthopedic Surgical Care Team",
          hospital: patient.hospital || "Joint Arthroplasty Center",
          specialty: patient.specialty || "Adult Reconstruction & Joint Arthroplasty",
          hasPasscode: Boolean(patient.passcode),
        },
        hasCompletedToday,
        todayCheckin: hasCompletedToday ? latestCheckin : null,
        history: checkinRows,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error("API", "Failed to retrieve patient portal data", errorMsg);
    return NextResponse.json(
      { success: false, error: "Failed to load patient recovery portal", details: errorMsg },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  props: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await props.params;
    const body = await request.json();
    const { passcode } = body;

    logger.info("API", `Verifying passcode for token: ${token}`);

    const rows = await sql`
      SELECT id, passcode FROM patients WHERE access_token = ${token} LIMIT 1;
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Patient recovery profile not found" },
        { status: 404 }
      );
    }

    const patientPasscode = String(rows[0].passcode || "1234").trim();
    const enteredPasscode = String(passcode || "").trim();

    if (enteredPasscode === patientPasscode) {
      return NextResponse.json({ success: true, verified: true });
    } else {
      return NextResponse.json(
        { success: false, error: "Incorrect 4-digit PIN. Please re-enter the passcode provided by your surgical team." },
        { status: 401 }
      );
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error("API", "Failed to verify passcode", errorMsg);
    return NextResponse.json(
      { success: false, error: "PIN verification failed", details: errorMsg },
      { status: 500 }
    );
  }
}
