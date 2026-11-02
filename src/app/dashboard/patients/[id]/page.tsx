"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { PatientRecord, CheckinRecord } from "@/lib/db-service";
import { logger } from "@/lib/logger";
import {
  ArrowLeft,
  Activity,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Phone,
  MessageSquare,
  Copy,
  Check,
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
  KeyRound,
  Trash2,
  Sparkles,
  Calendar,
  Clock,
  HeartPulse,
  Footprints,
  Pill,
  RotateCcw,
  Stethoscope,
  Info,
} from "lucide-react";
import { AiClinicalBriefModal, AiClinicalBriefData } from "@/components/AiClinicalBriefModal";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

function PatientDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const patientId = params?.id as string;

  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [checkins, setCheckins] = useState<CheckinRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  // AI Brief State
  const [aiBriefModalOpen, setAiBriefModalOpen] = useState(false);
  const [isGeneratingAiBrief, setIsGeneratingAiBrief] = useState(false);
  const [aiBriefData, setAiBriefData] = useState<AiClinicalBriefData | null>(null);

  useEffect(() => {
    if (!patientId) return;
    loadPatientData(patientId);
  }, [patientId]);

  async function loadPatientData(id: string) {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/patients/${id}`);
      const json = await res.json();
      if (json.success && json.patient) {
        setPatient(json.patient);
        setCheckins(json.checkins || []);
      } else {
        toast.error("Patient not found", { description: json.error || "Could not retrieve medical record" });
      }
    } catch (err: any) {
      logger.error("DOCTOR_DASHBOARD", "Failed to load patient detail", err);
      toast.error("Failed to load patient file", { description: err.message });
    } finally {
      setIsLoading(false);
    }
  }

  const handleGenerateAiBrief = async () => {
    if (!patientId) return;
    setIsGeneratingAiBrief(true);
    setAiBriefModalOpen(true);
    setAiBriefData(null);
    try {
      const res = await fetch("/api/ai/patient-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      });
      const data = await res.json();
      if (data.success && data.summary) {
        setAiBriefData(data.summary);
      } else {
        toast.error("AI Generation Error", { description: data.error || "Failed to generate clinical brief" });
      }
    } catch (e: any) {
      toast.error("Network Error", { description: e.message || "Failed to call AI brief service" });
    } finally {
      setIsGeneratingAiBrief(false);
    }
  };

  async function handleAcknowledge(checkinId: string) {
    try {
      await fetch("/api/triage/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkinId }),
      });
      toast.success("Triage alert signed off & documented");
      await loadPatientData(patientId);
    } catch (err) {
      toast.error("Could not sync triage acknowledgement");
    }
  }

  async function handleDeletePatient() {
    if (!confirm(`Are you sure you want to remove ${patient?.name || "this patient"} from your active care list?`)) return;
    const toastId = toast.loading("Removing patient record...");
    try {
      const res = await fetch(`/api/patients?id=${patientId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Patient record removed", { id: toastId });
        router.push("/dashboard");
      } else {
        toast.error(json.error || "Failed to remove patient", { id: toastId });
      }
    } catch (err) {
      toast.error("Failed to remove patient record", { id: toastId });
    }
  }

  function copyText(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-700">Loading Clinical Patient File...</p>
          <p className="text-xs text-slate-400">Retrieving longitudinal trajectory from Neon Database</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md text-center space-y-4 shadow-sm">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">Patient Record Not Found</h2>
          <p className="text-xs text-slate-500">
            The patient file you requested could not be located in your active clinical cohort.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Recovery Roster</span>
          </Link>
        </div>
      </div>
    );
  }

  const latestCheckin = checkins.length > 0 ? checkins[checkins.length - 1] : null;
  const postOpDays = patient.surgeryDate
    ? Math.max(1, Math.floor((Date.now() - new Date(patient.surgeryDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 1;

  const token = patient.accessToken || `pt-${patient.id}`;
  const pin = patient.passcode || "1234";
  const portalUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/patient/${token}`;

  const chartData = checkins.map((c) => ({
    day: `Day ${c.dayNumber}`,
    pain: c.painScore,
    flexion: c.flexionDegrees,
    walking: c.walkingStepsOrMeters,
  }));

  const isCriticalRed = latestCheckin?.triageStatus === "RED" || patient.currentTriageStatus === "RED";
  const isWatchAmber = latestCheckin?.triageStatus === "AMBER" || patient.currentTriageStatus === "AMBER";
  const isDailyRedFlag = isCriticalRed && (
    latestCheckin?.calfPainReported ||
    latestCheckin?.woundDrainageReported ||
    latestCheckin?.feverReported ||
    latestCheckin?.footDropReported ||
    postOpDays > 1
  );

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 pb-16">
      {/* Top Clinician Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Roster</span>
            </Link>
            <div className="h-5 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono hidden sm:inline">MRN: {patient.id}</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider border ${
                  isCriticalRed
                    ? "bg-red-50 text-red-700 border-red-200"
                    : isWatchAmber
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}
              >
                {isCriticalRed
                  ? isDailyRedFlag
                    ? "Critical Red Alert • Daily Check-in Flag"
                    : "Critical Red Alert • Pre-Op AI Risk"
                  : isWatchAmber
                  ? "Watch (Amber) • Kinematic"
                  : "Optimal Track"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateAiBrief}
              disabled={isGeneratingAiBrief}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-teal-600 via-indigo-600 to-purple-600 hover:from-teal-700 hover:via-indigo-700 hover:to-purple-700 transition-all shadow-xs disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
              <span>{isGeneratingAiBrief ? "Synthesizing Brief..." : "AI Clinical Brief"}</span>
            </button>

            <a
              href={`${portalUrl}?view=doctor`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 transition-colors shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5 text-teal-600" />
              <span className="hidden sm:inline">Open Portal</span>
            </a>

            <button
              onClick={() => {
                const origin = typeof window !== "undefined" ? window.location.origin : "";
                const cleanDigits = (patient.phone || "").replace(/[^0-9]/g, "");
                const msg = `*PostOpCheck Recovery Reminder*\n\nHi ${patient.name}, this is a reminder from your orthopedic care team to submit your Day ${postOpDays} knee recovery check-in today:\n\n*Log Check-in Now:*\n${portalUrl}\n\n*PIN:* ${pin}\n\nIt takes less than 60 seconds and helps your doctor ensure your recovery stays safely on track. Thank you!`;
                const encoded = encodeURIComponent(msg);
                const url = cleanDigits.length >= 7
                  ? `https://wa.me/${cleanDigits}?text=${encoded}`
                  : `https://wa.me/?text=${encoded}`;
                window.open(url, "_blank", "noopener,noreferrer");
                toast.success(`Opening WhatsApp reminder for ${patient.name}...`);
              }}
              title="Send recovery link / check-in reminder on WhatsApp"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            <a
              href={`tel:${patient.phone}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-teal-600" />
              <span className="hidden sm:inline">Call</span>
            </a>

            <button
              onClick={handleDeletePatient}
              title="Delete this patient record"
              className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Patient Identity Banner */}
        <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg text-white shadow-sm shrink-0 ${
                  isCriticalRed
                    ? "bg-gradient-to-br from-red-500 to-rose-700"
                    : isWatchAmber
                    ? "bg-gradient-to-br from-amber-500 to-amber-700"
                    : "bg-gradient-to-br from-teal-500 to-emerald-700"
                }`}
              >
                {patient.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>

              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">{patient.name}</h1>
                  <span className="px-2.5 py-0.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold font-mono">
                    MRN: {patient.id}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs text-slate-600">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold">
                    {patient.age}y &bull; {patient.gender === "FEMALE" ? "Female" : "Male"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 font-semibold border border-teal-100">
                    Day {postOpDays} Post-Op
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 font-semibold border border-indigo-100">
                    {patient.kneeSide} Knee TKA
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold">
                    Surgery: {patient.surgeryDate}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 font-semibold border border-purple-100">
                    Baseline OKS: {patient.baselineOKS || "N/A"}/48
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Link & PIN Box */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs md:max-w-md">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold">
                  <KeyRound className="w-3.5 h-3.5 text-teal-600" />
                  <span>Recovery Portal Credentials:</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="px-2 py-0.5 rounded bg-white border border-slate-200 text-teal-700 font-mono text-[11px]">
                    /patient/{token}
                  </code>
                  <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200 font-mono font-bold text-[11px]">
                    PIN: {pin}
                  </span>
                </div>
              </div>

              <button
                onClick={() => copyText(portalUrl, "Recovery Link")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors shrink-0"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
              </button>
            </div>
          </div>
        </section>

        {/* 2-Column Clinical Analysis Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Baseline AI Risk Stratification (NHS PROMs Model) */}
          <section
            className={`rounded-3xl p-6 border space-y-4 shadow-sm transition-all ${
              (patient.mlRiskTier?.includes("HIGH") || patient.currentRiskProbability >= 0.5)
                ? "bg-red-50/70 border-red-200/90 text-red-950"
                : (patient.mlRiskTier?.includes("MODERATE") || patient.currentRiskProbability >= 0.25)
                ? "bg-amber-50/70 border-amber-200/90 text-amber-950"
                : "bg-emerald-50/70 border-emerald-200/90 text-emerald-950"
            }`}
          >
            <div className="flex items-center justify-between gap-3 border-b border-black/5 pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white shadow-2xs ${
                    (patient.mlRiskTier?.includes("HIGH") || patient.currentRiskProbability >= 0.5)
                      ? "bg-red-600"
                      : (patient.mlRiskTier?.includes("MODERATE") || patient.currentRiskProbability >= 0.25)
                      ? "bg-amber-600"
                      : "bg-emerald-600"
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                    Baseline AI Risk Stratification
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Pre-op machine learning model forecasting 6-month clinical outcome
                  </p>
                </div>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-extrabold tracking-wide border shadow-2xs ${
                  (patient.mlRiskTier?.includes("HIGH") || patient.currentRiskProbability >= 0.5)
                    ? "bg-red-100 text-red-800 border-red-300"
                    : (patient.mlRiskTier?.includes("MODERATE") || patient.currentRiskProbability >= 0.25)
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : "bg-emerald-100 text-emerald-800 border-emerald-300"
                }`}
              >
                {patient.mlRiskTier || (patient.currentRiskProbability >= 0.5 ? "CRITICAL HIGH RISK" : "MODERATE RISK")}
                {" • "}
                {(patient.currentRiskProbability * 100).toFixed(1)}% Risk
              </span>
            </div>

            <div className="space-y-3">
              <div className="bg-white/85 backdrop-blur-xs p-4 rounded-2xl border border-black/5 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Key Clinical Drivers
                </span>
                {Array.isArray(patient.mlRiskDrivers) && patient.mlRiskDrivers.length > 0 ? (
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {patient.mlRiskDrivers.map((driver: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-teal-600 font-bold shrink-0">•</span>
                        <span>{driver}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-600 text-xs">
                    Baseline OKS: <strong>{patient.baselineOKS}/48</strong> &bull; Comorbidities: <strong>{patient.comorbidityCount}</strong>
                  </p>
                )}
              </div>

              <div className="bg-white/85 backdrop-blur-xs p-4 rounded-2xl border border-black/5 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Surgeon Action Plan
                </span>
                <p className="text-slate-700 text-xs leading-relaxed">
                  {patient.mlActionPlan || "Standard 6-month clinical care pathway and scheduled physical therapy milestones."}
                </p>
              </div>
            </div>
          </section>

          {/* Card 2: Current Triage Alert & Safety Net Status */}
          {latestCheckin ? (
            <section
              className={`rounded-3xl p-6 border space-y-4 shadow-sm ${
                latestCheckin.triageStatus === "RED"
                  ? "bg-red-50/80 border-red-200 text-red-950"
                  : latestCheckin.triageStatus === "AMBER"
                  ? "bg-amber-50/80 border-amber-200 text-amber-950"
                  : "bg-emerald-50/80 border-emerald-200 text-emerald-950"
              }`}
            >
              <div className="flex items-start justify-between gap-3 border-b border-black/5 pb-3">
                <div className="flex items-center gap-2.5">
                  <ShieldAlert
                    className={`w-6 h-6 shrink-0 ${
                      latestCheckin.triageStatus === "RED"
                        ? "text-red-600"
                        : latestCheckin.triageStatus === "AMBER"
                        ? "text-amber-600"
                        : "text-emerald-600"
                    }`}
                  />
                  <div>
                    <h2 className="text-xs font-extrabold uppercase tracking-wider">
                      Current Triage Status &bull; Layer {latestCheckin.triageLayer}{" "}
                      {latestCheckin.triageLayer === 1
                        ? "(Deterministic AAOS Safety Net)"
                        : latestCheckin.triageLayer === 2
                        ? "(Recovery Trajectory Delta)"
                        : "(Risk Stratification Model)"}
                    </h2>
                    <p className="text-[11px] opacity-75">
                      Evaluated against Oxford Knee Score, Wells DVT Criteria, and AAOS Red Flags
                    </p>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-2xs ${
                    latestCheckin.triageStatus === "RED"
                      ? "bg-red-200 text-red-900 border-red-300"
                      : latestCheckin.triageStatus === "AMBER"
                      ? "bg-amber-200 text-amber-900 border-amber-300"
                      : "bg-emerald-200 text-emerald-900 border-emerald-300"
                  }`}
                >
                  {latestCheckin.triageStatus}
                </span>
              </div>

              <div className="space-y-3">
                <div className="bg-white/85 backdrop-blur-xs p-4 rounded-2xl border border-black/5 space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Diagnostic Reason
                  </span>
                  <p className="text-sm font-bold text-slate-900 leading-snug">
                    {latestCheckin.triageReason}
                  </p>
                  <div className="pt-2 text-xs border-t border-slate-100 text-slate-700">
                    <strong className="text-slate-900">Recommended Action:</strong> {latestCheckin.clinicalAction}
                  </div>
                </div>

                {latestCheckin.patientFreeNotes && (
                  <div className="p-3.5 rounded-2xl bg-white/70 border border-black/5 text-xs italic text-slate-700">
                    &ldquo;{latestCheckin.patientFreeNotes}&rdquo;
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  {latestCheckin.doctorAcknowledged ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-100/70 px-3 py-1.5 rounded-xl border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Doctor Review Signed Off</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAcknowledge(latestCheckin.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-800 hover:bg-slate-100 border border-slate-300 transition-colors shadow-2xs"
                    >
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Sign Off &amp; Acknowledge Clinical Review</span>
                    </button>
                  )}
                </div>
              </div>
            </section>
          ) : (
            <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Awaiting Initial Check-in</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Patient has been enrolled in PostOp-Check. Daily check-in submissions will immediately populate kinematic curves and red-flag audits.
              </p>
              <a
                href={`${portalUrl}?view=doctor`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-2xs"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Patient Recovery Portal (PIN: {pin})</span>
              </a>
            </section>
          )}
        </div>

        {/* Full-Width Longitudinal Recovery Trajectory */}
        {checkins.length > 0 && (
          <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Longitudinal Recovery Trajectory (Active Flexion vs Pain Intensity)
                </h3>
                <p className="text-xs text-slate-500">
                  Daily kinematics measured from Day 1 post-op to present day
                </p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-600 self-start sm:self-auto">
                {checkins.length} Total Daily Submissions
              </span>
            </div>

            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 130]} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e2e8f0",
                      borderRadius: "1rem",
                      fontSize: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                  <Line
                    type="monotone"
                    dataKey="pain"
                    name="Pain (VAS 0–10)"
                    stroke="#e11d48"
                    strokeWidth={3}
                    dot={{ r: 5, fill: "#e11d48" }}
                    activeDot={{ r: 7 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="flexion"
                    name="Active Flexion (Degrees °)"
                    stroke="#0d9488"
                    strokeWidth={3}
                    dot={{ r: 5, fill: "#0d9488" }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Recorded Daily Milestones Detailed Log Table */}
        {checkins.length > 0 && (
          <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Recorded Daily Check-in Audit Trail
                </h3>
                <p className="text-xs text-slate-500">
                  Longitudinal history of patient reported outcomes and clinical status
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Day</th>
                    <th className="px-4 py-3">Pain (0–10)</th>
                    <th className="px-4 py-3">Flexion (°)</th>
                    <th className="px-4 py-3">Walking Distance</th>
                    <th className="px-4 py-3">Opioid Pills</th>
                    <th className="px-4 py-3">Effusion / Swelling</th>
                    <th className="px-4 py-3">Calf Pain</th>
                    <th className="px-4 py-3">Wound Ooze</th>
                    <th className="px-4 py-3">Triage Verdict</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {checkins.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-black text-slate-900">Day {c.dayNumber}</td>
                      <td className="px-4 py-3 font-semibold text-rose-700">{c.painScore} / 10</td>
                      <td className="px-4 py-3 text-teal-700 font-bold">{c.flexionDegrees}°</td>
                      <td className="px-4 py-3 text-slate-700">{c.walkingStepsOrMeters}m</td>
                      <td className="px-4 py-3 text-slate-600">{c.opioidPillsTaken} pills</td>
                      <td className="px-4 py-3 text-slate-600">
                        {c.swellingScore === 0 ? "None" : c.swellingScore === 1 ? "Mild" : c.swellingScore === 2 ? "Moderate" : "Severe"}
                      </td>
                      <td className="px-4 py-3">
                        {c.calfPainReported ? (
                          <span className="text-red-700 font-bold">YES (Wells Flag)</span>
                        ) : (
                          <span className="text-slate-400">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {c.woundDrainageReported ? (
                          <span className="text-red-700 font-bold">YES (SSI Risk)</span>
                        ) : (
                          <span className="text-slate-400">Dry</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                            c.triageStatus === "RED"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : c.triageStatus === "AMBER"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {c.triageStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {/* AI Clinical Brief Modal */}
      <AiClinicalBriefModal
        isOpen={aiBriefModalOpen}
        onClose={() => setAiBriefModalOpen(false)}
        isLoading={isGeneratingAiBrief}
        patientName={patient.name}
        patientId={patient.id}
        postOpDay={postOpDays}
        data={aiBriefData}
      />
    </div>
  );
}

export default function PatientDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      }
    >
      <PatientDetailContent />
    </Suspense>
  );
}
