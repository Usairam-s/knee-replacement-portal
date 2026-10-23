import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";

const ML_API_ENDPOINT =
  process.env.NEXT_PUBLIC_ML_API_URL ||
  "https://yousairam.pythonanywhere.com/predict-risk";

export async function GET() {
  let dbStatus = "Offline";
  let mlModelStatus = "Offline";

  try {
    const res = await sql`SELECT 1 as connected;`;
    if (res.length > 0) dbStatus = "Connected (Neon PostgreSQL)";
  } catch (err: unknown) {
    dbStatus = `Error: ${err instanceof Error ? err.message : String(err)}`;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch("https://yousairam.pythonanywhere.com/", {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) mlModelStatus = "Online (PythonAnywhere WSGI)";
  } catch (err: unknown) {
    mlModelStatus = `Unreachable: ${err instanceof Error ? err.message : String(err)}`;
  }

  return NextResponse.json({
    service: "PostOp-Check MedTech Backend API",
    status: "Healthy",
    timestamp: new Date().toISOString(),
    database: dbStatus,
    machineLearningAPI: {
      endpoint: ML_API_ENDPOINT,
      status: mlModelStatus,
    },
  });
}
