"use client";

import { useState } from "react";
import Link from "next/link";
import { evaluateTriage, TriageResult } from "@/lib/triage-engine";
import { dbService } from "@/lib/db-service";
import { logger } from "@/lib/logger";
import {
  Activity,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
  ChevronRight,
  Info,
  Thermometer,
  Flame,
  Footprints,
  Pill,
  HeartPulse,
  PhoneCall,
  Sparkles,
  ArrowLeft,
} from "lucide-react";

export default function PatientCheckinPage() {
  const [dayNumber, setDayNumber] = useState(5);
  const [painScore, setPainScore] = useState(4);
  const [flexionDegrees, setFlexionDegrees] = useState(85);
  const [walkingMeters, setWalkingMeters] = useState(300);
  const [opioidPills, setOpioidPills] = useState(1);
  const [freeNotes, setFreeNotes] = useState("");

  // AAOS Red Flags checklist
  const [fever, setFever] = useState(false);
  const [woundDrainage, setWoundDrainage] = useState(false);
  const [calfPain, setCalfPain] = useState(false);
  const [footDrop, setFootDrop] = useState(false);
  const [chestPain, setChestPain] = useState(false);

  // Submission & Triage state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [triageOutput, setTriageOutput] = useState<TriageResult | null>(null);

  async function handleCheckinSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    logger.info("PATIENT_CHECKIN", `Submitting Day ${dayNumber} Check-in`, {
      pain: painScore,
      flexion: flexionDegrees,
      calfPain,
      fever,
    });

    try {
      // Call dedicated backend REST API route
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: "pat-03", // Eleanor Vance / Demo Patient
          dayNumber,
          painScore,
          flexionDegrees,
          walkingStepsOrMeters: walkingMeters,
          swellingScore: 2,
          opioidPillsTaken: opioidPills,
          feverReported: fever,
          woundDrainageReported: woundDrainage,
          calfPainReported: calfPain,
          footDropReported: footDrop,
          chestPainShortnessOfBreath: chestPain,
          patientFreeNotes: freeNotes,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setTriageOutput(json.data);
        return;
      }
    } catch (err) {
      logger.warn("PATIENT_CHECKIN", "API route call failed, executing client triage engine fallback", err);
    }

    try {
      const result = await evaluateTriage({
        patientId: "pat-03",
        dayNumber,
        painScore,
        flexionDegrees,
        walkingStepsOrMeters: walkingMeters,
        swellingScore: 2,
        opioidPillsTaken: opioidPills,
        patientFreeNotes: freeNotes,
        feverReported: fever,
        woundDrainageReported: woundDrainage,
        calfPainReported: calfPain,
        footDropReported: footDrop,
        chestPainShortnessOfBreath: chestPain,
        patientContext: {
          age: 65,
          gender: "FEMALE",
          baselineOKS: 18,
          baselineEQ5D: 0.45,
          comorbidityCount: 2,
          hasHeartDisease: false,
          hasHighBloodPressure: true,
          hasDiabetes: false,
          hasStroke: false,
          hasArthritis: true,
        },
        previousCheckin: {
          painScore: 3,
          flexionDegrees: 80,
          opioidPillsTaken: 1,
        },
      });

      setTriageOutput(result);
    } catch (err) {
      logger.error("PATIENT_CHECKIN", "Check-in evaluation failed", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Patient Header */}
      <header className="bg-slate-900 border-b border-slate-800 py-4 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Return to Clinician Suite"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-base font-bold text-white flex items-center gap-2">
                PostOp<span className="text-cyan-400">-Check</span> Daily Recovery Monitor
              </h1>
              <p className="text-xs text-slate-400">
                Supervised by Dr. Alistair Wright, MD &bull; Total Knee Arthroplasty (TKA)
              </p>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300 font-semibold">
            Post-Op Day {dayNumber}
          </span>
        </div>
      </header>

      {/* Token Portal Hint Banner */}
      <div className="bg-teal-950/70 border-b border-teal-800/80 px-4 py-2.5 text-center text-xs text-teal-200">
        <span>Looking for your personal token recovery portal? Visit </span>
        <Link href="/patient/pt-jenkins" className="font-bold underline text-white hover:text-teal-300">
          Margaret Jenkins (PIN: 1234)
        </Link>
        <span> or </span>
        <Link href="/patient/pt-vance" className="font-bold underline text-white hover:text-teal-300">
          Eleanor Vance (PIN: 1234)
        </Link>
      </div>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {!triageOutput ? (
          <form onSubmit={handleCheckinSubmit} className="space-y-6">
            {/* Introductory Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-white mb-1">
                How are you feeling today?
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your answers are analyzed by our 3-tier clinical protocol and reviewed by your surgical care team. Please be as accurate as possible.
              </p>
            </div>

            {/* Section 1: Continuous Metrics */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                <HeartPulse className="w-4 h-4" />
                <span>Daily Recovery Metrics</span>
              </h3>

              {/* Pain Score Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-semibold text-slate-200">
                    Current Knee Pain Level (0 = No Pain, 10 = Severe)
                  </label>
                  <span className="text-base font-extrabold text-cyan-400">
                    {painScore} / 10
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={painScore}
                  onChange={(e) => setPainScore(Number(e.target.value))}
                  className="w-full accent-cyan-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>0 - None</span>
                  <span>5 - Moderate</span>
                  <span>10 - Unbearable</span>
                </div>
              </div>

              {/* Knee Flexion Degrees & Milestones */}
              <div className="space-y-3 p-3.5 sm:p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-slate-700/60">
                  <div>
                    <label className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
                      <span>Knee Bend &amp; Motion (Range of Motion)</span>
                      <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-700/60">
                        Physio Benchmark
                      </span>
                    </label>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Select what best describes your knee bend movement today:
                    </p>
                  </div>
                  <span className="font-mono font-extrabold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-600/50 text-xs shadow-2xs self-start sm:self-auto">
                    {flexionDegrees}&deg; Bend
                  </span>
                </div>

                {/* Patient-Friendly Milestone Selection Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {[
                    { deg: 45, label: "30° – 45°: Slight Bend", desc: "Slide heel back a few inches", icon: "🦶", target: false },
                    { deg: 60, label: "60°: Halfway Bend", desc: "Bent halfway toward right angle", icon: "📐", target: false },
                    { deg: 90, label: "90°: Chair Sitting (L-Shape)", desc: "Sit comfortably on chair with knee bent", icon: "🪑", target: true },
                    { deg: 100, label: "100°: Stair Climbing", desc: "Bend enough to manage stairs comfortably", icon: "🪜", target: false },
                    { deg: 115, label: "115°+: Full Rotation", desc: "Pedal bicycle through complete rotation", icon: "🚲", target: false },
                    { deg: 125, label: "125°+: Deep Flexion", desc: "Tuck foot comfortably beneath seat", icon: "✨", target: false },
                  ].map((card) => {
                    const isSelected =
                      (card.deg === 45 && flexionDegrees <= 50) ||
                      (card.deg === 60 && flexionDegrees > 50 && flexionDegrees <= 70) ||
                      (card.deg === 90 && flexionDegrees > 70 && flexionDegrees <= 95) ||
                      (card.deg === 100 && flexionDegrees > 95 && flexionDegrees <= 105) ||
                      (card.deg === 115 && flexionDegrees > 105 && flexionDegrees <= 120) ||
                      (card.deg === 125 && flexionDegrees > 120);

                    return (
                      <button
                        key={card.deg}
                        type="button"
                        onClick={() => setFlexionDegrees(card.deg)}
                        className={`text-left p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-emerald-600 text-white border-emerald-500 shadow-xs ring-2 ring-emerald-400/30"
                            : "bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-700/80"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-xs flex items-center gap-1.5">
                            <span className="text-sm">{card.icon}</span>
                            <span className={isSelected ? "text-white" : "text-slate-100"}>{card.label}</span>
                          </span>
                          {card.target && (
                            <span
                              className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${
                                isSelected ? "bg-white text-emerald-900" : "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                              }`}
                            >
                              Goal
                            </span>
                          )}
                        </div>
                        <p className={`text-[11px] mt-1 leading-snug ${isSelected ? "text-emerald-100" : "text-slate-400"}`}>
                          {card.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Fine-Tuning Slider */}
                <div className="pt-2 border-t border-slate-700/60 space-y-1.5">
                  <div className="flex justify-between items-center text-[11px] text-slate-400">
                    <span>Fine-tune exact angle:</span>
                    <span className="font-mono font-bold text-emerald-400">{flexionDegrees}&deg;</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="135"
                    step="5"
                    value={flexionDegrees}
                    onChange={(e) => setFlexionDegrees(Number(e.target.value))}
                    className="w-full accent-emerald-500 h-2 bg-slate-900 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>30&deg; (Slight)</span>
                    <span className="text-emerald-400 font-bold">90&deg; (Chair L-Shape Target)</span>
                    <span>135&deg; (Deep)</span>
                  </div>
                </div>
              </div>

              {/* Walking & Opioids Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Walking Distance (Approx. Meters or Steps)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="5000"
                      value={walkingMeters}
                      onChange={(e) => setWalkingMeters(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-500">meters</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Opioid Pain Pills Taken in Last 24h
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={opioidPills}
                      onChange={(e) => setOpioidPills(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-500">pills</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: AAOS Red Flag Safety Checklist */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div>
                <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  <span>Clinical Red Flag Checklist (AAOS OrthoInfo Safety Protocol)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Check any symptoms you have experienced over the last 24 hours:
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={calfPain}
                    onChange={(e) => setCalfPain(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-red-600 focus:ring-red-500 bg-slate-900 border-slate-700"
                  />
                  <div className="text-xs">
                    <strong className="text-white">Acute Calf Tenderness / Asymmetrical Swelling</strong>
                    <p className="text-slate-400">Severe calf cramping or tightness not relieved by rest (DVT warning sign).</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={fever}
                    onChange={(e) => setFever(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-red-600 focus:ring-red-500 bg-slate-900 border-slate-700"
                  />
                  <div className="text-xs">
                    <strong className="text-white">Fever &ge; 101.5&deg;F (38.6&deg;C) or Chills</strong>
                    <p className="text-slate-400">Significant body temperature elevation or night sweats.</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={woundDrainage}
                    onChange={(e) => setWoundDrainage(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-red-600 focus:ring-red-500 bg-slate-900 border-slate-700"
                  />
                  <div className="text-xs">
                    <strong className="text-white">Foul Wound Drainage or Incision Opening</strong>
                    <p className="text-slate-400">Yellowish, cloudy discharge soaking dressings, or skin separation.</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={footDrop}
                    onChange={(e) => setFootDrop(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-red-600 focus:ring-red-500 bg-slate-900 border-slate-700"
                  />
                  <div className="text-xs">
                    <strong className="text-white">Foot Drop / Inability to Lift Toes</strong>
                    <p className="text-slate-400">Numbness on top of foot or inability to pull foot upwards.</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Section 3: Patient Notes */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Additional Notes or Sensation (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Describe any new stiffness, sensations, or questions for your surgical team..."
                value={freeNotes}
                onChange={(e) => setFreeNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 transition-all shadow-lg shadow-cyan-600/25 disabled:opacity-50"
            >
              {isSubmitting ? "Running 3-Tier Clinical Evaluation..." : "Submit Daily Check-in & Review Status \u2192"}
            </button>
          </form>
        ) : (
          /* =======================================================================
             POST-SUBMISSION CLINICAL TRIAGE FEEDBACK & GATED CONTENT
             ======================================================================= */
          <div className="space-y-6">
            {/* Triage Alert Banner */}
            <div
              className={`rounded-2xl p-6 border shadow-xl ${
                triageOutput.triageStatus === "RED"
                  ? "bg-red-950/60 border-red-700 text-red-100"
                  : triageOutput.triageStatus === "AMBER"
                  ? "bg-amber-950/60 border-amber-700 text-amber-100"
                  : "bg-emerald-950/60 border-emerald-700 text-emerald-100"
              }`}
            >
              <div className="flex items-start gap-4">
                {triageOutput.triageStatus === "RED" ? (
                  <ShieldAlert className="w-8 h-8 text-red-400 flex-shrink-0" />
                ) : triageOutput.triageStatus === "AMBER" ? (
                  <AlertTriangle className="w-8 h-8 text-amber-400 flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 flex-shrink-0" />
                )}

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                        triageOutput.triageStatus === "RED"
                          ? "bg-red-900 text-red-300"
                          : triageOutput.triageStatus === "AMBER"
                          ? "bg-amber-900 text-amber-300"
                          : "bg-emerald-900 text-emerald-300"
                      }`}
                    >
                      {triageOutput.triageStatus} STATUS
                    </span>
                    <span className="text-xs text-slate-300">
                      Evaluated by Layer {triageOutput.triageLayer}
                    </span>
                  </div>

                  <h3 className="text-base font-bold leading-snug">
                    {triageOutput.triageReason}
                  </h3>

                  <p className="text-xs opacity-90">
                    <strong>Next Steps:</strong> {triageOutput.clinicalAction}
                  </p>

                  {triageOutput.triageStatus === "RED" && (
                    <div className="pt-3">
                      <a
                        href="tel:5552348900"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white text-red-950 hover:bg-slate-200 transition-colors shadow-lg"
                      >
                        <PhoneCall className="w-4 h-4 text-red-600" />
                        <span>Call Orthopedic Emergency Line Now (555-234-8900)</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Reset Form Option */}
            <div className="flex justify-end">
              <button
                onClick={() => setTriageOutput(null)}
                className="text-xs text-slate-400 hover:text-white underline"
              >
                &larr; Submit Another Test Check-in
              </button>
            </div>

            {/* Gated Recovery Content Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  {triageOutput.isGatedContentAllowed ? (
                    <Unlock className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Lock className="w-5 h-5 text-slate-500" />
                  )}
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Prescribed Rehabilitation & Recovery Content
                    </h3>
                    <p className="text-xs text-slate-400">
                      Physical therapy guidelines and nutritional recovery protocols
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    triageOutput.isGatedContentAllowed
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  {triageOutput.isGatedContentAllowed ? "UNLOCKED" : "LOCKED FOR SAFETY"}
                </span>
              </div>

              {triageOutput.isGatedContentAllowed ? (
                /* Unlocked Green Content */
                <div className="space-y-6">
                  <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/60 text-xs text-emerald-300">
                    Your recovery metrics are within healthy limits! You are approved to perform your Day {dayNumber} progressive knee exercises.
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Exercise 1 */}
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                        Exercise 1 &bull; Mobility
                      </span>
                      <h4 className="text-sm font-bold text-white">Seated Knee Flexion (Heel Slides)</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Sit tall in a supportive chair. Slowly slide your operated heel back toward the chair until a gentle stretch is felt. Hold for 5 seconds. Repeat 10 times.
                      </p>
                    </div>

                    {/* Exercise 2 */}
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                        Exercise 2 &bull; Activation
                      </span>
                      <h4 className="text-sm font-bold text-white">Quad Sets (Towel Roll)</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Lie flat. Tighten your thigh muscles by pressing the back of your knee firmly into the bed. Hold tight for 5 seconds. Repeat 2 sets of 10.
                      </p>
                    </div>

                    {/* Exercise 3 */}
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                        Exercise 3 &bull; Circulation
                      </span>
                      <h4 className="text-sm font-bold text-white">Ankle Pumps</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Move your foot up and down repeatedly like pressing an accelerator pedal. Perform 20 reps every waking hour to maintain venous return.
                      </p>
                    </div>
                  </div>

                  {/* Nutrition Card */}
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Clinical Nutrition Guidance</span>
                    </span>
                    <h4 className="text-xs font-bold text-white">Tissue Repair & Anti-Inflammatory Support</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Maintain adequate protein intake (1.2–1.5g per kg body weight) to support collagen remodeling. Hydrate with 2–2.5L of water daily and include omega-3 rich foods to moderate systemic inflammation.
                    </p>
                  </div>
                </div>
              ) : (
                /* Locked Red/Amber Message */
                <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
                  <Lock className="w-8 h-8 text-slate-500 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-300">
                    Recovery Content Locked Pending Clinical Review
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    Per clinical safety guidelines (AAOS/OrthoInfo), physical therapy exercise routines are suspended whenever active safety red flags or adverse pain trajectories are flagged. Please await guidance from your orthopedic team.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
