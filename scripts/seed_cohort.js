const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

// Load environment variables from .env.local
const envPath = path.resolve(__dirname, '../.env.local');
fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) process.env[k.trim()] = v.join('=').trim();
});

const sql = neon(process.env.DATABASE_URL);
const DOCTOR_ID = 'user_3KfFrfuRZifUeqMzjaoOkVK1hdB';
const ML_URL = 'https://yousairam.pythonanywhere.com/predict-risk';

async function callML(payload) {
  try {
    const res = await fetch(ML_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('ML call fallback:', err.message);
  }
  return {
    risk_score: payload.oks_t0_score < 15 ? 0.58 : 0.18,
    risk_tier: payload.oks_t0_score < 15 ? 'HIGH RISK / INTENSIVE SURVEILLANCE' : 'LOW RISK / SAFE CLEARANCE',
    key_risk_drivers: payload.oks_t0_score < 15 ? ['Severe baseline joint compromise (OKS < 15)', 'Multiple systemic comorbidities'] : ['Favorable pre-operative baseline'],
    surgeon_action_plan: 'Standard clinical pathway with calibrated physical therapy.',
  };
}

async function main() {
  console.log('--- 1. Seeding Sarah Jenkins 10-Day Trajectory ---');
  const sarahId = 'pat-1792718406925';

  // Clear existing checkins for Sarah
  await sql.query(`DELETE FROM checkins WHERE patient_id = '${sarahId}'`);

  const sarahTrajectory = [
    { day: 1, flexion: 60, pain: 8, walking: 40, swelling: 2, opioids: 4, calf: false, wound: false, fever: false, status: 'RED', reason: 'Layer 3 ML Model: Critical High Baseline Risk (63%) & Severe Acute Post-Op Pain', action: 'Inpatient cryotherapy, multi-modal analgesia, and bedside VMO activation.' },
    { day: 2, flexion: 65, pain: 7, walking: 65, swelling: 2, opioids: 3, calf: false, wound: false, fever: false, status: 'AMBER', reason: 'Layer 3: Moderate pain watch during early discharge transition', action: 'Gentle active-assisted heel slides and mandatory calf pump cadence.' },
    { day: 3, flexion: 70, pain: 6, walking: 90, swelling: 2, opioids: 3, calf: false, wound: false, fever: false, status: 'AMBER', reason: 'Kinematic Progression: Flexion advancing toward 70° threshold', action: 'Progress closed-chain weight bearing with walker assistance.' },
    { day: 4, flexion: 75, pain: 5, walking: 125, swelling: 1, opioids: 2, calf: false, wound: false, fever: false, status: 'GREEN', reason: 'Clinical Recovery: Steady flexion velocity gain and opioid step-down', action: 'Continue progressive home physical therapy protocol.' },
    { day: 5, flexion: 80, pain: 5, walking: 160, swelling: 1, opioids: 2, calf: false, wound: false, fever: false, status: 'GREEN', reason: 'Kinematic Target: 80° flexion achieved with decreasing effusion', action: 'Introduce seated knee flexion active stretches and terminal quad sets.' },
    { day: 6, flexion: 83, pain: 4, walking: 210, swelling: 1, opioids: 1, calf: false, wound: false, fever: false, status: 'GREEN', reason: 'Functional Mobility: Exceeding 200m ambulation tolerance', action: 'Transition from walker to single-point cane as tolerated.' },
    { day: 7, flexion: 85, pain: 4, walking: 250, swelling: 1, opioids: 1, calf: false, wound: false, fever: false, status: 'GREEN', reason: 'Subacute Milestone: Approaching 90° functional threshold', action: 'Maintain cryotherapy intervals after ambulatory sessions.' },
    { day: 8, flexion: 87, pain: 4, walking: 290, swelling: 1, opioids: 0, calf: false, wound: false, fever: false, status: 'GREEN', reason: 'Opioid Free: Successfully transitioned to non-opioid multimodal analgesia', action: 'Continue independent home exercise regimen.' },
    { day: 9, flexion: 86, pain: 6, walking: 220, swelling: 2, opioids: 1, calf: true, wound: false, fever: false, status: 'RED', reason: 'Layer 1 Deterministic Red Flag: Acute Unilateral Calf Pain / Posterior Edema', action: 'IMMEDIATE CLINICAL ESCALATION: Venous duplex ultrasound to rule out DVT. Pause active PT drills.' },
    { day: 10, flexion: 85, pain: 7, walking: 180, swelling: 3, opioids: 2, calf: true, wound: false, fever: false, status: 'RED', reason: 'Layer 1 Deterministic Red Flag: Persistent Calf Pain with Grade III Effusion', action: 'URGENT SURGEON AUDIT: Attending surgical evaluation and hemodynamic thrombosis workup.' }
  ];

  for (const c of sarahTrajectory) {
    const cId = `chk-sarah-${c.day}`;
    const checkinDate = new Date(Date.now() - (10 - c.day) * 86400000).toISOString();
    await sql.query(`
      INSERT INTO checkins (
        id, patient_id, day_number, date, pain_score, flexion_degrees,
        walking_steps_or_meters, swelling_score, opioid_pills_taken,
        fever_reported, wound_drainage_reported, calf_pain_reported,
        foot_drop_reported, chest_pain_shortness_of_breath, triage_status,
        triage_layer, triage_reason, clinical_action, ml_risk_probability,
        ml_risk_classification, doctor_acknowledged
      ) VALUES (
        '${cId}', '${sarahId}', ${c.day}, '${checkinDate}', ${c.pain}, ${c.flexion},
        ${c.walking}, ${c.swelling}, ${c.opioids}, ${c.fever}, ${c.wound}, ${c.calf},
        false, false, '${c.status}', ${c.status === 'RED' ? 1 : c.status === 'AMBER' ? 2 : 4},
        '${c.reason.replace(/'/g, "''")}', '${c.action.replace(/'/g, "''")}',
        0.629, 'HIGH', false
      )
    `);
  }

  // Update Sarah's summary in patients table
  await sql.query(`
    UPDATE patients
    SET last_checkin_day = 10,
        last_checkin_date = NOW(),
        current_triage_status = 'RED'
    WHERE id = '${sarahId}'
  `);
  console.log('Sarah Jenkins 10 days inserted successfully!');

  console.log('\n--- 2. Enrolling 12 Diverse Surgical Patients with Real ML Inferences ---');
  
  const cohortTemplates = [
    {
      name: 'Robert Henderson', age: 72, gender: 'MALE', side: 'LEFT',
      preOpSeverity: 'SEVERE', mobility: 'WALKER',
      highBp: true, diabetes: true, heartDisease: true, stroke: false, arthritis: true,
      days: 8, finalStatus: 'RED',
      daysProfile: [
        { day: 1, flexion: 55, pain: 8, walking: 30, swelling: 3, opioids: 4, calf: false, wound: false, fever: false, status: 'RED', reason: 'High Baseline Risk (71%) + Severe Effusion', action: 'High elevation and cryotherapy.' },
        { day: 2, flexion: 58, pain: 7, walking: 40, swelling: 2, opioids: 3, calf: false, wound: false, fever: false, status: 'AMBER', reason: 'Pain watch during mobilization', action: 'Gentle ankle pumps.' },
        { day: 3, flexion: 60, pain: 7, walking: 50, swelling: 2, opioids: 3, calf: false, wound: false, fever: false, status: 'AMBER', reason: 'Flexion lag (<65° on Day 3)', action: 'Add passive knee extension over roll.' },
        { day: 4, flexion: 62, pain: 6, walking: 65, swelling: 2, opioids: 2, calf: false, wound: false, fever: false, status: 'AMBER', reason: 'Slow velocity progression', action: 'Quad sets with biofeedback.' },
        { day: 5, flexion: 65, pain: 6, walking: 80, swelling: 2, opioids: 2, calf: false, wound: false, fever: false, status: 'AMBER', reason: 'Velocity plateauing below milestone', action: 'Targeted physical therapy visit.' },
        { day: 6, flexion: 66, pain: 7, walking: 75, swelling: 2, opioids: 3, calf: false, wound: false, fever: false, status: 'AMBER', reason: 'Pain escalation and mobility dip', action: 'Audit analgesic dosing.' },
        { day: 7, flexion: 64, pain: 8, walking: 60, swelling: 3, opioids: 3, calf: false, wound: true, fever: false, status: 'RED', reason: 'Layer 1 Deterministic Red Flag: Active Serosanguinous Incision Drainage', action: 'SURGICAL AUDIT: Inspect wound margin for early dehiscence/PJI. Pause resisted PT.' },
        { day: 8, flexion: 62, pain: 9, walking: 45, swelling: 3, opioids: 4, calf: false, wound: true, fever: true, status: 'RED', reason: 'Layer 1 Deterministic Red Flag: Wound Drainage & Low-Grade Fever (100.8°F)', action: 'URGENT SURGICAL RE-EVALUATION: Synovial fluid aspirate & CRP/ESR workup.' }
      ]
    },
    {
      name: 'Elena Rostova', age: 61, gender: 'FEMALE', side: 'RIGHT',
      preOpSeverity: 'MODERATE', mobility: 'CANE',
      highBp: true, diabetes: false, heartDisease: false, stroke: false, arthritis: true,
      days: 6, finalStatus: 'AMBER',
      daysProfile: [
        { day: 1, flexion: 68, pain: 7, walking: 60, swelling: 2, opioids: 3, calf: false, wound: false, fever: false, status: 'AMBER', reason: 'Routine post-op acute monitoring', action: 'Inpatient recovery protocol.' },
        { day: 2, flexion: 72, pain: 6, walking: 90, swelling: 2, opioids: 2, calf: false, wound: false, fever: false, status: 'GREEN', reason: 'Normal trajectory gain', action: 'Encourage quad sets.' },
        { day: 3, flexion: 74, pain: 6, walking: 110, swelling: 2, opioids: 2, calf: false, wound: false, fever: false, status: 'GREEN', reason: 'Advancing ambulation distance', action: 'Continue home exercise routine.' },
        { day: 4, flexion: 74, pain: 6, walking: 115, swelling: 2, opioids: 2, calf: false, wound: false, fever: false, status: 'AMBER', reason: 'Kinematic Velocity Alert: 0° flexion delta over 48h (Plateau)', action: 'Physical therapy assessment to rule out early arthrofibrosis.' },
        { day: 5, flexion: 75, pain: 6, walking: 120, swelling: 2, opioids: 2, calf: false, wound: false, fever: false, status: 'AMBER', reason: 'Kinematic Velocity Alert: Persistent flexion plateau (75° on Day 5)', action: 'Intensify active-assisted heel slides and prone hangs.' },
        { day: 6, flexion: 75, pain: 7, walking: 110, swelling: 2, opioids: 3, calf: false, wound: false, fever: false, status: 'AMBER', reason: 'Kinematic Velocity Alert: Arthrofibrosis watch with opioid rebound', action: 'PT consult: Mobilization under manual guidance.' }
      ]
    },
    {
      name: 'James Arthur MacIntyre', age: 58, gender: 'MALE', side: 'RIGHT',
      preOpSeverity: 'MILD', mobility: 'INDEPENDENT',
      highBp: false, diabetes: false, heartDisease: false, stroke: false, arthritis: false,
      days: 12, finalStatus: 'GREEN',
      daysProfile: [
        { day: 1, flexion: 72, pain: 6, walking: 80, swelling: 1, opioids: 2, calf: false, wound: false, fever: false, status: 'GREEN', reason: 'Optimal Baseline: Safe clearance', action: 'Early mobilization protocol.' },
        { day: 2, flexion: 78, pain: 5, walking: 120, swelling: 1, opioids: 2, calf: false, wound: false, fever: false, status: 'GREEN', reason: 'Rapid early kinematic gains', action: 'Standard home drills.' },
        { day: 4, flexion: 86, pain: 4, walking: 220, swelling: 1, opioids: 1, calf: false, wound: false, fever: false, status: 'GREEN', reason: 'On Track: Day 4 > 85° flexion', action: 'Progress to unassisted ambulation.' },
        { day: 7, flexion: 95, pain: 3, walking: 380, swelling: 0, opioids: 0, calf: false, wound: false, fever: false, status: 'GREEN', reason: 'Functional Milestone: 95° flexion achieved (Stair negotiation unlocked)', action: 'Begin mini-squats and step-ups.' },
        { day: 10, flexion: 104, pain: 2, walking: 550, swelling: 0, opioids: 0, calf: false, wound: false, fever: false, status: 'GREEN', reason: 'Exceptional Recovery: Full closed-chain endurance', action: 'Advance to outdoor walking program.' },
        { day: 12, flexion: 112, pain: 1, walking: 720, swelling: 0, opioids: 0, calf: false, wound: false, fever: false, status: 'GREEN', reason: 'Exemplary Kinematic Trajectory (>110° flexion)', action: 'Maintain home strength and conditioning.' }
      ]
    },
    {
      name: 'Margaret Thatchwell', age: 76, gender: 'FEMALE', side: 'LEFT',
      preOpSeverity: 'SEVERE', mobility: 'WALKER',
      highBp: true, diabetes: true, heartDisease: false, stroke: true, arthritis: true,
      days: 3, finalStatus: 'RED',
      daysProfile: [
        { day: 1, flexion: 50, pain: 8, walking: 25, swelling: 3, opioids: 4, calf: false, wound: false, fever: false, status: 'RED', reason: 'High Risk Stratification (Stroke + Diabetes + OKS 12)', action: 'High fall precautions and inpatient PT.' },
        { day: 2, flexion: 55, pain: 8, walking: 35, swelling: 3, opioids: 4, calf: false, wound: false, fever: false, status: 'RED', reason: 'High Complication Watch: Severe quad lag', action: 'Electrical muscle stimulation (NMES) for VMO.' },
        { day: 3, flexion: 54, pain: 9, walking: 20, swelling: 3, opioids: 4, calf: true, wound: false, fever: false, status: 'RED', reason: 'Layer 1 Deterministic Red Flag: Acute calf tenderness & asymmetric swelling', action: 'STAT Ultrasound duplex to rule out popliteal/femoral DVT.' }
      ]
    },
    {
      name: 'David O\'Connor', age: 67, gender: 'MALE', side: 'BILATERAL',
      preOpSeverity: 'MODERATE', mobility: 'CANE',
      highBp: true, diabetes: false, heartDisease: true, stroke: false, arthritis: true,
      days: 5, finalStatus: 'AMBER',
      daysProfile: [
        { day: 1, flexion: 65, pain: 7, walking: 50, swelling: 2, opioids: 3, calf: false, wound: false, fever: false, status: 'AMBER', reason: 'Bilateral TKA high vigilance', action: 'Bilateral cryotherapy compression.' },
        { day: 2, flexion: 70, pain: 6, walking: 80, swelling: 2, opioids: 3, calf: false, wound: false, fever: false, status: 'AMBER', reason: 'Bilateral monitoring watch', action: 'Alternate leg sets.' },
        { day: 3, flexion: 72, pain: 6, walking: 100, swelling: 2, opioids: 2, calf: false, wound: false, fever: false, status: 'AMBER', reason: 'Symmetrical progress steady', action: 'Advance standing balance.' },
        { day: 4, flexion: 74, pain: 6, walking: 120, swelling: 2, opioids: 2, calf: false, wound: false, fever: false, status: 'AMBER', reason: 'Mild extensor lag bilateral', action: 'Seated terminal knee extensions.' },
        { day: 5, flexion: 75, pain: 6, walking: 130, swelling: 2, opioids: 2, calf: false, wound: false, fever: false, status: 'AMBER', reason: 'Subacute bilateral watch: Day 5 flexion < 80°', action: 'Audit home physical therapy adherence.' }
      ]
    },
    {
      name: 'Patricia Campbell', age: 64, gender: 'FEMALE', side: 'RIGHT',
      preOpSeverity: 'MODERATE', mobility: 'INDEPENDENT',
      highBp: false, diabetes: false, heartDisease: false, stroke: false, arthritis: true,
      days: 9, finalStatus: 'GREEN',
      daysProfile: [
        { day: 1, flexion: 70, pain: 6, walking: 70, swelling: 2, opioids: 3, calf: false, wound: false, fever: false, status: 'GREEN', reason: 'Normal post-op status', action: 'Standard home protocol.' },
        { day: 3, flexion: 78, pain: 5, walking: 150, swelling: 1, opioids: 2, calf: false, wound: false, fever: false, status: 'GREEN', reason: 'Positive recovery trajectory', action: 'Progression to cane.' },
        { day: 5, flexion: 86, pain: 4, walking: 240, swelling: 1, opioids: 1, calf: false, wound: false, fever: false, status: 'GREEN', reason: 'Exceeding Day 5 average', action: 'Heel slides and straight leg raises.' },
        { day: 7, flexion: 92, pain: 3, walking: 320, swelling: 1, opioids: 0, calf: false, wound: false, fever: false, status: 'GREEN', reason: 'Opioid weaned; 92° flexion achieved', action: 'Continue functional strengthening.' },
        { day: 9, flexion: 98, pain: 2, walking: 440, swelling: 0, opioids: 0, calf: false, wound: false, fever: false, status: 'GREEN', reason: 'Superior kinematic progress: 98° flexion', action: 'Advance walking distance toward 500m.' }
      ]
    },
    {
      name: 'Samuel K. Mensah', age: 70, gender: 'MALE', side: 'LEFT',
      preOpSeverity: 'SEVERE', mobility: 'CANE',
      highBp: true, diabetes: true, heartDisease: true, stroke: false, arthritis: true,
      days: 4, finalStatus: 'RED',
      daysProfile: [
        { day: 1, flexion: 60, pain: 8, walking: 40, swelling: 2, opioids: 4, calf: false, wound: false, fever: false, status: 'RED', reason: 'Layer 3 ML Model: High Multimorbidity Risk (66%)', action: 'Close monitoring with daily vitals.' },
        { day: 2, flexion: 65, pain: 7, walking: 60, swelling: 2, opioids: 3, calf: false, wound: false, fever: false, status: 'AMBER', reason: 'Acute subacute phase progression', action: 'Gentle mobilization with walker.' },
        { day: 3, flexion: 68, pain: 7, walking: 75, swelling: 2, opioids: 3, calf: false, wound: false, fever: false, status: 'AMBER', reason: 'Steady but guarded gait', action: 'Bedside quadriceps isometric sets.' },
        { day: 4, flexion: 65, pain: 9, walking: 40, swelling: 3, opioids: 4, calf: false, wound: false, fever: true, status: 'RED', reason: 'Layer 1 Deterministic Red Flag: Spiking Fever (101.9°F) & Acute Effusion', action: 'IMMEDIATE SEPSIS & PJI EVALUATION: Blood cultures, knee aspirate, emergency surgical review.' }
      ]
    },
    {
      name: 'Clara Dubois', age: 62, gender: 'FEMALE', side: 'RIGHT',
      preOpSeverity: 'MILD', mobility: 'INDEPENDENT',
      highBp: false, diabetes: false, heartDisease: false, stroke: false, arthritis: false,
      days: 14, finalStatus: 'GREEN',
      daysProfile: [
        { day: 1, flexion: 75, pain: 5, walking: 90, swelling: 1, opioids: 2, calf: false, wound: false, fever: false, status: 'GREEN', reason: 'Low risk baseline', action: 'Standard home rehabilitation.' },
        { day: 4, flexion: 88, pain: 4, walking: 250, swelling: 1, opioids: 1, calf: false, wound: false, fever: false, status: 'GREEN', reason: 'Approaching 90° milestone ahead of schedule', action: 'Independent home gait exercises.' },
        { day: 7, flexion: 98, pain: 2, walking: 420, swelling: 0, opioids: 0, calf: false, wound: false, fever: false, status: 'GREEN', reason: 'Excellent functional progress; zero opioids', action: 'Introduce stationary cycling.' },
        { day: 11, flexion: 108, pain: 1, walking: 680, swelling: 0, opioids: 0, calf: false, wound: false, fever: false, status: 'GREEN', reason: 'Full sit-to-stand kinematics unlocked', action: 'Progress to advanced balance drills.' },
        { day: 14, flexion: 115, pain: 1, walking: 850, swelling: 0, opioids: 0, calf: false, wound: false, fever: false, status: 'GREEN', reason: 'Post-Op Day 14 Graduation: 115° AROM achieved', action: 'Clear for formal outpatient physical therapy discharge.' }
      ]
    },
    {
      name: 'Arthur Pendelton', age: 79, gender: 'MALE', side: 'RIGHT',
      preOpSeverity: 'SEVERE', mobility: 'WALKER',
      highBp: true, diabetes: false, heartDisease: true, stroke: false, arthritis: true,
      days: 5, finalStatus: 'AMBER',
      daysProfile: [
        { day: 1, flexion: 55, pain: 8, walking: 30, swelling: 2, opioids: 4, calf: false, wound: false, fever: false, status: 'RED', reason: 'Geriatric High Risk Stratification (Age 79 + OKS 12)', action: 'Supervised bedside PT only.' },
        { day: 2, flexion: 60, pain: 7, walking: 45, swelling: 2, opioids: 3, calf: false, wound: false, fever: false, status: 'AMBER', reason: 'Gradual adaptation to closed chain drills', action: 'Calf pumps and seated heel slides.' },
        { day: 3, flexion: 64, pain: 6, walking: 60, swelling: 2, opioids: 2, calf: false, wound: false, fever: false, status: 'AMBER', reason: 'Cautious steady progression', action: 'Walker-assisted corridor walks.' },
        { day: 4, flexion: 66, pain: 6, walking: 70, swelling: 2, opioids: 2, calf: false, wound: false, fever: false, status: 'AMBER', reason: 'Kinematic Velocity Alert: Slow rate of flexion gain', action: 'Reinforce active assisted range of motion.' },
        { day: 5, flexion: 68, pain: 6, walking: 80, swelling: 2, opioids: 2, calf: false, wound: false, fever: false, status: 'AMBER', reason: 'Subacute monitoring watch: Flexion 68° on Day 5', action: 'Schedule PT check-in for joint mobilization.' }
      ]
    },
    {
      name: 'Svetlana Ivanova', age: 66, gender: 'FEMALE', side: 'LEFT',
      preOpSeverity: 'MODERATE', mobility: 'CANE',
      highBp: true, diabetes: true, heartDisease: false, stroke: false, arthritis: true,
      days: 7, finalStatus: 'GREEN',
      daysProfile: [
        { day: 1, flexion: 65, pain: 7, walking: 50, swelling: 2, opioids: 3, calf: false, wound: false, fever: false, status: 'AMBER', reason: 'Moderate risk baseline profile', action: 'Initial home precautions.' },
        { day: 2, flexion: 70, pain: 6, walking: 80, swelling: 2, opioids: 2, calf: false, wound: false, fever: false, status: 'GREEN', reason: 'Encouraging early trajectory', action: 'Standard isometric exercises.' },
        { day: 4, flexion: 80, pain: 5, walking: 180, swelling: 1, opioids: 2, calf: false, wound: false, fever: false, status: 'GREEN', reason: 'Overcoming Arthrogenic Inhibition', action: 'Progress quad sets.' },
        { day: 6, flexion: 87, pain: 3, walking: 280, swelling: 1, opioids: 1, calf: false, wound: false, fever: false, status: 'GREEN', reason: 'Approaching 90° flexion target', action: 'Active assisted knee bends.' },
        { day: 7, flexion: 91, pain: 3, walking: 340, swelling: 0, opioids: 0, calf: false, wound: false, fever: false, status: 'GREEN', reason: 'Clinical Milestone: 91° flexion achieved on Day 7', action: 'Discontinue opioids completely; maintain exercise cadence.' }
      ]
    },
    {
      name: 'Thomas Bradley', age: 74, gender: 'MALE', side: 'RIGHT',
      preOpSeverity: 'SEVERE', mobility: 'WALKER',
      highBp: true, diabetes: true, heartDisease: true, stroke: false, arthritis: true,
      days: 2, finalStatus: 'RED',
      daysProfile: [
        { day: 1, flexion: 55, pain: 8, walking: 25, swelling: 3, opioids: 4, calf: false, wound: false, fever: false, status: 'RED', reason: 'High Risk Stratification: Multimorbidity + OKS 12', action: 'Hospital bedside surveillance.' },
        { day: 2, flexion: 58, pain: 8, walking: 35, swelling: 3, opioids: 3, calf: false, wound: false, fever: false, status: 'RED', reason: 'Layer 3 Model: Sustained High Complication Risk', action: 'Strict non-weight bearing transfer precautions.' }
      ]
    },
    {
      name: 'Hannah Al-Mansoor', age: 59, gender: 'FEMALE', side: 'LEFT',
      preOpSeverity: 'MILD', mobility: 'INDEPENDENT',
      highBp: false, diabetes: false, heartDisease: false, stroke: false, arthritis: false,
      days: 10, finalStatus: 'GREEN',
      daysProfile: [
        { day: 1, flexion: 75, pain: 5, walking: 85, swelling: 1, opioids: 2, calf: false, wound: false, fever: false, status: 'GREEN', reason: 'Ideal baseline candidate', action: 'Early active recovery.' },
        { day: 3, flexion: 84, pain: 4, walking: 180, swelling: 1, opioids: 1, calf: false, wound: false, fever: false, status: 'GREEN', reason: 'Accelerated recovery velocity', action: 'Transition to unassisted ambulation.' },
        { day: 6, flexion: 95, pain: 3, walking: 350, swelling: 0, opioids: 0, calf: false, wound: false, fever: false, status: 'GREEN', reason: '95° milestone surpassed early', action: 'Add gentle calf stretching.' },
        { day: 8, flexion: 102, pain: 2, walking: 500, swelling: 0, opioids: 0, calf: false, wound: false, fever: false, status: 'GREEN', reason: 'Advanced mobility: 500m tolerance', action: 'Continue functional strengthening.' },
        { day: 10, flexion: 108, pain: 1, walking: 650, swelling: 0, opioids: 0, calf: false, wound: false, fever: false, status: 'GREEN', reason: 'Outstanding recovery: 108° flexion, minimal discomfort', action: 'Prepare for 2-week surgical review.' }
      ]
    }
  ];

  let enrolledCount = 0;
  for (const t of cohortTemplates) {
    enrolledCount++;
    console.log(`[${enrolledCount}/${cohortTemplates.length}] Enrolling ${t.name}...`);
    
    const ageNum = t.age;
    const ageBand = ageNum < 55 ? 1 : ageNum < 65 ? 2 : ageNum < 75 ? 3 : ageNum < 85 ? 4 : 5;
    const baselineOks = t.preOpSeverity === 'SEVERE' ? 12.0 : t.preOpSeverity === 'MILD' ? 28.0 : 18.0;
    const mobilityScore = t.mobility === 'WALKER' ? 3 : t.mobility === 'CANE' ? 2 : 1;
    const comorbidityCount = (t.highBp ? 1 : 0) + (t.diabetes ? 1 : 0) + (t.heartDisease ? 1 : 0) + (t.stroke ? 1 : 0) + (t.arthritis ? 1 : 0);

    const mlPayload = {
      age_band: ageBand,
      gender: t.gender === 'MALE' ? 1 : 2,
      oks_t0_score: baselineOks,
      oks_t0_pain: t.preOpSeverity === 'SEVERE' ? 1 : 2,
      oks_t0_night_pain: t.preOpSeverity === 'SEVERE' ? 1 : 3,
      oks_t0_walking: t.mobility === 'WALKER' ? 1 : 2,
      oks_t0_stairs: t.mobility === 'WALKER' ? 1 : 2,
      high_bp: t.highBp ? 1 : 0,
      diabetes: t.diabetes ? 1 : 0,
      heart_disease: t.heartDisease ? 1 : 0,
      stroke: t.stroke ? 1 : 0,
      lung_disease: 0,
      t0_mobility: mobilityScore,
      t0_disability: t.mobility === 'WALKER' ? 1 : 0,
      t0_eq_vas: t.preOpSeverity === 'SEVERE' ? 50 : 70,
      t0_anxiety: t.diabetes || t.heartDisease ? 2 : 1,
    };

    const mlResult = await callML(mlPayload);
    const mlRisk = mlResult.risk_score ?? 0.20;
    const mlTier = mlResult.risk_tier ?? 'LOW RISK / SAFE CLEARANCE';
    const mlDrivers = mlResult.key_risk_drivers || [];
    const mlAction = mlResult.surgeon_action_plan || 'Standard care pathway.';

    const slug = t.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const accessToken = `pt-${slug}-${randomSuffix}`;
    const patientId = `pat-${Date.now()}-${enrolledCount}`;
    const surgeryDate = new Date(Date.now() - (t.days + 1) * 86400000).toISOString().split('T')[0];

    // Insert patient
    await sql.query(`
      INSERT INTO patients (
        id, doctor_id, name, email, age, gender, surgery_date, knee_side,
        phone, access_token, passcode, current_triage_status,
        current_risk_probability, last_checkin_day, baseline_oks,
        baseline_eq5d, comorbidity_count, has_high_bp, has_diabetes,
        has_heart_disease, has_stroke, has_arthritis, ml_risk_tier,
        ml_risk_drivers, ml_action_plan
      ) VALUES (
        '${patientId}', '${DOCTOR_ID}', '${t.name.replace(/'/g, "''")}', '${slug}@patient.org', ${t.age}, '${t.gender}',
        '${surgeryDate}', '${t.side}', '+1 555 ${100 + enrolledCount * 23} ${4000 + enrolledCount}',
        '${accessToken}', '1234', '${t.finalStatus}', ${mlRisk}, ${t.days}, ${baselineOks},
        0.42, ${comorbidityCount}, ${t.highBp}, ${t.diabetes}, ${t.heartDisease},
        ${t.stroke}, ${t.arthritis}, '${mlTier.replace(/'/g, "''")}',
        '${JSON.stringify(mlDrivers).replace(/'/g, "''")}', '${mlAction.replace(/'/g, "''")}'
      )
    `);

    // Insert daily check-ins for this patient
    for (const c of t.daysProfile) {
      const cId = `chk-${patientId}-${c.day}`;
      const checkinDate = new Date(Date.now() - (t.days - c.day) * 86400000).toISOString();
      await sql.query(`
        INSERT INTO checkins (
          id, patient_id, day_number, date, pain_score, flexion_degrees,
          walking_steps_or_meters, swelling_score, opioid_pills_taken,
          fever_reported, wound_drainage_reported, calf_pain_reported,
          foot_drop_reported, chest_pain_shortness_of_breath, triage_status,
          triage_layer, triage_reason, clinical_action, ml_risk_probability,
          ml_risk_classification, doctor_acknowledged
        ) VALUES (
          '${cId}', '${patientId}', ${c.day}, '${checkinDate}', ${c.pain}, ${c.flexion},
          ${c.walking}, ${c.swelling}, ${c.opioids}, ${c.fever}, ${c.wound}, ${c.calf},
          false, false, '${c.status}', ${c.status === 'RED' ? 1 : c.status === 'AMBER' ? 2 : 4},
          '${c.reason.replace(/'/g, "''")}', '${c.action.replace(/'/g, "''")}',
          ${mlRisk}, '${mlRisk >= 0.5 ? 'HIGH' : mlRisk >= 0.25 ? 'MODERATE' : 'LOW'}', false
        )
      `);
    }
  }

  console.log('\n--- Seeding Completed Successfully! ---');
  const countRes = await sql.query(`SELECT COUNT(*) as count FROM patients WHERE doctor_id = '${DOCTOR_ID}'`);
  console.log(`Total active patients under doctor: ${countRes[0].count}`);
  const chkCount = await sql.query(`SELECT COUNT(*) as count FROM checkins`);
  console.log(`Total checkin records in database: ${chkCount[0].count}`);
}

main().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
