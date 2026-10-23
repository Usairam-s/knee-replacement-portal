async function test() {
  console.log("Testing POST /api/checkin endpoint...");
  const res = await fetch("http://localhost:3000/api/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      patientId: "pat-03",
      dayNumber: 9,
      painScore: 2,
      flexionDegrees: 100,
      walkingStepsOrMeters: 800,
      opioidPillsTaken: 0,
      calfPainReported: false,
      feverReported: false,
      woundDrainageReported: false,
      footDropReported: false,
      chestPainShortnessOfBreath: false,
      patientFreeNotes: "Feeling strong, walking around neighborhood without cane.",
    }),
  });

  const json = await res.json();
  console.log("Response:", JSON.stringify(json, null, 2));

  console.log("\nTesting GET /api/invites/inv-m89x2 endpoint...");
  const inviteRes = await fetch("http://localhost:3000/api/invites/inv-m89x2");
  const inviteJson = await inviteRes.json();
  console.log("Invite Response:", JSON.stringify(inviteJson, null, 2));
}

test().catch(console.error);
