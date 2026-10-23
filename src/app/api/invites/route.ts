import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      patientName,
      patientEmail,
      surgeryDate,
      kneeSide = "RIGHT",
      doctorId = "doc-101",
    } = body;

    if (!patientName || !surgeryDate) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: patientName and surgeryDate" },
        { status: 400 }
      );
    }

    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const token = `inv-${randomSuffix}`;
    const inviteId = `inv-id-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 14 * 86400000).toISOString();

    logger.info("API", `Creating surgical invite token for ${patientName}`);

    await sql`
      INSERT INTO invite_tokens (
        id, token, doctor_id, patient_name, patient_email, surgery_date, knee_side, used, expires_at
      ) VALUES (
        ${inviteId}, ${token}, ${doctorId}, ${patientName}, ${patientEmail},
        ${surgeryDate}, ${kneeSide}, FALSE, ${expiresAt}
      );
    `;

    return NextResponse.json({
      success: true,
      data: {
        id: inviteId,
        token,
        patientName,
        patientEmail,
        surgeryDate,
        kneeSide,
        expiresAt,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error("API", "Failed to generate invite token", errorMsg);
    return NextResponse.json(
      { success: false, error: "Failed to generate invite", details: errorMsg },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const invites = await sql`
      SELECT 
        id,
        token,
        doctor_id AS "doctorId",
        patient_name AS "patientName",
        patient_email AS "patientEmail",
        to_char(surgery_date, 'YYYY-MM-DD') AS "surgeryDate",
        knee_side AS "kneeSide",
        used,
        expires_at AS "expiresAt"
      FROM invite_tokens
      ORDER BY created_at DESC;
    `;

    return NextResponse.json({ success: true, data: invites });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch invites", details: errorMsg },
      { status: 500 }
    );
  }
}
