"use client";

import { use, useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import {
  Activity,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Lock,
  Unlock,
  KeyRound,
  Stethoscope,
  ChevronRight,
  Info,
  Calendar,
  Footprints,
  Pill,
  HeartPulse,
  PhoneCall,
  Sparkles,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Edit3,
  Plus,
  Eye,
} from "lucide-react";
import { AiClinicalBriefModal, AiClinicalBriefData } from "@/components/AiClinicalBriefModal";

interface PatientProfile {
  id: string;
  name: string;
  age: number;
  gender: string;
  surgeryDate: string;
  kneeSide: "LEFT" | "RIGHT" | "BILATERAL";
  postOpDay: number;
  currentTriageStatus: "RED" | "AMBER" | "GREEN";
  doctorName: string;
  hospital: string;
  specialty: string;
  hasPasscode: boolean;
}

interface CheckinData {
  id: string;
  dayNumber: number;
  dateFormatted?: string;
  painScore: number;
  flexionDegrees: number;
  walkingStepsOrMeters: number;
  swellingScore: number;
  opioidPillsTaken: number;
  feverReported: boolean;
  woundDrainageReported: boolean;
  calfPainReported: boolean;
  footDropReported: boolean;
  chestPainShortnessOfBreath: boolean;
  patientFreeNotes?: string;
  triageStatus: "RED" | "AMBER" | "GREEN";
  triageLayer?: number;
  triageReason?: string;
  clinicalAction?: string;
}

function PatientPortalContent({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { user, isSignedIn } = useUser();
  const [isDoctorView, setIsDoctorView] = useState(false);

  // Profile and security state
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [todayCheckin, setTodayCheckin] = useState<CheckinData | null>(null);
  const [hasCompletedToday, setHasCompletedToday] = useState(false);
  const [history, setHistory] = useState<CheckinData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Clinician AI Recovery Brief State
  const [aiBriefModalOpen, setAiBriefModalOpen] = useState(false);
  const [isGeneratingAiBrief, setIsGeneratingAiBrief] = useState(false);
  const [aiBriefData, setAiBriefData] = useState<AiClinicalBriefData | null>(null);

  const handleGenerateAiBrief = async () => {
    if (!patient?.id) return;
    setIsGeneratingAiBrief(true);
    setAiBriefModalOpen(true);
    setAiBriefData(null);
    try {
      const res = await fetch("/api/ai/patient-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: patient.id }),
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

  // Detect clinician mode (Clerk authenticated OR ?view=doctor query)
  useEffect(() => {
    const isDocParam =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("view") === "doctor";
    if (isSignedIn || isDocParam) {
      setIsDoctorView(true);
    }
  }, [isSignedIn]);

  const doctorDisplayName = user?.fullName
    ? user.fullName
    : user?.firstName
    ? `Dr. ${user.firstName}`
    : patient?.doctorName || "Attending Clinician";

  // Passcode verification state
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [inputPasscode, setInputPasscode] = useState("");
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [isVerifyingPasscode, setIsVerifyingPasscode] = useState(false);

  // Form State for Checkin & Simulation Testing
  const formRef = useRef<HTMLDivElement>(null);
  const [checkinDay, setCheckinDay] = useState<number>(1);
  const [isEditingToday, setIsEditingToday] = useState(false);
  const [showCheckinForm, setShowCheckinForm] = useState(true);
  const [painScore, setPainScore] = useState(4);
  const [flexionDegrees, setFlexionDegrees] = useState(85);
  const [walkingMeters, setWalkingMeters] = useState(300);
  const [swellingScore, setSwellingScore] = useState(2);
  const [opioidPills, setOpioidPills] = useState(1);
  const [freeNotes, setFreeNotes] = useState("");

  // AAOS Red Flags
  const [fever, setFever] = useState(false);
  const [woundDrainage, setWoundDrainage] = useState(false);
  const [calfPain, setCalfPain] = useState(false);
  const [footDrop, setFootDrop] = useState(false);
  const [chestPain, setChestPain] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check saved PIN in localStorage
  useEffect(() => {
    logger.info("PATIENT_PORTAL", `Mounting recovery portal for token ${token}`);
    loadPatientData();
  }, [token]);

  async function loadPatientData() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/patient/${token}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        setLoadError(json.error || "Unable to load patient recovery profile.");
        setIsLoading(false);
        return;
      }

      const pData = json.data.patient as PatientProfile;
      setPatient(pData);
      const hist = (json.data.history || []) as CheckinData[];
      setHistory(hist);
      setHasCompletedToday(Boolean(json.data.hasCompletedToday));
      setShowCheckinForm(!json.data.hasCompletedToday);

      const postOpDay = pData.postOpDay || 1;
      setCheckinDay(postOpDay);

      if (json.data.todayCheckin) {
        const tc = json.data.todayCheckin as CheckinData;
        setTodayCheckin(tc);
        // Pre-populate form with today's values in case they want to edit
        setPainScore(tc.painScore);
        setFlexionDegrees(tc.flexionDegrees);
        setWalkingMeters(tc.walkingStepsOrMeters);
        setSwellingScore(tc.swellingScore);
        setOpioidPills(tc.opioidPillsTaken);
        setFever(tc.feverReported);
        setWoundDrainage(tc.woundDrainageReported);
        setCalfPain(tc.calfPainReported);
        setFootDrop(tc.footDropReported);
        setChestPain(tc.chestPainShortnessOfBreath);
        setFreeNotes(tc.patientFreeNotes || "");
      }

      // Check if previously unlocked on this device
      const savedPin = typeof window !== "undefined" ? localStorage.getItem(`postop_pin_${token}`) : null;
      if (savedPin) {
        verifyPinSilently(savedPin);
      } else {
        setIsLoading(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("PATIENT_PORTAL", "Error loading patient data", msg);
      setLoadError("Network error. Please check your internet connection.");
      setIsLoading(false);
    }
  }

  async function verifyPinSilently(pin: string) {
    try {
      const res = await fetch(`/api/patient/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: pin }),
      });
      const json = await res.json();
      if (json.success && json.verified) {
        setIsUnlocked(true);
      } else {
        localStorage.removeItem(`postop_pin_${token}`);
        setIsUnlocked(false);
      }
    } catch {
      setIsUnlocked(false);
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePasscodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inputPasscode.trim()) return;

    setIsVerifyingPasscode(true);
    setPasscodeError(null);

    try {
      const res = await fetch(`/api/patient/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: inputPasscode.trim() }),
      });
      const json = await res.json();

      if (json.success && json.verified) {
        setIsUnlocked(true);
        toast.success("Identity verified! Welcome to your recovery portal.");
        if (typeof window !== "undefined") {
          localStorage.setItem(`postop_pin_${token}`, inputPasscode.trim());
        }
      } else {
        const errorMsg = json.error || "Incorrect 4-digit PIN. Please verify with your clinic.";
        setPasscodeError(errorMsg);
        toast.error(errorMsg);
      }
    } catch {
      const errorMsg = "Could not verify PIN. Please check your connection and try again.";
      setPasscodeError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsVerifyingPasscode(false);
    }
  }

  async function handleCheckinSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patient) return;

    setIsSubmitting(true);
    const toastId = toast.loading("Saving today's recovery check-in for your surgical team...");
    logger.info("PATIENT_CHECKIN", `Submitting checkin for ${patient.name} (Day ${checkinDay})`);

    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id,
          dayNumber: checkinDay,
          painScore,
          flexionDegrees,
          walkingStepsOrMeters: walkingMeters,
          swellingScore,
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
        toast.success(
          isEditingToday
            ? "Today's recovery check-in updated successfully!"
            : "Today's recovery check-in submitted and saved!",
          { id: toastId }
        );
        setTodayCheckin({
          id: json.data.id,
          dayNumber: checkinDay,
          painScore,
          flexionDegrees,
          walkingStepsOrMeters: walkingMeters,
          swellingScore,
          opioidPillsTaken: opioidPills,
          feverReported: fever,
          woundDrainageReported: woundDrainage,
          calfPainReported: calfPain,
          footDropReported: footDrop,
          chestPainShortnessOfBreath: chestPain,
          patientFreeNotes: freeNotes,
          triageStatus: json.data.triageStatus,
          triageLayer: json.data.triageLayer,
          triageReason: json.data.triageReason,
          clinicalAction: json.data.clinicalAction,
        });
        setHasCompletedToday(true);
        setIsEditingToday(false);
        setShowCheckinForm(false);

        setPatient({
          ...patient,
          currentTriageStatus: json.data.triageStatus,
        });

        await loadPatientData();
      } else {
        toast.error(json.error || "Failed to submit daily check-in", { id: toastId });
      }
    } catch (err) {
      logger.error("PATIENT_CHECKIN", "Failed to submit daily check-in", err);
      toast.error("Could not reach server to submit check-in", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleLockPortal() {
    if (typeof window !== "undefined") {
      localStorage.removeItem(`postop_pin_${token}`);
    }
    setIsUnlocked(false);
    setInputPasscode("");
  }

  // Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6 space-y-3">
        <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 animate-pulse">
          <Activity className="w-5 h-5 animate-spin" />
        </div>
        <p className="text-xs font-semibold text-slate-500">Loading surgical recovery portal...</p>
      </div>
    );
  }

  // Error / Invalid Link Screen
  if (loadError || !patient) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 space-y-5 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Recovery Link Not Found</h1>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {loadError || "This recovery link is invalid or has expired. Please contact your surgical clinic for your personalized link."}
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white transition-colors"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  // Passcode Gate Screen (Hospital White Card)
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
        {/* Clinician Top Banner (When Doctor is Viewing) */}
        {isDoctorView && (
          <aside
            aria-label="Clinician View Banner"
            className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50 shadow-md"
          >
            <div className="max-w-4xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0 mt-0.5 sm:mt-0">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 uppercase tracking-wider">
                      <Eye className="w-3 h-3" />
                      Clinician View Mode
                    </span>
                    <span className="text-xs font-semibold text-slate-200">
                      Viewing as {doctorDisplayName}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    You are viewing this portal as a doctor. Patient details and daily check-ins cannot be edited; you have view-only access.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white transition-colors shadow-xs"
                >
                  <span>← Back to Clinician Dashboard</span>
                </Link>
              </div>
            </div>
          </aside>
        )}

        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
          <div className="max-w-md w-full space-y-6">
            {/* Clinical Header */}
            <div className="text-center space-y-1.5">
              <div className="inline-flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-xs">
                  <Activity className="w-5 h-5 stroke-[2.5]" />
                </div>
                <span className="text-xl font-bold tracking-tight text-slate-900">
                  PostOp<span className="text-teal-600">-Check</span>
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Joint Arthroplasty Continuous Recovery Intelligence
              </p>
            </div>

            {/* Passcode Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
              <div className="p-3 rounded-2xl bg-teal-50/80 border border-teal-200/80 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center text-teal-800 shrink-0">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider">
                    Surgical Care Team
                  </span>
                  <h3 className="text-xs font-bold text-slate-900">{patient.doctorName}</h3>
                  <p className="text-[10px] text-slate-500">{patient.hospital}</p>
                </div>
              </div>

              <div className="text-center space-y-1">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-teal-700 mx-auto mb-1">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  Welcome, {patient.name}
                </h2>
                <p className="text-xs text-slate-500">
                  {patient.kneeSide} Knee Total Arthroplasty &bull; Day {patient.postOpDay}
                </p>
              </div>

              {/* Clinician One-Click Bypass Card */}
              {isDoctorView && (
                <div className="p-4 rounded-2xl bg-teal-50/90 border border-teal-200 text-center space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-teal-900">
                    <Stethoscope className="w-4 h-4 text-teal-700" />
                    <span>Clinician Direct Access</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    You are authenticated as <strong>{doctorDisplayName}</strong>. You can preview {patient.name}&apos;s recovery portal in read-only audit mode without entering the patient&apos;s personal PIN.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUnlocked(true);
                      toast.info("Opened recovery portal in Clinician View Mode");
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Patient Portal as Clinician &rarr;</span>
                  </button>
                  <div className="pt-1 border-t border-teal-200/60 text-[10px] text-slate-400 uppercase tracking-wider">
                    Or patient can enter 4-digit PIN below
                  </div>
                </div>
              )}

              <form onSubmit={handlePasscodeSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 text-center">
                    Enter 4-Digit Passcode (PIN)
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    autoFocus={!isDoctorView}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={inputPasscode}
                    onChange={(e) => {
                      setInputPasscode(e.target.value);
                      if (passcodeError) setPasscodeError(null);
                    }}
                    placeholder="••••"
                    className="w-full text-center text-2xl tracking-[0.4em] py-3 px-4 rounded-xl bg-slate-50 border border-slate-300 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 text-slate-900 font-mono placeholder:text-slate-400 transition-colors"
                  />
                  <p className="text-[11px] text-slate-500 text-center mt-2">
                    Provided by orthopedic surgeon or clinic nurse. Default is{" "}
                    <strong className="text-slate-700">1234</strong>.
                  </p>
                </div>

                {passcodeError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 text-center">
                    {passcodeError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isVerifyingPasscode || !inputPasscode.trim()}
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  {isVerifyingPasscode ? (
                    <span>Verifying PIN...</span>
                  ) : (
                    <>
                      <span>Unlock Recovery Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>Direct Patient Link &bull; Single-Patient Token</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active Triage Status
  const activeStatus = todayCheckin ? todayCheckin.triageStatus : patient.currentTriageStatus;
  const isGatedAllowed = activeStatus === "GREEN";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Clinician Top Banner (When Doctor is Viewing) */}
      {isDoctorView && (
        <aside
          aria-label="Clinician View Banner"
          className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50 shadow-md"
        >
          <div className="max-w-4xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0 mt-0.5 sm:mt-0">
                <Stethoscope className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 uppercase tracking-wider">
                    <Eye className="w-3 h-3" />
                    Clinician View Mode
                  </span>
                  <span className="text-xs font-semibold text-slate-200">
                    Viewing as {doctorDisplayName}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  You are viewing this portal as a doctor. Patient details and daily check-ins cannot be edited; you have view-only access.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                onClick={handleGenerateAiBrief}
                disabled={isGeneratingAiBrief}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-teal-500 via-indigo-500 to-purple-600 hover:from-teal-400 hover:to-purple-500 text-white transition-all shadow-xs disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
                <span>{isGeneratingAiBrief ? "Analyzing..." : "AI Clinical Brief"}</span>
              </button>

              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
              >
                <span>← Dashboard</span>
              </Link>
            </div>
          </div>
        </aside>
      )}

      {/* Patient Top Header Bar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-xs">
              <Activity className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-slate-900">PostOp-Check</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                  {isDoctorView ? "Clinician Audit View" : "Patient Portal"}
                </span>
                {isDoctorView && (
                  <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    Read-Only
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                {patient.hospital} &bull; {patient.doctorName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isDoctorView && (
              <Link
                href="/dashboard"
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors flex items-center gap-1.5"
              >
                <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                <span className="hidden sm:inline">Clinician Dashboard</span>
                <span className="sm:hidden">Dashboard</span>
              </Link>
            )}
            <button
              onClick={handleLockPortal}
              title="Lock portal on this device"
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5"
            >
              <Lock className="w-3 h-3 text-slate-500" />
              <span>Lock PIN</span>
            </button>
          </div>
        </div>
      </header>

      {/* Sticky Edit Mode Active Banner */}
      {isEditingToday && !isDoctorView && (
        <aside
          aria-label="Active Edit Mode Banner"
          className="bg-amber-500 text-slate-950 border-b border-amber-600 sticky top-0 z-40 shadow-md py-2.5 px-4 animate-in slide-in-from-top-2 duration-200"
        >
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-950/15 flex items-center justify-center text-slate-950 shrink-0">
                <Edit3 className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-950 text-amber-300 px-2 py-0.5 rounded-full">
                    Active Edit Mode
                  </span>
                  <span className="text-xs font-bold text-slate-950">
                    Modifying Today&apos;s Recovery Check-in (Day {checkinDay})
                  </span>
                </div>
                <p className="text-[11px] text-slate-900/90 font-medium">
                  You are editing your recorded recovery data. Please make your changes in the form below and remember to click &ldquo;Save &amp; Update Today&apos;s Recovery Check-in&rdquo;.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={() => {
                  formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-900 text-amber-300 text-xs font-bold transition-colors shadow-xs flex items-center gap-1"
              >
                <span>Scroll to Form</span>
                <span>&darr;</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditingToday(false);
                  setShowCheckinForm(!hasCompletedToday);
                  toast.info("Edit mode cancelled. Original check-in preserved.");
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 text-slate-950 text-xs font-bold transition-colors"
              >
                Cancel Edit &times;
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Clinician Oversight Notice Banner */}
        {isDoctorView && (
          <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-xs flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0 mt-0.5">
              <Stethoscope className="w-4 h-4" />
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs font-bold text-teal-300 uppercase tracking-wider">
                  Doctor View: Read-Only Audit Mode
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  Patient: {patient.name} ({patient.kneeSide} Knee)
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                You are viewing {patient.name}&apos;s post-discharge recovery logs as <strong className="text-white">{doctorDisplayName}</strong>. You cannot edit patient details, reported pain scores, or daily check-ins. To adjust clinical care plans or contact the patient, use your <Link href="/dashboard" className="text-teal-400 underline font-semibold hover:text-teal-300">Clinician Triage Dashboard</Link>.
              </p>
            </div>
          </div>
        )}

        {/* Welcome & Surgical Profile Banner */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                  Post-Operative Day {patient.postOpDay}
                </span>
                <span className="text-xs text-slate-400">
                  Surgery: {patient.surgeryDate}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Welcome, {patient.name}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Continuous recovery protocol for <strong className="text-slate-700">{patient.kneeSide} Knee Total Arthroplasty</strong>
              </p>
            </div>

            {/* Status Chip */}
            <div className="flex items-center gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div
                className={`w-3 h-3 rounded-full ${
                  activeStatus === "RED"
                    ? "bg-red-500 animate-pulse"
                    : activeStatus === "AMBER"
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
              />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Current Status
                </div>
                <div
                  className={`text-xs font-bold ${
                    activeStatus === "RED"
                      ? "text-red-700"
                      : activeStatus === "AMBER"
                      ? "text-amber-700"
                      : "text-emerald-700"
                  }`}
                >
                  {activeStatus === "RED"
                    ? "🔴 Clinical Alert (Red)"
                    : activeStatus === "AMBER"
                    ? "🟡 Recovery Trend (Amber)"
                    : "🟢 Recovery On Track (Green)"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 1: TODAY'S CHECK-IN STATUS & MULTI-DAY ASSESSMENT FORM    */}
        {/* ------------------------------------------------------------------ */}
        {hasCompletedToday && todayCheckin && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Today&apos;s Recovery Check-in Recorded
                  </h2>
                  <p className="text-xs text-slate-500">
                    Post-Operative Day {todayCheckin.dayNumber} &bull; Recorded {todayCheckin.dateFormatted || "Today"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isDoctorView ? (
                  <div
                    title="Daily check-in editing is restricted to the patient"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 text-xs font-semibold border border-slate-200 cursor-not-allowed"
                  >
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Patient Entry (Read-Only)</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setCheckinDay(todayCheckin.dayNumber);
                      setIsEditingToday(true);
                      setShowCheckinForm(true);
                      setPainScore(todayCheckin.painScore);
                      setFlexionDegrees(todayCheckin.flexionDegrees);
                      setWalkingMeters(todayCheckin.walkingStepsOrMeters);
                      setSwellingScore(todayCheckin.swellingScore);
                      setOpioidPills(todayCheckin.opioidPillsTaken);
                      setFever(todayCheckin.feverReported);
                      setCalfPain(todayCheckin.calfPainReported);
                      setWoundDrainage(todayCheckin.woundDrainageReported);
                      setFootDrop(todayCheckin.footDropReported);
                      setChestPain(todayCheckin.chestPainShortnessOfBreath);
                      setFreeNotes(todayCheckin.patientFreeNotes || "");
                      toast.info("Edit mode active. Scrolled to recovery check-in form.");
                      setTimeout(() => {
                        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }, 100);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-teal-600" />
                    <span>Edit Today&apos;s Check-in</span>
                  </button>
                )}
              </div>
            </div>

            {/* Clinical Feedback Banner */}
            <div
              className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-1 ${
                activeStatus === "RED"
                  ? "bg-red-50 border-red-200 text-red-900"
                  : activeStatus === "AMBER"
                  ? "bg-amber-50 border-amber-200 text-amber-900"
                  : "bg-emerald-50 border-emerald-200 text-emerald-900"
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                {activeStatus === "RED" ? (
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                ) : activeStatus === "AMBER" ? (
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                )}
                <span>
                  {activeStatus === "RED"
                    ? "Clinical Notification Forwarded to Surgical Team"
                    : activeStatus === "AMBER"
                    ? "Recovery Precaution Forwarded to Surgical Nurse"
                    : "Optimal Recovery Progress"}
                </span>
              </div>
              <p className="text-[12px] opacity-90">
                {todayCheckin.triageReason ||
                  (activeStatus === "RED"
                    ? "High complication risk flag identified. Please rest and follow clinical instructions."
                    : activeStatus === "AMBER"
                    ? "Knee recovery is within precaution bounds. Rest with leg elevated above heart."
                    : "Your mobility and pain are progressing within expected clinical parameters.")}
              </p>
              {todayCheckin.clinicalAction && (
                <div className="pt-1 font-semibold text-[11px]">
                  Action: {todayCheckin.clinicalAction}
                </div>
              )}
            </div>

            {/* Today's Recorded Vitals Grid with Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                    Pain Score
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                      todayCheckin.painScore <= 3
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : todayCheckin.painScore <= 6
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}
                  >
                    {todayCheckin.painScore <= 3 ? "Mild" : todayCheckin.painScore <= 6 ? "Moderate" : "Severe"}
                  </span>
                </div>
                <div className="text-xl font-bold text-slate-900 flex items-baseline gap-1">
                  <span>{todayCheckin.painScore}</span>
                  <span className="text-xs text-slate-400">/ 10</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                    Flexion Angle
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                      todayCheckin.flexionDegrees >= 90
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-teal-50 text-teal-700 border-teal-200"
                    }`}
                  >
                    {todayCheckin.flexionDegrees >= 90 ? "Target Achieved" : "Range"}
                  </span>
                </div>
                <div className="text-xl font-bold text-slate-900 flex items-baseline gap-1">
                  <span>{todayCheckin.flexionDegrees}°</span>
                  <span className="text-xs text-teal-700 font-normal">flexion</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                    Walking Distance
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Mobility
                  </span>
                </div>
                <div className="text-xl font-bold text-slate-900 flex items-baseline gap-1">
                  <span>{todayCheckin.walkingStepsOrMeters}</span>
                  <span className="text-xs text-slate-400">m</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                    Opioid Pills
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                      todayCheckin.opioidPillsTaken === 0
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-purple-50 text-purple-700 border-purple-200"
                    }`}
                  >
                    {todayCheckin.opioidPillsTaken === 0 ? "Non-Opioid" : "Med Active"}
                  </span>
                </div>
                <div className="text-xl font-bold text-slate-900 flex items-baseline gap-1">
                  <span>{todayCheckin.opioidPillsTaken}</span>
                  <span className="text-xs text-slate-400">today</span>
                </div>
              </div>
            </div>

            {/* Today's Reported Red Flag Badges */}
            {(todayCheckin.feverReported ||
              todayCheckin.calfPainReported ||
              todayCheckin.woundDrainageReported ||
              todayCheckin.footDropReported ||
              todayCheckin.chestPainShortnessOfBreath) && (
              <div className="p-3 rounded-2xl bg-red-50/80 border border-red-200 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-800 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  Reported Flags:
                </span>
                {todayCheckin.feverReported && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white text-red-800 border border-red-300 shadow-2xs">
                    🔥 Fever &ge; 101.5°F
                  </span>
                )}
                {todayCheckin.calfPainReported && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white text-red-800 border border-red-300 shadow-2xs">
                    ⚠️ Calf Pain / Swelling (DVT)
                  </span>
                )}
                {todayCheckin.woundDrainageReported && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white text-red-800 border border-red-300 shadow-2xs">
                    💧 Wound Drainage
                  </span>
                )}
                {todayCheckin.footDropReported && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white text-red-800 border border-red-300 shadow-2xs">
                    🦶 Foot Numbness / Drop
                  </span>
                )}
                {todayCheckin.chestPainShortnessOfBreath && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-600 text-white border border-red-700 shadow-2xs">
                    🚨 Shortness of Breath / Chest Pain
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Daily Recovery Check-in Form */}
        {showCheckinForm && (
          <div
            ref={formRef}
            className={`rounded-3xl p-6 sm:p-8 transition-all duration-300 space-y-6 ${
              isEditingToday
                ? "bg-white border-2 border-amber-400 ring-4 ring-amber-400/10 shadow-lg"
                : "bg-white border border-slate-200 shadow-2xs"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      isEditingToday
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : "bg-teal-50 text-teal-700 border border-teal-200"
                    }`}
                  >
                    {isEditingToday ? "Active Edit Session" : "Daily Clinical Recovery Log"}
                  </span>
                  {isEditingToday && (
                    <span className="text-[11px] text-amber-700 font-semibold animate-pulse">
                      ● Unsaved edits
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  {isEditingToday
                    ? `Editing Post-Op Day ${patient.postOpDay} Recovery Assessment`
                    : `Post-Operative Day ${patient.postOpDay} Recovery Assessment`}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isEditingToday
                    ? "Adjust your pain score, flexion, or symptoms below, then save to update your surgical team."
                    : "Complete your daily check-in to keep your orthopedic surgical team updated on your knee recovery."}
                </p>
              </div>

              {hasCompletedToday && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingToday(false);
                    setShowCheckinForm(false);
                    toast.info("Edit mode cancelled. Original check-in preserved.");
                  }}
                  className="text-xs px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold self-start transition-colors"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            {/* Clinician Notice Banner in Form */}
            {isDoctorView && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="font-bold text-xs">Doctor View &bull; Patient Self-Report Only</h4>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    You are viewing {patient.name}&apos;s recovery portal as a doctor. Patient symptom details, pain ratings, and daily check-ins are restricted to direct entry by the patient to maintain audit compliance. You can review the trajectory and vitals below.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleCheckinSubmit} className="space-y-6">
              {/* Question 1: Pain Score Slider */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-semibold text-slate-700">
                    Knee Pain Level Today (0 = No Pain, 10 = Severe)
                  </label>
                  <span
                    className={`font-bold px-2.5 py-1 rounded-md text-xs ${
                      painScore <= 3
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : painScore <= 6
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {painScore} / 10
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  disabled={isDoctorView}
                  value={painScore}
                  onChange={(e) => setPainScore(Number(e.target.value))}
                  className={`w-full accent-teal-600 h-3 bg-slate-200 rounded-lg ${
                    isDoctorView ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                  }`}
                />
                {/* 1-Tap Quick Select Numbers for Mobile Ergonomics */}
                <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-0.5">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                    <button
                      key={score}
                      type="button"
                      disabled={isDoctorView}
                      onClick={() => setPainScore(score)}
                      className={`flex-1 min-w-[28px] py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        painScore === score
                          ? "bg-teal-600 text-white shadow-2xs"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      } ${isDoctorView ? "cursor-not-allowed opacity-60" : ""}`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>0 (None)</span>
                  <span>5 (Moderate)</span>
                  <span>10 (Worst Possible)</span>
                </div>
              </div>

              {/* Question 2: Knee Flexion Angle & Range of Motion Milestones */}
              <div className="space-y-3 p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-slate-200/80">
                  <div>
                    <label className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <span>Knee Bend &amp; Motion (Range of Motion)</span>
                      <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                        Physio Benchmark
                      </span>
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Select the everyday activity that best describes how far you can bend your knee today:
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <span className="font-mono font-extrabold text-teal-800 bg-teal-100/80 px-2.5 py-1 rounded-lg border border-teal-300 text-xs shadow-2xs">
                      {flexionDegrees}° Bend
                    </span>
                  </div>
                </div>

                {/* Patient-Friendly Milestone Selection Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {[
                    {
                      deg: 45,
                      label: "30° – 45°: Slight Bend",
                      desc: "Can bend knee slightly by sliding heel back a few inches",
                      icon: "🦶",
                      target: false,
                    },
                    {
                      deg: 60,
                      label: "60°: Halfway Bend",
                      desc: "Can bend knee halfway toward a right angle",
                      icon: "📐",
                      target: false,
                    },
                    {
                      deg: 90,
                      label: "90°: Chair Sitting (L-Shape)",
                      desc: "Can sit comfortably on a chair with knee bent in an L-shape",
                      icon: "🪑",
                      target: true,
                    },
                    {
                      deg: 100,
                      label: "100°: Stair Climbing",
                      desc: "Can bend knee enough to manage stairs comfortably",
                      icon: "🪜",
                      target: false,
                    },
                    {
                      deg: 115,
                      label: "115°+: Full Rotation",
                      desc: "Can pedal a bicycle through a complete smooth rotation",
                      icon: "🚲",
                      target: false,
                    },
                    {
                      deg: 125,
                      label: "125°+: Deep Flexion",
                      desc: "Can tuck foot comfortably beneath chair seat",
                      icon: "✨",
                      target: false,
                    },
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
                        disabled={isDoctorView}
                        onClick={() => setFlexionDegrees(card.deg)}
                        className={`text-left p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-teal-600 text-white border-teal-700 shadow-xs ring-2 ring-teal-500/30"
                            : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                        } ${isDoctorView ? "cursor-not-allowed opacity-60" : ""}`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-xs flex items-center gap-1.5">
                            <span className="text-sm">{card.icon}</span>
                            <span className={isSelected ? "text-white" : "text-slate-900"}>{card.label}</span>
                          </span>
                          {card.target && (
                            <span
                              className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${
                                isSelected
                                  ? "bg-white text-teal-800"
                                  : "bg-amber-100 text-amber-800 border border-amber-200"
                              }`}
                            >
                              Goal
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-[11px] mt-1 leading-snug ${
                            isSelected ? "text-teal-50" : "text-slate-500"
                          }`}
                        >
                          {card.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Fine-Tuning Slider */}
                <div className="pt-2 border-t border-slate-200/70 space-y-1.5">
                  <div className="flex justify-between items-center text-[11px] text-slate-500">
                    <span className="font-medium text-slate-600">Fine-tune exact angle:</span>
                    <span className="font-mono font-bold text-teal-700">{flexionDegrees}°</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="135"
                    step="5"
                    disabled={isDoctorView}
                    value={flexionDegrees}
                    onChange={(e) => setFlexionDegrees(Number(e.target.value))}
                    className={`w-full accent-teal-600 h-2.5 bg-slate-200 rounded-lg ${
                      isDoctorView ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                    }`}
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>30° (Slight bend)</span>
                    <span className="text-teal-700 font-bold">90° (Chair L-Shape Target)</span>
                    <span>135° (Full deep bend)</span>
                  </div>
                </div>
              </div>

              {/* Question 3: Walking & Swelling */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Walking Distance (meters)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="5000"
                    step="50"
                    disabled={isDoctorView}
                    value={walkingMeters}
                    onChange={(e) => setWalkingMeters(Number(e.target.value))}
                    className={`w-full py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-300 focus:border-teal-600 focus:outline-none text-xs text-slate-900 ${
                      isDoctorView ? "cursor-not-allowed opacity-60" : ""
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Knee Swelling Level
                  </label>
                  <select
                    value={swellingScore}
                    disabled={isDoctorView}
                    onChange={(e) => setSwellingScore(Number(e.target.value))}
                    className={`w-full py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-300 focus:border-teal-600 focus:outline-none text-xs text-slate-900 ${
                      isDoctorView ? "cursor-not-allowed opacity-60" : ""
                    }`}
                  >
                    <option value={1}>Mild (Slight puffiness)</option>
                    <option value={2}>Moderate (Expected for Day {patient.postOpDay})</option>
                    <option value={3}>Severe (Tense, skin shiny)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Opioid Pills Taken Today
                  </label>
                  <select
                    value={opioidPills}
                    disabled={isDoctorView}
                    onChange={(e) => setOpioidPills(Number(e.target.value))}
                    className={`w-full py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-300 focus:border-teal-600 focus:outline-none text-xs text-slate-900 ${
                      isDoctorView ? "cursor-not-allowed opacity-60" : ""
                    }`}
                  >
                    <option value={0}>0 pills (Tylenol/Ice only)</option>
                    <option value={1}>1 pill</option>
                    <option value={2}>2 pills</option>
                    <option value={3}>3 pills</option>
                    <option value={4}>4+ pills</option>
                  </select>
                </div>
              </div>

              {/* Question 4: AAOS Red Flags */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-700">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Important Symptoms Check (Check any that apply today)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors min-h-[50px] ${
                      isDoctorView ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                    } ${
                      fever
                        ? "bg-red-50 border-red-300 text-red-900 font-semibold"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={isDoctorView}
                      checked={fever}
                      onChange={(e) => setFever(e.target.checked)}
                      className="rounded accent-red-600 w-5 h-5 shrink-0"
                    />
                    <span>Fever &ge; 101.5°F (38.6°C)</span>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors min-h-[50px] ${
                      isDoctorView ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                    } ${
                      calfPain
                        ? "bg-red-50 border-red-300 text-red-900 font-semibold"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={isDoctorView}
                      checked={calfPain}
                      onChange={(e) => setCalfPain(e.target.checked)}
                      className="rounded accent-red-600 w-5 h-5 shrink-0"
                    />
                    <span>Calf tenderness or swelling (DVT sign)</span>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors min-h-[50px] ${
                      isDoctorView ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                    } ${
                      woundDrainage
                        ? "bg-red-50 border-red-300 text-red-900 font-semibold"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={isDoctorView}
                      checked={woundDrainage}
                      onChange={(e) => setWoundDrainage(e.target.checked)}
                      className="rounded accent-red-600 w-5 h-5 shrink-0"
                    />
                    <span>Wound drainage / redness spreading</span>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors min-h-[50px] ${
                      isDoctorView ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                    } ${
                      footDrop
                        ? "bg-red-50 border-red-300 text-red-900 font-semibold"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={isDoctorView}
                      checked={footDrop}
                      onChange={(e) => setFootDrop(e.target.checked)}
                      className="rounded accent-red-600 w-5 h-5 shrink-0"
                    />
                    <span>Foot numbness / unable to lift toes</span>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors min-h-[50px] sm:col-span-2 ${
                      isDoctorView ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                    } ${
                      chestPain
                        ? "bg-red-50 border-red-300 text-red-900 font-bold"
                        : "bg-white border-slate-200 text-red-700 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={isDoctorView}
                      checked={chestPain}
                      onChange={(e) => setChestPain(e.target.checked)}
                      className="rounded accent-red-600 w-5 h-5 shrink-0"
                    />
                    <span>
                      Shortness of breath or sudden chest pain (Emergency)
                    </span>
                  </label>
                </div>
              </div>

              {/* Free Notes */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Notes for Orthopedic Surgeon or Care Team (Optional)
                </label>
                <textarea
                  rows={2}
                  disabled={isDoctorView}
                  value={freeNotes}
                  onChange={(e) => setFreeNotes(e.target.value)}
                  placeholder="e.g., Felt a bit stiff when getting out of bed, ice helped..."
                  className={`w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:border-teal-600 focus:outline-none text-xs text-slate-900 placeholder:text-slate-400 ${
                    isDoctorView ? "cursor-not-allowed opacity-60" : ""
                  }`}
                />
              </div>

              {isDoctorView ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-3.5 px-6 rounded-2xl font-bold text-xs text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span>Submission Disabled &bull; Doctor Read-Only Mode</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 rounded-2xl font-bold text-xs text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Evaluating Clinical Triage Algorithm...</span>
                  ) : (
                    <>
                      <span>
                        {isEditingToday
                          ? "Save & Update Today's Recovery Check-in"
                          : `Submit Day ${checkinDay} Recovery Check-in`}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </form>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 2: GATED PHYSICAL THERAPY LIBRARY                         */}
        {/* ------------------------------------------------------------------ */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                Stage 4: Support
              </span>
              <h2 className="text-base font-bold text-slate-900">
                Prescribed Physical Therapy Exercises
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {isGatedAllowed ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Safe to Exercise</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                  <Lock className="w-3.5 h-3.5 text-red-600" />
                  <span>Exercises Paused</span>
                </span>
              )}
            </div>
          </div>

          {!isGatedAllowed ? (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Rehabilitation Paused for Clinical Precaution</span>
              </div>
              <p className="leading-relaxed opacity-90">
                Based on today&apos;s symptoms ({activeStatus === "RED" ? "Critical complication flag" : "Recovery trend alert"}), active knee flexion drills are temporarily paused. Elevate the leg above heart level, apply cold packs, and wait for your surgical team to review.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-900">1. Quadriceps Sets</span>
                  <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    3x 10 Reps
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Lie flat on back. Tighten thigh muscle, pressing the back of your knee downward flat into the bed. Hold 5 seconds.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-900">2. Heel Slides</span>
                  <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    2x 10 Reps
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Slide heel toward buttocks, bending knee as far as comfortable. Hold for 3 seconds, then slide back.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-900">3. Ankle Pumps</span>
                  <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    20x / Hour
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Move foot up and down repeatedly to stimulate venous circulation and prevent blood clots.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 3: RECOVERY HISTORY LOG                                    */}
        {/* ------------------------------------------------------------------ */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Timeline
              </span>
              <h2 className="text-base font-bold text-slate-900">Your Recovery History</h2>
            </div>
            <span className="text-xs text-slate-500">
              {history.length} {history.length === 1 ? "entry" : "entries"} recorded
            </span>
          </div>

          {history.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              No previous check-ins on file.
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => {
                const hasRedFlags =
                  item.feverReported ||
                  item.calfPainReported ||
                  item.woundDrainageReported ||
                  item.footDropReported ||
                  item.chestPainShortnessOfBreath;

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      item.triageStatus === "RED"
                        ? "bg-red-50/40 border-red-200"
                        : item.triageStatus === "AMBER"
                        ? "bg-amber-50/30 border-amber-200"
                        : "bg-slate-50/70 border-slate-200/80 hover:border-slate-300"
                    }`}
                  >
                    {/* Top Row: Day Pill, Date Badge & Triage Status Badge */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/60">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-bold text-xs tracking-tight shadow-2xs">
                          Day {item.dayNumber}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.dateFormatted || `Post-Op Day ${item.dayNumber}`}</span>
                        </span>
                      </div>

                      <div>
                        {item.triageStatus === "RED" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                            <span>Clinical Alert</span>
                          </span>
                        ) : item.triageStatus === "AMBER" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Precaution Alert</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>On Track</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Medical Metrics Badges Grid */}
                    <div className="pt-3 flex items-center gap-2 flex-wrap">
                      {/* Pain Score Badge */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                          item.painScore <= 3
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                            : item.painScore <= 6
                            ? "bg-amber-50 border-amber-200 text-amber-800"
                            : "bg-red-50 border-red-200 text-red-800"
                        }`}
                      >
                        <HeartPulse className="w-3.5 h-3.5 shrink-0" />
                        <span>Pain: {item.painScore}/10</span>
                        <span className="text-[10px] font-normal opacity-80">
                          ({item.painScore <= 3 ? "Mild" : item.painScore <= 6 ? "Moderate" : "Severe"})
                        </span>
                      </span>

                      {/* Flexion Angle Badge */}
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-50 border border-teal-200 text-teal-800">
                        <Activity className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>Flexion: {item.flexionDegrees}°</span>
                      </span>

                      {/* Walking Distance Badge */}
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 border border-indigo-200 text-indigo-800">
                        <Footprints className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>Walking: {item.walkingStepsOrMeters}m</span>
                      </span>

                      {/* Opioid Pills Badge */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                          item.opioidPillsTaken === 0
                            ? "bg-slate-100 border-slate-200 text-slate-600"
                            : "bg-purple-50 border-purple-200 text-purple-800"
                        }`}
                      >
                        <Pill className="w-3.5 h-3.5 shrink-0" />
                        <span>Opioids: {item.opioidPillsTaken} pill{item.opioidPillsTaken === 1 ? "" : "s"}</span>
                      </span>

                      {/* Swelling Badge */}
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700">
                        <span>
                          Swelling: {item.swellingScore === 1 ? "Mild" : item.swellingScore === 2 ? "Moderate" : "Severe"}
                        </span>
                      </span>
                    </div>

                    {/* Red Flag Badges if Any */}
                    {hasRedFlags && (
                      <div className="pt-2.5 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider">
                          Reported Red Flags:
                        </span>
                        {item.feverReported && (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-100 text-red-800 border border-red-300">
                            🔥 Fever &ge; 101.5°F
                          </span>
                        )}
                        {item.calfPainReported && (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-100 text-red-800 border border-red-300">
                            ⚠️ Calf Tenderness (DVT)
                          </span>
                        )}
                        {item.woundDrainageReported && (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-100 text-red-800 border border-red-300">
                            💧 Wound Drainage
                          </span>
                        )}
                        {item.footDropReported && (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-100 text-red-800 border border-red-300">
                            🦶 Foot Numbness
                          </span>
                        )}
                        {item.chestPainShortnessOfBreath && (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-600 text-white border border-red-700">
                            🚨 Chest Pain / SOB
                          </span>
                        )}
                      </div>
                    )}

                    {/* Clinical Triage Assessment Box */}
                    <div className="mt-2.5 p-3 rounded-xl bg-white border border-slate-200/80 text-xs text-slate-700 space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-[11px]">
                        <Info className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>Clinical Triage Assessment:</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {item.triageReason || "Routine recovery metrics progressing normally."}
                      </p>
                      {item.clinicalAction && (
                        <div className="text-[11px] font-semibold text-teal-800 pt-0.5">
                          Care Protocol: {item.clinicalAction}
                        </div>
                      )}
                      {item.patientFreeNotes && (
                        <div className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-100 mt-1">
                          Patient self-note: &ldquo;{item.patientFreeNotes}&rdquo;
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-4 text-center text-xs text-slate-400">
        <p>PostOp-Check &bull; Joint Arthroplasty Continuous Care Protocol &bull; Clinical Support: {patient.doctorName}</p>
      </footer>

      {/* Clinician AI Clinical Brief Modal (Doctor View Only) */}
      {isDoctorView && (
        <AiClinicalBriefModal
          isOpen={aiBriefModalOpen}
          onClose={() => setAiBriefModalOpen(false)}
          isLoading={isGeneratingAiBrief}
          data={aiBriefData}
          patientName={patient.name}
          patientId={patient.id}
          postOpDay={checkinDay}
        />
      )}
    </div>
  );
}

export default function PatientPortalPage(props: { params: Promise<{ token: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
          <div className="text-xs text-slate-500">Loading patient portal...</div>
        </div>
      }
    >
      <PatientPortalContent params={props.params} />
    </Suspense>
  );
}
