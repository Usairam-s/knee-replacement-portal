import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { logger } from "@/lib/logger";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    logger.info("API", `Validating surgical token ${token} against Neon`);

    const invites = await sql`
      SELECT 
        it.id,
        it.token,
        it.patient_name AS "patientName",
        it.patient_email AS "patientEmail",
        to_char(it.surgery_date, 'YYYY-MM-DD') AS "surgeryDate",
        it.knee_side AS "kneeSide",
        it.used,
        it.expires_at AS "expiresAt",
        d.name AS "doctorName",
        d.hospital AS "doctorHospital",
        d.specialty AS "doctorSpecialty"
      FROM invite_tokens it
      JOIN doctors d ON d.id = it.doctor_id
      WHERE it.token = ${token}
      LIMIT 1;
    `;

    if (invites.length === 0) {
      return NextResponse.json({ success: false, error: "Invalid surgical token" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: invites[0] });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error("API", "Token validation error", errorMsg);
    return NextResponse.json(
      { success: false, error: "Token validation failed", details: errorMsg },
      { status: 500 }
    );
  }
}
