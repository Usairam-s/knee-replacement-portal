import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { checkinId, doctorNotes = "" } = body;

    if (!checkinId) {
      return NextResponse.json({ success: false, error: "checkinId is required" }, { status: 400 });
    }

    logger.info("API", `Doctor acknowledging checkin flag: ${checkinId}`);

    await sql`
      UPDATE checkins
      SET 
        doctor_acknowledged = TRUE,
        doctor_notes = ${doctorNotes}
      WHERE id = ${checkinId};
    `;

    return NextResponse.json({ success: true, message: "Flag acknowledged and recorded." });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error("API", "Failed to acknowledge flag", errorMsg);
    return NextResponse.json(
      { success: false, error: "Failed to acknowledge checkin", details: errorMsg },
      { status: 500 }
    );
  }
}
