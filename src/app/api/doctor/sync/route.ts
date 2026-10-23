import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      email,
      name,
      hospital = "Royal Orthopaedic Joint Arthroplasty Center",
      specialty = "Adult Reconstruction & Joint Replacement",
      phone = "",
    } = body;

    if (!id || !email) {
      return NextResponse.json(
        { success: false, error: "Missing doctor ID or email" },
        { status: 400 }
      );
    }

    const cleanName = name || email.split("@")[0];

    logger.info("API", `Syncing doctor ${cleanName} (${id}, ${email}) to Neon PostgreSQL`);

    // Check if doctor exists by id, clerk_id, or email
    const existing = await sql`
      SELECT id, email FROM doctors 
      WHERE id = ${id} OR clerk_id = ${id} OR email = ${email}
      LIMIT 1;
    `;

    if (existing.length > 0) {
      await sql`
        UPDATE doctors
        SET 
          id = ${id},
          clerk_id = ${id},
          email = ${email},
          name = ${cleanName},
          hospital = ${hospital},
          specialty = ${specialty},
          phone = COALESCE(NULLIF(${phone}, ''), phone),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${existing[0].id};
      `;
      logger.info("API", `Updated doctor profile for ${id}`);
    } else {
      await sql`
        INSERT INTO doctors (id, clerk_id, email, name, hospital, specialty, phone)
        VALUES (
          ${id},
          ${id},
          ${email},
          ${cleanName},
          ${hospital},
          ${specialty},
          ${phone || null}
        );
      `;
      logger.info("API", `Inserted new doctor profile for ${id}`);
    }

    return NextResponse.json({
      success: true,
      message: "Doctor profile synced to database successfully",
      doctor: {
        id,
        email,
        name: cleanName,
        hospital,
        specialty,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error("API", "Failed to sync doctor to database", errorMsg);
    return NextResponse.json(
      { success: false, error: "Failed to sync doctor to database", details: errorMsg },
      { status: 500 }
    );
  }
}
