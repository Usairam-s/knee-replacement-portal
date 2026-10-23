import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_L5dkqOEWsxT2@ep-curly-sky-b5yq003i-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(connectionString);

async function seed() {
  console.log("Seeding initial clinical cohort to Neon PostgreSQL...");

  // Ensure Doctor exists
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

  // Seed Patients
  const patients = [
    {
      id: 'pat-01',
      doctorId: 'doc-101',
      name: 'Margaret Jenkins',
      email: 'm.jenkins@example.com',
      age: 69,
      gender: 'FEMALE',
      surgeryDate: new Date(Date.now() - 4 * 86400000).toISOString(),
      kneeSide: 'RIGHT',
      phone: '+1 (555) 349-1122',
      currentTriageStatus: 'RED',
      currentRiskProbability: 0.88,
      lastCheckinDay: 4,
      baselineOKS: 14.0,
      baselineEQ5D: 0.38,
      comorbidityCount: 3,
      hasHighBP: true,
      hasDiabetes: true,
      hasArthritis: true,
    },
    {
      id: 'pat-02',
      doctorId: 'doc-101',
      name: 'Robert Chen',
      email: 'r.chen@example.com',
      age: 63,
      gender: 'MALE',
      surgeryDate: new Date(Date.now() - 6 * 86400000).toISOString(),
      kneeSide: 'LEFT',
      phone: '+1 (555) 872-9901',
      currentTriageStatus: 'AMBER',
      currentRiskProbability: 0.46,
      lastCheckinDay: 6,
      baselineOKS: 19.0,
      baselineEQ5D: 0.49,
      comorbidityCount: 2,
      hasHighBP: true,
      hasDiabetes: false,
      hasArthritis: true,
    },
    {
      id: 'pat-03',
      doctorId: 'doc-101',
      name: 'Eleanor Vance',
      email: 'e.vance@example.com',
      age: 58,
      gender: 'FEMALE',
      surgeryDate: new Date(Date.now() - 8 * 86400000).toISOString(),
      kneeSide: 'RIGHT',
      phone: '+1 (555) 431-7788',
      currentTriageStatus: 'GREEN',
      currentRiskProbability: 0.11,
      lastCheckinDay: 8,
      baselineOKS: 24.0,
      baselineEQ5D: 0.65,
      comorbidityCount: 1,
      hasHighBP: false,
      hasDiabetes: false,
      hasArthritis: true,
    },
    {
      id: 'pat-04',
      doctorId: 'doc-101',
      name: 'David Miller',
      email: 'd.miller@example.com',
      age: 72,
      gender: 'MALE',
      surgeryDate: new Date(Date.now() - 11 * 86400000).toISOString(),
      kneeSide: 'RIGHT',
      phone: '+1 (555) 602-3344',
      currentTriageStatus: 'GREEN',
      currentRiskProbability: 0.14,
      lastCheckinDay: 11,
      baselineOKS: 21.0,
      baselineEQ5D: 0.58,
      comorbidityCount: 2,
      hasHighBP: true,
      hasDiabetes: false,
      hasArthritis: true,
    }
  ];

  for (const p of patients) {
    await sql`
      INSERT INTO patients (
        id, doctor_id, name, email, age, gender, surgery_date, knee_side, phone,
        current_triage_status, current_risk_probability, last_checkin_day,
        baseline_oks, baseline_eq5d, comorbidity_count, has_high_bp, has_diabetes, has_arthritis
      ) VALUES (
        ${p.id}, ${p.doctorId}, ${p.name}, ${p.email}, ${p.age}, ${p.gender},
        ${p.surgeryDate}, ${p.kneeSide}, ${p.phone}, ${p.currentTriageStatus},
        ${p.currentRiskProbability}, ${p.lastCheckinDay}, ${p.baselineOKS},
        ${p.baselineEQ5D}, ${p.comorbidityCount}, ${p.hasHighBP}, ${p.hasDiabetes}, ${p.hasArthritis}
      )
      ON CONFLICT (id) DO UPDATE SET
        current_triage_status = EXCLUDED.current_triage_status,
        current_risk_probability = EXCLUDED.current_risk_probability,
        last_checkin_day = EXCLUDED.last_checkin_day;
    `;
  }
  console.log("✓ Patient cohort inserted/updated in Neon.");

  // Seed Checkins for Margaret Jenkins (Day 1 to 4)
  await sql`
    INSERT INTO checkins (
      id, patient_id, day_number, pain_score, flexion_degrees, walking_steps_or_meters,
      swelling_score, opioid_pills_taken, calf_pain_reported, triage_status, triage_layer,
      triage_reason, clinical_action, ml_risk_probability, ml_risk_classification, doctor_acknowledged
    ) VALUES (
      'chk-01-d4', 'pat-01', 4, 8, 60, 80, 5, 3, TRUE, 'RED', 1,
      'Deterministic Rule: Acute calf tenderness and asymmetrical lower extremity swelling reported (Suspected DVT).',
      'Urgent duplex venous ultrasound required. Contact patient immediately.',
      0.88, 'HIGH', FALSE
    )
    ON CONFLICT (id) DO NOTHING;
  `;

  // Seed Checkins for Robert Chen (Day 6)
  await sql`
    INSERT INTO checkins (
      id, patient_id, day_number, pain_score, flexion_degrees, walking_steps_or_meters,
      swelling_score, opioid_pills_taken, triage_status, triage_layer,
      triage_reason, clinical_action, ml_risk_probability, ml_risk_classification, doctor_acknowledged
    ) VALUES (
      'chk-02-d6', 'pat-02', 6, 7, 72, 200, 3, 3, 'AMBER', 2,
      'Recovery Trend Alert: Pain escalated by +3 pts over 48h (from 4 to 7) with opioid increase and declining flexion.',
      'Review analgesic compliance and assess physical therapy load.',
      0.46, 'MODERATE', FALSE
    )
    ON CONFLICT (id) DO NOTHING;
  `;

  // Seed Checkins for Eleanor Vance (Day 8)
  await sql`
    INSERT INTO checkins (
      id, patient_id, day_number, pain_score, flexion_degrees, walking_steps_or_meters,
      swelling_score, opioid_pills_taken, triage_status, triage_layer,
      triage_reason, clinical_action, ml_risk_probability, ml_risk_classification, doctor_acknowledged
    ) VALUES (
      'chk-03-d8', 'pat-03', 8, 2, 98, 750, 1, 0, 'GREEN', 3,
      'Outstanding recovery trajectory! Zero opioids, flexion 98°, pain 2/10.',
      'Advance physical therapy program. Advanced quad sets unlocked.',
      0.11, 'LOW', TRUE
    )
    ON CONFLICT (id) DO NOTHING;
  `;

  // Seed active surgical invite token
  await sql`
    INSERT INTO invite_tokens (
      id, token, doctor_id, patient_name, patient_email, surgery_date, knee_side, used, expires_at
    ) VALUES (
      'inv-01', 'inv-m89x2', 'doc-101', 'Arthur Pendelton', 'a.pendelton@example.com',
      ${new Date(Date.now() + 2 * 86400000).toISOString()}, 'RIGHT', FALSE,
      ${new Date(Date.now() + 14 * 86400000).toISOString()}
    )
    ON CONFLICT (id) DO NOTHING;
  `;

  console.log("✨ Seed successfully completed on Neon PostgreSQL!");
}

seed().catch(err => {
  console.error("Seed error:", err);
  process.exit(1);
});
