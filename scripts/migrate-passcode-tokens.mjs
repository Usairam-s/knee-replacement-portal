import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_L5dkqOEWsxT2@ep-curly-sky-b5yq003i-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(connectionString);

async function migrate() {
  try {
    console.log("Adding access_token...");
    await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS access_token TEXT;`;
    console.log("Added access_token");

    console.log("Adding passcode...");
    await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS passcode TEXT DEFAULT '1234';`;
    console.log("Added passcode");

    console.log("Setting email nullable...");
    await sql`ALTER TABLE patients ALTER COLUMN email DROP NOT NULL;`;
    console.log("Email set to nullable");

    console.log("Updating demo patients...");
    await sql`UPDATE patients SET access_token = 'pt-jenkins', passcode = '1234' WHERE id = 'pat-01';`;
    await sql`UPDATE patients SET access_token = 'pt-chen', passcode = '1234' WHERE id = 'pat-02';`;
    await sql`UPDATE patients SET access_token = 'pt-vance', passcode = '1234' WHERE id = 'pat-03';`;
    await sql`UPDATE patients SET access_token = 'pt-miller', passcode = '1234' WHERE id = 'pat-04';`;
    
    // Add unique index on access_token
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_access_token ON patients(access_token);`;
    console.log("Created index on access_token");

    const patients = await sql`SELECT id, name, access_token, passcode, current_triage_status FROM patients;`;
    console.log("Current patients:");
    console.table(patients);
  } catch (err) {
    console.error("Migration error:", err);
  }
}

migrate();
