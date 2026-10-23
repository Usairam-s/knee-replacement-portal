/**
 * Neon PostgreSQL Database Schema Initialization
 * Connects directly using pg / @neondatabase/serverless to provision the PostOp-Check schema.
 */

import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_L5dkqOEWsxT2@ep-curly-sky-b5yq003i-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const sql = neon(connectionString);

async function main() {
  console.log("Connecting to Neon PostgreSQL...");

  await sql`
    CREATE TABLE IF NOT EXISTS doctors (
      id TEXT PRIMARY KEY,
      clerk_id TEXT UNIQUE,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      hospital TEXT NOT NULL DEFAULT 'Royal Orthopaedic Joint Arthroplasty Center',
      specialty TEXT NOT NULL DEFAULT 'Adult Reconstruction & Joint Replacement',
      phone TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  console.log("✓ 'doctors' table verified.");

  await sql`
    CREATE TABLE IF NOT EXISTS invite_tokens (
      id TEXT PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      doctor_id TEXT REFERENCES doctors(id) ON DELETE CASCADE,
      patient_name TEXT,
      patient_email TEXT,
      surgery_date TIMESTAMP WITH TIME ZONE NOT NULL,
      knee_side TEXT NOT NULL DEFAULT 'RIGHT',
      used BOOLEAN NOT NULL DEFAULT FALSE,
      used_at TIMESTAMP WITH TIME ZONE,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  console.log("✓ 'invite_tokens' table verified.");

  await sql`
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      clerk_id TEXT UNIQUE,
      doctor_id TEXT REFERENCES doctors(id) ON DELETE RESTRICT,
      invite_token_id TEXT REFERENCES invite_tokens(id),
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      age INTEGER NOT NULL DEFAULT 65,
      gender TEXT NOT NULL DEFAULT 'FEMALE',
      surgery_date TIMESTAMP WITH TIME ZONE NOT NULL,
      knee_side TEXT NOT NULL DEFAULT 'RIGHT',
      phone TEXT,
      emergency_contact TEXT,
      baseline_oks DOUBLE PRECISION NOT NULL DEFAULT 18.0,
      baseline_eq5d DOUBLE PRECISION NOT NULL DEFAULT 0.42,
      comorbidity_count INTEGER NOT NULL DEFAULT 2,
      has_heart_disease BOOLEAN NOT NULL DEFAULT FALSE,
      has_high_bp BOOLEAN NOT NULL DEFAULT TRUE,
      has_diabetes BOOLEAN NOT NULL DEFAULT FALSE,
      has_stroke BOOLEAN NOT NULL DEFAULT FALSE,
      has_arthritis BOOLEAN NOT NULL DEFAULT TRUE,
      current_triage_status TEXT NOT NULL DEFAULT 'GREEN',
      current_risk_probability DOUBLE PRECISION NOT NULL DEFAULT 0.12,
      last_checkin_day INTEGER NOT NULL DEFAULT 1,
      last_checkin_date TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  console.log("✓ 'patients' table verified.");

  await sql`
    CREATE TABLE IF NOT EXISTS checkins (
      id TEXT PRIMARY KEY,
      patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
      day_number INTEGER NOT NULL,
      date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      fever_reported BOOLEAN NOT NULL DEFAULT FALSE,
      wound_drainage_reported BOOLEAN NOT NULL DEFAULT FALSE,
      calf_pain_reported BOOLEAN NOT NULL DEFAULT FALSE,
      foot_drop_reported BOOLEAN NOT NULL DEFAULT FALSE,
      chest_pain_shortness_of_breath BOOLEAN NOT NULL DEFAULT FALSE,
      pain_score INTEGER NOT NULL,
      flexion_degrees INTEGER NOT NULL,
      walking_steps_or_meters INTEGER NOT NULL,
      swelling_score INTEGER NOT NULL DEFAULT 2,
      opioid_pills_taken INTEGER NOT NULL DEFAULT 0,
      patient_free_notes TEXT,
      triage_status TEXT NOT NULL DEFAULT 'GREEN',
      triage_layer INTEGER NOT NULL DEFAULT 3,
      triage_reason TEXT NOT NULL,
      clinical_action TEXT,
      ml_risk_probability DOUBLE PRECISION NOT NULL DEFAULT 0.10,
      ml_risk_classification TEXT NOT NULL DEFAULT 'LOW',
      doctor_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
      doctor_notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  console.log("✓ 'checkins' table verified.");

  // Insert initial default doctor if not exists
  await sql`
    INSERT INTO doctors (id, clerk_id, email, name, hospital, specialty, phone)
    VALUES (
      'doc-101',
      'clerk_doc_default',
      'a.wright@ortho-hospital.org',
      'Dr. Alistair Wright, MD, FRCS',
      'Royal Orthopaedic Joint Arthroplasty Center',
      'Adult Reconstruction & Joint Replacement',
      '+1 (555) 234-8900'
    )
    ON CONFLICT (id) DO NOTHING;
  `;
  console.log("✓ Default clinician record initialized in Neon.");

  console.log("✨ All tables and relations successfully initialized on Neon PostgreSQL!");
}

main().catch((err) => {
  console.error("Database initialization error:", err);
  process.exit(1);
});
