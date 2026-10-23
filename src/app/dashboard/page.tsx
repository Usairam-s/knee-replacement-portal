"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { UserButton, useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { dbService, PatientRecord, CheckinRecord } from "@/lib/db-service";
import { logger } from "@/lib/logger";
import {
  Activity,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Users,
  UserPlus,
  Phone,
  X,
  Copy,
  Check,
  ChevronRight,
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  MessageSquare,
  QrCode,
  Share2,
  Info,
  ExternalLink,
  Printer,
  KeyRound,
  LayoutDashboard,
  Link2,
  FileText,
  Search,
  Filter,
  Stethoscope,
  Clock,
  Sparkles,
  Trash2,
  RotateCcw,
  HeartPulse,
  Footprints,
  Pill,
  Lock,
  Unlock,
  Layers,
  Calendar,
  FlaskConical,
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

interface EnrolledPatientResult {
  id: string;
  name: string;
  surgeryDate: string;
  kneeSide: string;
  accessToken: string;
  passcode: string;
  link: string;
  mlRiskProbability?: number;
  mlRiskTier?: string;
  mlRiskDrivers?: string[];
  mlActionPlan?: string;
}

export default function DashboardPage() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const doctorDisplayName = user?.fullName
    ? user.fullName
    : user?.firstName
    ? `Dr. ${user.firstName}`
    : user?.primaryEmailAddress?.emailAddress
    ? `Dr. ${user.primaryEmailAddress.emailAddress.split("@")[0]}`
    : "Orthopedic Surgeon";

  const doctorInitials =
    (user?.firstName?.[0] || "D") + (user?.lastName?.[0] || "S");
  const doctorEmail =
    user?.primaryEmailAddress?.emailAddress || "Verified Orthopedic Clinician";

  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [patientCheckins, setPatientCheckins] = useState<CheckinRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active Navigation Tab: 'roster' | 'links' | 'protocols'
  const [activeTab, setActiveTab] = useState<"roster" | "links" | "protocols" | "simulation">("roster");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "RED" | "AMBER" | "GREEN">("ALL");
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [currentPage, setCurrentPage] = useState(1);
  const PATIENTS_PER_PAGE = 10;

  // AI Clinical Recovery Brief State
  const [aiBriefModalOpen, setAiBriefModalOpen] = useState(false);
  const [isGeneratingAiBrief, setIsGeneratingAiBrief] = useState(false);
  const [aiBriefData, setAiBriefData] = useState<AiClinicalBriefData | null>(null);

  // Cohort Simulator & Test Data State
  const [simCount, setSimCount] = useState<number>(8);
  const [simAppend, setSimAppend] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const handleGenerateTestData = async (countToGenerate: number, appendMode: boolean = false) => {
    setIsSimulating(true);
    const toastId = toast.loading(`Generating ${countToGenerate} synthetic clinical patients with multi-day trajectories...`);
    try {
      const res = await fetch("/api/patients/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count: countToGenerate,
          clearExisting: !appendMode,
          doctorId: user?.id,
          doctorName: doctorDisplayName,
          doctorEmail: doctorEmail,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Generated ${countToGenerate} test patients successfully!`, { id: toastId });
        await loadData(user?.id);
        setActiveTab("roster");
      } else {
        toast.error(data.error || "Failed to generate test cohort", { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to call test data generator", { id: toastId });
    } finally {
      setIsSimulating(false);
    }
  };

  const handleDeleteAllTestData = async () => {
    if (!confirm("Are you sure you want to delete ALL test patient records? This will clear the database cohort to 0 so you can test from an empty slate.")) return;
    setIsSimulating(true);
    const toastId = toast.loading("Clearing all test patients and check-in records...");
    try {
      const res = await fetch("/api/patients?all=true", { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("All test cohort data cleared! Cohort is now at 0 patients.", { id: toastId });
        setSelectedPatient(null);
        setPatientCheckins([]);
        await loadData(user?.id);
      } else {
        toast.error(data.error || "Failed to clear test data", { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to clear test data", { id: toastId });
    } finally {
      setIsSimulating(false);
    }
  };

  const handleGenerateAiBrief = async (patientId: string) => {
    const target = patients.find((p) => p.id === patientId);
    if (target) setSelectedPatient(target);
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

  // Bedside Enrollment Modal State
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [enrollName, setEnrollName] = useState("");
  const [enrollPhone, setEnrollPhone] = useState("");
  const [enrollEmail, setEnrollEmail] = useState("");
  const [enrollSurgeryDate, setEnrollSurgeryDate] = useState("");
  const [enrollKneeSide, setEnrollKneeSide] = useState<"LEFT" | "RIGHT" | "BILATERAL">("RIGHT");
  const [enrollAge, setEnrollAge] = useState(65);
  const [enrollGender, setEnrollGender] = useState<"FEMALE" | "MALE">("FEMALE");
  const [enrollPasscode, setEnrollPasscode] = useState("1234");
  const [enrollPreOpSeverity, setEnrollPreOpSeverity] = useState<"MILD" | "MODERATE" | "SEVERE">("MODERATE");
  const [enrollHasHighBp, setEnrollHasHighBp] = useState(false);
  const [enrollHasDiabetes, setEnrollHasDiabetes] = useState(false);
  const [enrollHasHeartDisease, setEnrollHasHeartDisease] = useState(false);
  const [enrollHasStroke, setEnrollHasStroke] = useState(false);
  const [enrollHasArthritis, setEnrollHasArthritis] = useState(true);
  const [enrollMobility, setEnrollMobility] = useState<"INDEPENDENT" | "CANE" | "WALKER">("INDEPENDENT");
  const [enrolledResult, setEnrolledResult] = useState<EnrolledPatientResult | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);

  // Copy feedback state
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPIN, setCopiedPIN] = useState(false);
  const [copiedRowId, setCopiedRowId] = useState<string | null>(null);

  // Auto-sync signed-in Doctor quietly in background (no annoying popups on every login)
  const syncedDoctorRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isUserLoaded || !user?.id) return;
    if (syncedDoctorRef.current === user.id) return;
    syncedDoctorRef.current = user.id;

    const email = user.primaryEmailAddress?.emailAddress || "";
    const name =
      user.fullName ||
      (user.firstName ? `Dr. ${user.firstName} ${user.lastName || ""}`.trim() : "") ||
      (email ? `Dr. ${email.split("@")[0]}` : "Dr. Clinician");

    logger.info("DOCTOR_DASHBOARD", "Syncing doctor profile quietly", {
      id: user.id,
      email,
      name,
    });

    fetch("/api/doctor/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: user.id,
        email,
        name,
      }),
    }).catch((err) => {
      logger.error("DOCTOR_DASHBOARD", "Doctor sync network error", err);
    });
  }, [isUserLoaded, user]);

  useEffect(() => {
    if (!isUserLoaded) return;
    logger.info("DOCTOR_DASHBOARD", "Loading clinician triage roster for doctor", user?.id);
    loadData(user?.id);
  }, [isUserLoaded, user?.id]);

  async function loadData(currentDoctorId?: string) {
    const docId = currentDoctorId || user?.id;
    try {
      setIsLoading(true);
      const url = docId ? `/api/patients?doctorId=${encodeURIComponent(docId)}` : "/api/patients";
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPatients(json.data);
        if (json.data.length === 0) {
          setSelectedPatient(null);
          setPatientCheckins([]);
        } else if (!selectedPatient) {
          selectPatient(json.data[0]);
        } else {
          const updated = json.data.find((p: PatientRecord) => p.id === selectedPatient.id);
          if (updated) setSelectedPatient(updated);
          else selectPatient(json.data[0]);
        }
      } else {
        const patientList = await dbService.getPatients();
        setPatients(patientList);
        if (patientList.length > 0 && !selectedPatient) {
          selectPatient(patientList[0]);
        }
      }
    } catch (err) {
      logger.error("DOCTOR_DASHBOARD", "Failed to load patient data from API", err);
      const patientList = await dbService.getPatients();
      setPatients(patientList);
    } finally {
      setIsLoading(false);
    }
  }

  function copyTextWithToast(text: string, label: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  }

  async function handleClearCohort() {
    if (!confirm("Clear all patient records to test from an empty slate?")) return;
    const toastId = toast.loading("Clearing patient records...");
    try {
      setIsLoading(true);
      const res = await fetch("/api/patients?all=true", { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Patient roster cleared! Ready for fresh enrollment.", { id: toastId });
      } else {
        toast.error(json.error || "Failed to clear roster", { id: toastId });
      }
      setSelectedPatient(null);
      setPatientCheckins([]);
      await loadData(user?.id);
    } catch (err) {
      logger.error("DOCTOR_DASHBOARD", "Failed to clear cohort", err);
      toast.error("Failed to clear patient records", { id: toastId });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSeedCohort() {
    const toastId = toast.loading("Loading demo reference cohort...");
    try {
      setIsLoading(true);
      const docId = user?.id || "doc-101";
      const docEmail = user?.primaryEmailAddress?.emailAddress || "doctor@hospital.org";
      const res = await fetch(
        `/api/patients?seed=true&doctorId=${encodeURIComponent(docId)}&doctorName=${encodeURIComponent(doctorDisplayName)}&doctorEmail=${encodeURIComponent(docEmail)}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (json.success) {
        toast.success("Demo reference cohort loaded successfully!", { id: toastId });
      } else {
        toast.error(json.error || "Failed to seed demo cohort", { id: toastId });
      }
      await loadData(docId);
    } catch (err) {
      logger.error("DOCTOR_DASHBOARD", "Failed to seed cohort", err);
      toast.error("Failed to load demo cohort", { id: toastId });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeletePatient(patientId: string) {
    if (!confirm("Are you sure you want to remove this patient from your active care list?")) return;
    const toastId = toast.loading("Removing patient record...");
    try {
      const res = await fetch(`/api/patients?id=${patientId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Patient record removed successfully", { id: toastId });
        if (selectedPatient?.id === patientId) {
          setSelectedPatient(null);
          setPatientCheckins([]);
          setMobileView("list");
        }
        await loadData(user?.id);
      } else {
        toast.error(json.error || "Failed to remove patient", { id: toastId });
      }
    } catch (err) {
      logger.error("DOCTOR_DASHBOARD", "Failed to delete patient", err);
      toast.error("Failed to remove patient record", { id: toastId });
    }
  }

  async function selectPatient(patient: PatientRecord) {
    setSelectedPatient(patient);
    setMobileView("detail");
    logger.info("DOCTOR_DASHBOARD", `Selected patient ${patient.name} (${patient.id})`);
    try {
      const res = await fetch(`/api/patients/${patient.id}`);
      const json = await res.json();
      if (json.success && json.checkins) {
        setPatientCheckins(json.checkins);
        return;
      }
    } catch (err) {
      logger.warn("DOCTOR_DASHBOARD", "API fetch failed, reading from service", err);
    }
    const checkins = await dbService.getPatientCheckins(patient.id);
    setPatientCheckins(checkins);
  }

  async function handleAcknowledge(checkinId: string) {
    logger.info("DOCTOR_DASHBOARD", `Acknowledging checkin ${checkinId}`);
    try {
      await fetch("/api/triage/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkinId }),
      });
      toast.success("Triage alert acknowledged and documented");
    } catch (err) {
      logger.warn("DOCTOR_DASHBOARD", "API acknowledge failed", err);
      toast.error("Could not sync triage acknowledgement");
    }
    await dbService.acknowledgeCheckin(checkinId);
    if (selectedPatient) {
      selectPatient(selectedPatient);
    }
  }

  async function handleEnrollSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!enrollName.trim() || !enrollSurgeryDate) {
      toast.error("Please provide both Patient Full Name and Surgery Date.");
      return;
    }

    setIsEnrolling(true);
    const toastId = toast.loading("Registering patient and analyzing clinical risk...");

    const doctorId = user?.id || "doc-101";
    const doctorEmail = user?.primaryEmailAddress?.emailAddress || "doctor@hospital.org";

    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: enrollName.trim(),
          surgeryDate: enrollSurgeryDate,
          kneeSide: enrollKneeSide,
          age: Number(enrollAge) || 65,
          gender: enrollGender,
          passcode: enrollPasscode || "1234",
          phone: enrollPhone.trim(),
          email: enrollEmail.trim(),
          doctorId,
          doctorName: doctorDisplayName,
          doctorEmail,
          preOpKneeSeverity: enrollPreOpSeverity,
          hasHighBp: enrollHasHighBp,
          hasDiabetes: enrollHasDiabetes,
          hasHeartDisease: enrollHasHeartDisease,
          hasStroke: enrollHasStroke,
          hasArthritis: enrollHasArthritis,
          mobilityAssistance: enrollMobility,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        toast.success(`Patient "${enrollName.trim()}" successfully registered!`, { id: toastId });
        setEnrolledResult(json.data);
        await loadData(doctorId);
      } else {
        const errorMsg = json.details || json.error || "Failed to register patient";
        toast.error(`Error: ${errorMsg}`, { id: toastId });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("ENROLLMENT", "Failed to enroll patient", err);
      toast.error(`Care system notice: ${msg}`, { id: toastId });
    } finally {
      setIsEnrolling(false);
    }
  }

  const redCount = patients.filter((p) => p.currentTriageStatus === "RED").length;
  const amberCount = patients.filter((p) => p.currentTriageStatus === "AMBER").length;
  const greenCount = patients.filter((p) => p.currentTriageStatus === "GREEN").length;

  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || p.currentTriageStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredPatients.length / PATIENTS_PER_PAGE) || 1;
  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * PATIENTS_PER_PAGE,
    currentPage * PATIENTS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const latestCheckin = patientCheckins[patientCheckins.length - 1];

  const chartData = patientCheckins.map((c) => ({
    day: `Day ${c.dayNumber}`,
    pain: c.painScore,
    flexion: c.flexionDegrees,
    opioids: c.opioidPillsTaken,
  }));

  const activePatientUrl = selectedPatient
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/patient/${
        selectedPatient.accessToken || "pt-" + selectedPatient.id
      }`
    : "";

  const enrolledPatientUrl = enrolledResult
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/patient/${
        enrolledResult.accessToken
      }`
    : "";

  return (
    <div className="h-screen w-full bg-slate-50 text-slate-900 flex font-sans overflow-hidden">
      {/* ------------------------------------------------------------------ */}
      {/* 1. CLINICAL SIDEBAR NAVIGATION                                     */}
      {/* ------------------------------------------------------------------ */}
      <aside className="w-72 h-screen bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 hidden md:flex sticky top-0 overflow-hidden shadow-xs">
        <div className="p-5 space-y-5 overflow-y-auto flex-1 modal-scroll">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-sm">
              <Activity className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900">
                PostOp<span className="text-teal-600">-Check</span>
              </span>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Clinical Arthroplasty
              </p>
            </div>
          </Link>

          {/* Hospital Center Badge */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Stethoscope className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span>Royal Orthopaedic Center</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Adult Joint Reconstruction Unit</p>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab("roster")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === "roster"
                  ? "bg-teal-50 text-teal-700 border border-teal-200/80 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <LayoutDashboard className="w-4 h-4 text-teal-600 shrink-0" />
                <span className="truncate">Patient Recovery Roster</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-600 border border-slate-200 shrink-0 ml-2">
                {patients.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("links")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === "links"
                  ? "bg-teal-50 text-teal-700 border border-teal-200/80 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Link2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span className="truncate">Patient Links &amp; PINs</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0 ml-2">
                1-Click
              </span>
            </button>

            <button
              onClick={() => setActiveTab("protocols")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === "protocols"
                  ? "bg-teal-50 text-teal-700 border border-teal-200/80 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                <span className="truncate">Clinical Protocols</span>
              </div>
              <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 shrink-0 ml-2">
                PT / MD
              </span>
            </button>

            <button
              onClick={() => setActiveTab("simulation")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === "simulation"
                  ? "bg-purple-50 text-purple-700 border border-purple-200/80 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FlaskConical className="w-4 h-4 text-purple-600 shrink-0" />
                <span className="truncate">Cohort Simulator &amp; Data</span>
              </div>
              <span className="text-[10px] text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 shrink-0 ml-2">
                TEST DATA
              </span>
            </button>
          </nav>

          {/* Bedside Enrollment CTA Button */}
          <div className="pt-2">
            <button
              onClick={() => {
                setEnrolledResult(null);
                setEnrollName("");
                setEnrollPhone("");
                setEnrollEmail("");
                setEnrollSurgeryDate("");
                setEnrollPasscode("1234");
                setIsEnrollModalOpen(true);
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-3 rounded-2xl font-bold text-xs text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>Enroll New Patient</span>
            </button>
          </div>
        </div>

        {/* Doctor Identity Card in Sidebar - ALWAYS pinned at bottom */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0">
              {doctorInitials}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-slate-900 truncate">{doctorDisplayName}</p>
              <p className="text-[11px] text-slate-500 truncate">{doctorEmail}</p>
            </div>
          </div>
          <UserButton />
        </div>
      </aside>

      {/* ------------------------------------------------------------------ */}
      {/* 2. MAIN APPLICATION WORKSPACE                                      */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Clinical Header Bar - ALWAYS pinned at top */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="md:hidden flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-2xs">
                <Activity className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span className="text-base font-bold text-slate-900">
                PostOp<span className="text-teal-600">-Check</span>
              </span>
            </div>
            <h1 className="text-base font-bold text-slate-800 hidden md:block">
              {activeTab === "roster" && "Today's Patient Recovery & Daily Check-ins"}
              {activeTab === "links" && "Patient Portal Access Links & Secure PINs"}
              {activeTab === "protocols" && "Clinical Care Protocols, Biomechanics & Decision Rationale"}
              {activeTab === "simulation" && "Synthetic Clinical Cohort Simulator & Test Data Studio"}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEnrolledResult(null);
                setEnrollName("");
                setEnrollPhone("");
                setEnrollEmail("");
                setEnrollSurgeryDate("");
                setEnrollPasscode("1234");
                setIsEnrollModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-2xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Enroll Patient</span>
            </button>

            <div className="md:hidden">
              <UserButton />
            </div>
          </div>
        </header>

        {/* Mobile Navigation Tabs (visible only on mobile) */}
        <div className="md:hidden bg-white border-b border-slate-200 px-3 py-2 shrink-0">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => {
                setActiveTab("roster");
                setMobileView("list");
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors text-center ${
                activeTab === "roster"
                  ? "bg-white text-teal-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Daily Triage ({patients.length})
            </button>
            <button
              onClick={() => setActiveTab("links")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors text-center ${
                activeTab === "links"
                  ? "bg-white text-teal-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Links &amp; PINs
            </button>
            <button
              onClick={() => setActiveTab("protocols")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors text-center ${
                activeTab === "protocols"
                  ? "bg-white text-teal-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Care Protocols &amp; Logic
            </button>
            <button
              onClick={() => setActiveTab("simulation")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors text-center ${
                activeTab === "simulation"
                  ? "bg-white text-purple-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Test Data
            </button>
          </div>
        </div>

        {/* Content Body - Only this scrolls */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl w-full mx-auto modal-scroll">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-2xs">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Cohort
              </span>
              <div className="mt-1 flex items-baseline gap-1.5 sm:gap-2">
                <span className="text-xl sm:text-2xl font-extrabold text-slate-900">{patients.length}</span>
                <span className="text-[11px] text-slate-400">monitored</span>
              </div>
            </div>

            <div className="bg-white border border-red-200/80 rounded-2xl p-3 sm:p-4 shadow-2xs">
              <span className="text-[11px] sm:text-xs font-semibold text-red-600 uppercase tracking-wider flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Critical Red</span>
              </span>
              <div className="mt-1 flex items-baseline gap-1.5 sm:gap-2">
                <span className="text-xl sm:text-2xl font-extrabold text-red-600">{redCount}</span>
                <span className="text-[11px] text-red-400">urgent</span>
              </div>
            </div>

            <div className="bg-white border border-amber-200/80 rounded-2xl p-3 sm:p-4 shadow-2xs">
              <span className="text-[11px] sm:text-xs font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Watch (Amber)</span>
              </span>
              <div className="mt-1 flex items-baseline gap-1.5 sm:gap-2">
                <span className="text-xl sm:text-2xl font-extrabold text-amber-600">{amberCount}</span>
                <span className="text-[11px] text-amber-500">delta</span>
              </div>
            </div>

            <div className="bg-white border border-emerald-200/80 rounded-2xl p-3 sm:p-4 shadow-2xs">
              <span className="text-[11px] sm:text-xs font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Optimal (Green)</span>
              </span>
              <div className="mt-1 flex items-baseline gap-1.5 sm:gap-2">
                <span className="text-xl sm:text-2xl font-extrabold text-emerald-600">{greenCount}</span>
                <span className="text-[11px] text-emerald-500">on track</span>
              </div>
            </div>
          </div>

          {/* -------------------------------------------------------------- */}
          {/* TAB 1: PRIORITY TRIAGE COHORT GRID & PATIENT ACCESS            */}
          {/* -------------------------------------------------------------- */}
          {activeTab === "roster" && (
            <div className="space-y-5">
              {/* Filter & Search Command Bar */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search patient name, MRN, or knee side..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600 text-xs">
                      Clear
                    </button>
                  )}
                </div>

                {/* Status Filter Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setStatusFilter("ALL")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      statusFilter === "ALL"
                        ? "bg-slate-900 text-white shadow-2xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    All Patients ({patients.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter("RED")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      statusFilter === "RED"
                        ? "bg-red-600 text-white shadow-2xs"
                        : "bg-red-50 hover:bg-red-100 text-red-700 border border-red-200/60"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                    <span>Critical Red ({redCount})</span>
                  </button>
                  <button
                    onClick={() => setStatusFilter("AMBER")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      statusFilter === "AMBER"
                        ? "bg-amber-600 text-white shadow-2xs"
                        : "bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/60"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>Watch Amber ({amberCount})</span>
                  </button>
                  <button
                    onClick={() => setStatusFilter("GREEN")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      statusFilter === "GREEN"
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Optimal Green ({greenCount})</span>
                  </button>
                </div>
              </div>

              {/* Single Patient Per Row Cohort Worklist */}
              {isLoading ? (
                <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-3xl border border-slate-200 space-y-3">
                  <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="font-semibold text-slate-700">Loading surgical recovery cohort...</p>
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
                  <p className="font-bold text-slate-800 text-sm">
                    {patients.length === 0 ? "No surgical patients enrolled yet" : "No patients match your filter criteria"}
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {patients.length === 0
                      ? "Enroll a knee replacement patient to begin remote kinematic monitoring and AI triage."
                      : "Reset your search terms or status filter to view all patients."}
                  </p>
                  {statusFilter !== "ALL" && (
                    <button
                      onClick={() => {
                        setStatusFilter("ALL");
                        setSearchQuery("");
                      }}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {paginatedPatients.map((patient) => {
                    const status = patient.currentTriageStatus;
                    const pToken = patient.accessToken || `pt-${patient.id}`;
                    const pPasscode = patient.passcode || "1234";
                    const isRed = status === "RED";
                    const isAmber = status === "AMBER";
                    const isDailyRedFlag = isRed && patient.lastCheckinDay > 1;
                    const fullPatientUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/patient/${pToken}`;

                    return (
                      <div
                        key={patient.id}
                        className={`w-full rounded-2xl p-4 sm:p-4.5 border bg-white shadow-2xs hover:shadow-md transition-all space-y-3 ${
                          isRed
                            ? "border-red-200/90 hover:border-red-300 bg-gradient-to-r from-red-50/25 via-white to-white"
                            : isAmber
                            ? "border-amber-200/90 hover:border-amber-300 bg-gradient-to-r from-amber-50/25 via-white to-white"
                            : "border-slate-200 hover:border-teal-300 bg-gradient-to-r from-emerald-50/25 via-white to-white"
                        }`}
                      >
                        {/* Row 1: Patient Identity, Surgery Badges & Status/Risk Badges */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          {/* Left: Avatar + Name + Demographics */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-2xs ${
                                isRed
                                  ? "bg-red-600"
                                  : isAmber
                                  ? "bg-amber-600"
                                  : "bg-teal-600"
                              }`}
                            >
                              {patient.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                                  {patient.name}
                                </h3>
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                                  MRN: {patient.id}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-500 mt-0.5">
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                                  {patient.age}y &bull; {patient.gender === "FEMALE" ? "Female" : "Male"}
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 font-bold border border-teal-200 text-[11px]">
                                  Day {patient.lastCheckinDay} Post-Op
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 font-bold border border-indigo-200 text-[11px]">
                                  {patient.kneeSide} Knee TKA
                                </span>
                                <span className="text-[11px] text-slate-400 hidden md:inline">
                                  Surgery: {patient.surgeryDate}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Triage Priority Badge & ML Risk Score */}
                          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto flex-wrap sm:flex-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-2xs ${
                                isRed
                                  ? "bg-red-100 text-red-800 border-red-300"
                                  : isAmber
                                  ? "bg-amber-100 text-amber-800 border-amber-300"
                                  : "bg-emerald-100 text-emerald-800 border-emerald-300"
                              }`}
                              title={
                                isRed
                                  ? isDailyRedFlag
                                    ? "Active Alert Source: Daily check-in symptom reported (AAOS Red Flag safety net)"
                                    : "Active Alert Source: Pre-operative AI risk model (severe baseline joint degeneration)"
                                  : undefined
                              }
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isRed
                                    ? "bg-red-500 animate-ping"
                                    : isAmber
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                                }`}
                              />
                              {isRed
                                ? isDailyRedFlag
                                  ? "RED ALERT • Daily Check-in Flag"
                                  : "RED ALERT • Pre-Op AI Model"
                                : isAmber
                                ? "WATCH (AMBER)"
                                : "OPTIMAL TRACK"}
                            </span>

                            <span
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-md border ${
                                patient.currentRiskProbability >= 0.5
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : patient.currentRiskProbability >= 0.25
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}
                              title="Pre-operative baseline prognostic prediction from AI model based on Oxford Knee Score and comorbidities"
                            >
                              Pre-Op ML: {(patient.currentRiskProbability * 100).toFixed(1)}% Risk
                            </span>
                          </div>
                        </div>

                        {/* Row 2: Diagnostic Safety Net Banner (Left) + Action Toolbar (Right) */}
                        <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                          {/* Diagnostic Banner */}
                          <div
                            className={`p-2 px-3 rounded-xl border text-xs flex items-center gap-2 flex-1 min-w-0 ${
                              isRed
                                ? "bg-red-50/80 text-red-900 border-red-200"
                                : isAmber
                                ? "bg-amber-50/80 text-amber-900 border-amber-200"
                                : "bg-emerald-50/80 text-emerald-900 border-emerald-200"
                            }`}
                          >
                            {isRed ? (
                              <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                            ) : isAmber ? (
                              <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            )}
                            <p className="font-semibold text-[11px] leading-tight truncate">
                              {isRed
                                ? isDailyRedFlag
                                  ? "🚨 Daily Check-in Trigger: AAOS Red Flag Reported (Calf pain / DVT risk — Urgent Clinical Evaluation Required)"
                                  : `🤖 Pre-Op AI Trigger: ${(patient.currentRiskProbability * 100).toFixed(0)}% High Risk (Severe baseline joint degeneration)`
                                : isAmber
                                ? "⚠️ Kinematic Velocity Alert: Flexion plateau / Extension lag deficit observed"
                                : "✅ Recovery Velocity on Track: Biomechanical milestones meeting standard clinical targets"}
                            </p>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs">
                              <span className="font-mono font-bold text-slate-700 text-[11px]">
                                PIN: {pPasscode}
                              </span>
                              <button
                                onClick={() => copyTextWithToast(fullPatientUrl, "Patient Recovery Link")}
                                title="Copy direct patient link"
                                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-white transition-colors"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>

                            <button
                              onClick={() => handleGenerateAiBrief(patient.id)}
                              disabled={isGeneratingAiBrief}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors shadow-2xs whitespace-nowrap"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                              <span>AI Brief</span>
                            </button>

                            <Link
                              href={`/dashboard/patients/${patient.id}`}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-2xs whitespace-nowrap"
                            >
                              <span>Open Clinical File</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>

                            <a
                              href={`${fullPatientUrl}?view=doctor`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open Patient Recovery Portal (Clinician View)"
                              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors shrink-0"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Pagination Controls (10 Patients Per Page) */}
                  {totalPages > 1 && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-2xs mt-4">
                      <span className="text-slate-500 font-medium">
                        Showing <strong>{(currentPage - 1) * PATIENTS_PER_PAGE + 1}</strong> to{" "}
                        <strong>{Math.min(currentPage * PATIENTS_PER_PAGE, filteredPatients.length)}</strong> of{" "}
                        <strong>{filteredPatients.length}</strong> monitored patients
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          &larr; Previous
                        </button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-8 h-8 rounded-xl font-bold transition-colors ${
                              currentPage === page
                                ? "bg-teal-600 text-white shadow-2xs"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            }`}
                          >
                            {page}
                          </button>
                        ))}

                        <button
                          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          Next &rarr;
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* -------------------------------------------------------------- */}
          {/* TAB 2: PATIENT LINKS & PIN DIRECTORY VIEW                      */}
          {/* -------------------------------------------------------------- */}
          {activeTab === "links" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Patient Link &amp; Passcode Directory
                  </h2>
                  <p className="text-xs text-slate-500">
                    Each TKA patient has a dedicated encrypted recovery link protected by a 4-digit PIN. No login accounts or SMS OTPs required.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setEnrolledResult(null);
                    setEnrollName("");
                    setEnrollSurgeryDate("");
                    setEnrollPasscode("1234");
                    setIsEnrollModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Enroll New Patient</span>
                </button>
              </div>

              {/* Mobile Card Layout for Phones */}
              <div className="sm:hidden space-y-3">
                {patients.map((p) => {
                  const token = p.accessToken || `pt-${p.id}`;
                  const pin = p.passcode || "1234";
                  const fullUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/patient/${token}`;

                  return (
                    <div key={p.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{p.name}</h4>
                          <p className="text-xs text-slate-500">{p.kneeSide} Knee TKA &bull; {p.surgeryDate}</p>
                        </div>
                        <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 text-xs">
                          PIN: {pin}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                        <button
                          onClick={() => {
                            copyTextWithToast(fullUrl, "Patient Recovery Link");
                            setCopiedRowId(p.id);
                            setTimeout(() => setCopiedRowId(null), 2000);
                          }}
                          className="flex-1 py-2 px-3 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5"
                        >
                          {copiedRowId === p.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                          <span>{copiedRowId === p.id ? "Copied!" : "Copy Link"}</span>
                        </button>
                        <a
                          href={`${fullUrl}?view=doctor`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2 px-3 rounded-lg bg-teal-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop / Tablet Table Layout */}
              <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs min-w-[550px]">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Patient Name</th>
                      <th className="px-4 py-3">Surgical Procedure</th>
                      <th className="px-4 py-3">Surgery Date</th>
                      <th className="px-4 py-3">Access PIN</th>
                      <th className="px-4 py-3">Direct Recovery Link</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {patients.map((p) => {
                      const token = p.accessToken || `pt-${p.id}`;
                      const pin = p.passcode || "1234";
                      const fullUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/patient/${token}`;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3 font-bold text-slate-900">{p.name}</td>
                          <td className="px-4 py-3 text-slate-600">{p.kneeSide} Knee TKA</td>
                          <td className="px-4 py-3 text-slate-500">{p.surgeryDate}</td>
                          <td className="px-4 py-3">
                            <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 text-xs">
                              {pin}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-500 truncate max-w-[200px]">
                            /patient/{token}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                onClick={() => {
                                  copyTextWithToast(fullUrl, "Patient Recovery Link");
                                  setCopiedRowId(p.id);
                                  setTimeout(() => setCopiedRowId(null), 2000);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors inline-flex items-center gap-1"
                              >
                                {copiedRowId === p.id ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3 text-slate-400" />
                                )}
                                <span>{copiedRowId === p.id ? "Copied!" : "Copy Link"}</span>
                              </button>

                              <a
                                href={`${fullUrl}?view=doctor`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900"
                                title="Open patient recovery portal in clinician view"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------------- */}
          {/* TAB 3: CLINICAL DECISION ARCHITECTURE & PT HANDOVER GUIDE      */}
          {/* -------------------------------------------------------------- */}
          {activeTab === "protocols" && (
            <div className="space-y-6">
              {/* Top Banner Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-teal-600" />
                        Clinical Handover Manual
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-white">
                        TKA Remote Patient Monitoring (RPM)
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        AAOS Guidelines &bull; NHS PROMs Model
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                      PostOp-Check Decision Architecture &amp; Physiotherapy Handover
                    </h2>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-3xl">
                      Translating the application&apos;s codebase, patient data lifecycle, kinematic metrics, and 4-tier autonomous triage engine into formal orthopedic surgery and physiotherapy clinical terminology for surgical team review.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Monitoring Window
                      </span>
                      <span className="text-base font-bold text-slate-900 font-mono">
                        Day 1 &ndash; 14
                      </span>
                      <span className="text-[10px] text-teal-700 block font-semibold">
                        Critical Subacute Phase
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 1: Patient Lifecycle & App Workflow Flowchart */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <Layers className="w-4 h-4 text-teal-600" />
                    <span>1. End-to-End Clinical Lifecycle &amp; Remote Care Flow</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    PostOp-Check transforms post-discharge joint arthroplasty recovery from delayed, episodic follow-ups into a continuous remote surveillance protocol.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
                    {/* Step 1 */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 relative">
                      <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                        1
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">Bedside Inpatient Enrollment</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Surgeon or nurse registers patient prior to discharge. Generates a secure, cryptographically scoped patient URL and 4-digit PIN.
                      </p>
                    </div>

                    {/* Step 2 */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 relative">
                      <div className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center">
                        2
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">Daily Patient PROMs Entry</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Patient accesses personal recovery portal via SMS/WhatsApp link. Completes a 3-minute self-report of pain, flexion, walking, effusion, opioids, and red flags.
                      </p>
                    </div>

                    {/* Step 3 */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 relative">
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                        3
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">4-Tier Clinical Engine</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Backend immediately triages entry against AAOS deterministic safety rules, trajectory velocity rates, and pre-op NHS PROMs ML probability.
                      </p>
                    </div>

                    {/* Step 4 */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 relative">
                      <div className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center">
                        4
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">Live Triage Roster</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Surgical team and PTs monitor real-time prioritized cohort on dashboard. Immediate clinical action directives attached to each case.
                      </p>
                    </div>

                    {/* Step 5 */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 relative">
                      <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                        5
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">Gated Physical Therapy</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Active rehabilitation exercises are dynamically enabled (Green) or paused for clinical elevation/rest (Red/Amber) based on daily safety clearance.
                      </p>
                    </div>
                  </div>

                  {/* Bedside Inpatient Enrollment & Initial ML Stratification Callout */}
                  <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-teal-50/70 border border-teal-200/90 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-teal-200/60 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-teal-700" />
                        <h4 className="text-xs font-bold text-teal-950 uppercase tracking-wide">
                          Step 1 Detail: Bedside Enrollment &bull; Initial ML Risk Prediction Architecture
                        </h4>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-600 text-white font-mono self-start sm:self-auto">
                        Cloud API &bull; XGBoost + LightGBM Ensemble
                      </span>
                    </div>

                    <p className="text-xs text-teal-950/90 leading-relaxed">
                      When the attending surgeon or orthopedic nurse enrolls a patient at bedside prior to hospital discharge, the platform immediately executes a cloud-hosted machine learning inference call (<code className="font-mono text-[10px] bg-white/80 px-1 py-0.5 rounded border border-teal-300">https://yousairam.pythonanywhere.com/predict-risk</code>) trained on over 140,000 knee arthroplasty procedures from the <strong>NHS National Joint Registry (NJR)</strong> and <strong>NHS PROMs</strong> datasets.
                    </p>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 pt-1">
                      {/* Left: Input Variables sent to Model */}
                      <div className="p-3.5 bg-white rounded-xl border border-teal-200/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-teal-600" />
                            Clinical Input Features Sent to ML Engine:
                          </span>
                          <span className="text-[10px] font-mono text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                            Pre-Op Baseline
                          </span>
                        </div>
                        <ul className="text-[11px] text-slate-600 space-y-1.5 list-disc list-inside leading-relaxed">
                          <li>
                            <strong className="text-slate-800">Age &amp; Gender Stratification:</strong> Patient chronological age is mapped into standard NHS epidemiology bands (<em>&lt;55, 55&ndash;64, 65&ndash;74, 75&ndash;84, 85+</em>) with biological gender weighting.
                          </li>
                          <li>
                            <strong className="text-slate-800">Pre-Op Knee Severity &rarr; Baseline OKS:</strong> Mapped to the validated <strong>Oxford Knee Score (OKS t₀)</strong> (<em>Severe = 12, Moderate = 18, Mild = 28 / 48</em>) alongside baseline EuroQol EQ-VAS (50 vs 70), night pain, and joint stairs deficit.
                          </li>
                          <li>
                            <strong className="text-slate-800">Pre-Op Mobility Assistance:</strong> Baseline ambulatory independence (<em>Independent = 1, Cane = 2, Walker/Frame = 3</em> with disability index).
                          </li>
                          <li>
                            <strong className="text-slate-800">Multimorbidity Profile (5-Point Index):</strong> Presence of Hypertension, Type II Diabetes Mellitus (microvascular/wound risk), Ischemic Heart Disease, Prior Cerebrovascular Accident (Stroke/TIA), and Polyarticular Osteoarthritis.
                          </li>
                        </ul>
                      </div>

                      {/* Right: Output Variables returned from Model */}
                      <div className="p-3.5 bg-white rounded-xl border border-teal-200/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-600" />
                            Algorithmic Outputs Returned to Care Team:
                          </span>
                          <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            Instant Triage Payload
                          </span>
                        </div>
                        <ul className="text-[11px] text-slate-600 space-y-1.5 list-disc list-inside leading-relaxed">
                          <li>
                            <strong className="text-slate-800">Complication Risk Probability (0.00 &ndash; 1.00):</strong> Exact statistical likelihood of 30-day post-op adverse event, readmission, or delayed recovery (stored in database as <code className="font-mono text-[10px] text-slate-800">current_risk_probability</code>).
                          </li>
                          <li>
                            <strong className="text-slate-800">Stratified Risk Tier Badge:</strong> Categorized into <em>&ldquo;LOW RISK / SAFE CLEARANCE&rdquo;</em>, <em>&ldquo;MODERATE COMPLICATION WATCH&rdquo;</em>, or <em>&ldquo;HIGH RISK / INTENSIVE SURVEILLANCE&rdquo;</em>.
                          </li>
                          <li>
                            <strong className="text-slate-800">Attributed Key Risk Drivers:</strong> Explainable feature impact indicators (e.g., <em>Severe pre-op joint degradation OKS &lt; 15</em>, <em>Multiple cardiovascular comorbidities</em>).
                          </li>
                          <li>
                            <strong className="text-slate-800">Surgeon &amp; PT Action Plan:</strong> Immediate clinical directive attached to patient profile (e.g., <em>&ldquo;Standard operative pathway with routine home PT&rdquo;</em> vs. <em>&ldquo;Intensive physical therapy surveillance &amp; early 7-day surgeon wound audit&rdquo;</em>).
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Physiological & Kinematic Rationale for All Variables */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-teal-600" />
                    <h3 className="text-base font-bold text-slate-900">
                      2. Orthopedic &amp; Physiotherapeutic Rationale for Collected Variables
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Why each parameter is requested from the patient, its underlying biomechanical significance, and the clinical pathology it monitors.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Variable 1: Flexion */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                        <h4 className="text-xs font-bold text-slate-900">
                          Active Range of Motion (AROM) &bull; Knee Flexion Angle (Degrees)
                        </h4>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800">
                        Kinematic Target
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 space-y-1.5 leading-relaxed">
                      <p>
                        <strong className="text-slate-800">Biomechanics &amp; Functional Milestones:</strong> Normal sagittal knee kinematics require <span className="font-semibold text-slate-800">65&deg;</span> for level ambulation, <span className="font-semibold text-slate-800">90&deg;</span> for standard chair sitting and stair descent, <span className="font-semibold text-slate-800">105&deg;&ndash;110&deg;</span> for smooth sit-to-stand transition, and <span className="font-semibold text-slate-800">&ge; 115&deg;&ndash;120&deg;</span> for full functional squatting.
                      </p>
                      <p>
                        <strong className="text-slate-800">Pathology Monitored:</strong> <span className="text-teal-700 font-semibold">Arthrofibrosis</span> &mdash; excessive myofibroblastic extracellular matrix deposition causing dense fibrous adhesions across the suprapatellar pouch and lateral retinaculum.
                      </p>
                      <p className="text-[11px] text-slate-500 bg-white p-2 rounded-xl border border-slate-200/80">
                        <strong className="text-slate-700">Clinical Action Window:</strong> If flexion fails to reach 75&deg; by Day 5 or plateaus &lt; 80&deg; by Day 10, aggressive PT mobilization or Manipulation Under Anesthesia (MUA) is indicated within the 6&ndash;12 week golden window before irreversible collagen cross-linking sets in.
                      </p>
                    </div>
                  </div>

                  {/* Variable 2: Pain */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        <h4 className="text-xs font-bold text-slate-900">
                          Pain Severity &bull; Visual Analog Scale (NRS / VAS 0&ndash;10)
                        </h4>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                        Nociceptive Index
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 space-y-1.5 leading-relaxed">
                      <p>
                        <strong className="text-slate-800">Physiological Trajectory:</strong> Surgical nociceptive pain typically peaks on Post-Op Days 1&ndash;3 as periarticular local infiltration and adductor canal nerve blocks wear off, followed by a monotonic decline toward NRS &le; 3&ndash;4 by Day 10&ndash;14.
                      </p>
                      <p>
                        <strong className="text-slate-800">Pathology Monitored:</strong> Acute hemarthrosis, failure of multimodal analgesia, Complex Regional Pain Syndrome (CRPS), or occult periprosthetic infection.
                      </p>
                      <p className="text-[11px] text-slate-500 bg-white p-2 rounded-xl border border-slate-200/80">
                        <strong className="text-slate-700">Triage Trigger:</strong> A sudden day-over-day acceleration (&Delta;Pain &ge; +2.5 points) indicates an acute surgical complication rather than routine post-exercise soreness, immediately flagging an Amber or Red review.
                      </p>
                    </div>
                  </div>

                  {/* Variable 3: Walking Distance */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                        <h4 className="text-xs font-bold text-slate-900">
                          Daily Ambulation Distance &bull; Functional Mobility Index (Meters)
                        </h4>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                        Vascular / DVT Defense
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 space-y-1.5 leading-relaxed">
                      <p>
                        <strong className="text-slate-800">Hemodynamic Rationale:</strong> Weight-bearing ambulation activates the <span className="font-semibold text-slate-800">soleus and gastrocnemius calf muscle venous pump</span>, creating transient intramuscular pressures exceeding 100 mmHg that drive venous return into the popliteal vein and directly counteract venous stasis (Virchow&apos;s Triad).
                      </p>
                      <p>
                        <strong className="text-slate-800">Pathology Monitored:</strong> Extensor mechanism disruption (quadriceps tendon or patellar tendon avulsion), component loosening/subsidence, or common peroneal nerve palsy.
                      </p>
                      <p className="text-[11px] text-slate-500 bg-white p-2 rounded-xl border border-slate-200/80">
                        <strong className="text-slate-700">Progression Goal:</strong> Patients are encouraged to progress from room-level household transfers (50&ndash;100m) to community ambulation (&ge; 300&ndash;500m) by the end of week two.
                      </p>
                    </div>
                  </div>

                  {/* Variable 4: Joint Effusion / Swelling */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <h4 className="text-xs font-bold text-slate-900">
                          Joint Effusion &amp; Swelling &bull; Grades I&ndash;III (Mild, Mod, Severe)
                        </h4>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        Capsular Pressure
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 space-y-1.5 leading-relaxed">
                      <p>
                        <strong className="text-slate-800">Neuromuscular Mechanism:</strong> <span className="text-amber-800 font-semibold">Arthrogenic Muscle Inhibition (AMI)</span> &mdash; intra-articular capsular distension stimulates type II and III mechanoreceptors, generating a presynaptic reflex that shuts down alpha-motor neuron firing to the Vastus Medialis Obliquus (VMO).
                      </p>
                      <p>
                        <strong className="text-slate-800">Functional Consequence:</strong> Persistent Grade III (tense, shiny skin) effusion produces an involuntary quadriceps extensor lag, precluding terminal knee extension (0&deg;) and increasing fall risk.
                      </p>
                      <p className="text-[11px] text-slate-500 bg-white p-2 rounded-xl border border-slate-200/80">
                        <strong className="text-slate-700">Therapist Protocol:</strong> Tense swelling prompts pausing active resisted knee drills and shifting treatment to high elevation (&ge; 30&deg; above heart) and intermittent cryotherapy.
                      </p>
                    </div>
                  </div>

                  {/* Variable 5: Opioid Sparing */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                        <h4 className="text-xs font-bold text-slate-900">
                          Opioid Pill Intake &bull; 24h Consumption Rate
                        </h4>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                        ERAS Protocol
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 space-y-1.5 leading-relaxed">
                      <p>
                        <strong className="text-slate-800">Clinical Guideline:</strong> Aligned with Enhanced Recovery After Surgery (ERAS) multimodal analgesia pathways. The clinical target is steady weaning from Schedule II narcotics (oxycodone, hydromorphone) to non-opioid adjuncts (acetaminophen, NSAIDs, cryotherapy) by Post-Op Day 7&ndash;10.
                      </p>
                      <p>
                        <strong className="text-slate-800">Risks Monitored:</strong> Opioid-Induced Hyperalgesia (OIH), respiratory depression, severe constipation/post-op ileus, or narcotic escalation masking an expanding joint hematoma.
                      </p>
                    </div>
                  </div>

                  {/* Variable 6: AAOS Red Flags */}
                  <div className="p-4 rounded-2xl bg-red-50/60 border border-red-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                        <h4 className="text-xs font-bold text-slate-900">
                          AAOS Deterministic Red Flags &bull; Surgical Complication Screen
                        </h4>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white">
                        Zero Tolerance
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 space-y-1.5 leading-relaxed">
                      <ul className="list-disc list-inside space-y-1">
                        <li><strong className="text-red-900">Calf Tenderness / Asymmetric Edema:</strong> Evaluates for Deep Vein Thrombosis (DVT) per Wells Criteria (peak risk Days 5&ndash;10).</li>
                        <li><strong className="text-red-900">Wound Drainage / Spreading Erythema:</strong> Screens for acute Periprosthetic Joint Infection (PJI) and early biofilm colonization.</li>
                        <li><strong className="text-red-900">Fever &ge; 101.5&deg;F (38.6&deg;C):</strong> Screens for bacteremia, deep tissue collection, or sepsis.</li>
                        <li><strong className="text-red-900">Foot Drop / Dorsiflexion Weakness:</strong> Common Peroneal Nerve (CPN) neuropraxia from lateral retractors or valgus correction.</li>
                        <li><strong className="text-red-900">Pleuritic Chest Pain / Sudden Dyspnea:</strong> Pulmonary Embolism (PE) &mdash; immediate emergency protocol.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: The 4-Tier Clinical Triage Engine */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-teal-600" />
                    <h3 className="text-base font-bold text-slate-900">
                      3. Multi-Layer Triage Engine Decision Logic
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    How daily patient reports are evaluated hierarchically across deterministic safety, velocity kinetics, and pre-op machine learning.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Layer 1 */}
                  <div className="p-4 rounded-2xl border border-red-300 bg-red-50/60 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-200 text-red-900 font-mono">
                      Layer 1: Deterministic
                    </span>
                    <h4 className="text-xs font-bold text-red-950">Safety Override Filter</h4>
                    <p className="text-[11px] text-red-900/90 leading-relaxed">
                      If <em>any</em> single Red Flag is true (fever, calf tenderness, drainage, foot drop, SOB), the engine immediately triggers <strong className="text-red-950">🔴 RED TRIAGE</strong>.
                    </p>
                    <div className="pt-1 border-t border-red-200 text-[10px] text-red-800 font-medium">
                      Rationale: Algorithmic safety net. Statistical models must never override acute surgical emergencies. Pauses PT drills automatically.
                    </div>
                  </div>

                  {/* Layer 2 */}
                  <div className="p-4 rounded-2xl border border-amber-300 bg-amber-50/60 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-mono">
                      Layer 2: Kinematic Velocity
                    </span>
                    <h4 className="text-xs font-bold text-amber-950">Multi-Day Trajectory Delta</h4>
                    <p className="text-[11px] text-amber-900/90 leading-relaxed">
                      Evaluates rate of change: &Delta;Pain &ge; +2.5, flexion plateauing &le; 0&deg; over 3 days, or opioid rebound. Triggers <strong className="text-amber-950">🟡 AMBER TRIAGE</strong>.
                    </p>
                    <div className="pt-1 border-t border-amber-200 text-[10px] text-amber-800 font-medium">
                      Rationale: Early detection of arthrofibrosis or failure of home therapy before chronic scar contracture sets in.
                    </div>
                  </div>

                  {/* Layer 3 */}
                  <div className="p-4 rounded-2xl border border-blue-300 bg-blue-50/60 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-200 text-blue-900 font-mono">
                      Layer 3: Machine Learning
                    </span>
                    <h4 className="text-xs font-bold text-blue-950">NHS PROMs Risk Model</h4>
                    <p className="text-[11px] text-blue-900/90 leading-relaxed">
                      LightGBM model trained on National Health Service Joint Registry. Inputs: Oxford Knee Score, ASA grade, BMI, age, comorbidities.
                    </p>
                    <div className="pt-1 border-t border-blue-200 text-[10px] text-blue-800 font-medium">
                      Rationale: Modulates baseline alert sensitivity. High-risk patients receive tighter precaution tolerances.
                    </div>
                  </div>

                  {/* Layer 4 */}
                  <div className="p-4 rounded-2xl border border-emerald-300 bg-emerald-50/60 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 font-mono">
                      Layer 4: Progression
                    </span>
                    <h4 className="text-xs font-bold text-emerald-950">Clinical Clearance</h4>
                    <p className="text-[11px] text-emerald-900/90 leading-relaxed">
                      Zero systemic flags, pain controlled and declining, flexion advancing along post-op trajectory. Result: <strong className="text-emerald-950">🟢 GREEN TRIAGE</strong>.
                    </p>
                    <div className="pt-1 border-t border-emerald-200 text-[10px] text-emerald-800 font-medium">
                      Rationale: Full clearance for progressive home physical therapy exercises and weight-bearing advancement.
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Physical Therapy Exercises & Gating Biomechanics */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Footprints className="w-4 h-4 text-teal-600" />
                    <h3 className="text-base font-bold text-slate-900">
                      4. Physical Therapy Exercises &amp; Gating Biomechanics
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Biomechanical justification for prescribed rehabilitation movements and contraindication rationale for gating.
                  </p>
                </div>

                <div className="space-y-4 text-xs text-slate-600">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Why Physical Therapy Exercises are Gated During Red &amp; Amber Alerts:</span>
                    </h4>
                    <p className="leading-relaxed">
                      Performing active resisted knee flexion or quadriceps contractions in the presence of acute deep vein thrombosis (DVT) risks mechanical dislodgement of the thrombus into the pulmonary vascular bed, leading to fatal pulmonary embolism (PE). Similarly, exercising against acute wound drainage produces excessive tissue shear force along the arthrotomy repair, propagating surgical dehiscence and bacterial seeding. Hence, exercises are paused until clinical clearance is confirmed.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                    <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">1. Quadriceps Sets</span>
                        <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          3x 10 Reps &bull; 5s Hold
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-600">
                        <strong className="text-slate-800">Biomechanical Objective:</strong> Neuromuscular re-education of the <span className="font-semibold text-slate-800">Vastus Medialis Obliquus (VMO)</span> to overcome Arthrogenic Muscle Inhibition (AMI). Eliminates quadriceps extensor lag and restores terminal 0&deg; extension, preventing chronic flexion contracture.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">2. Heel Slides</span>
                        <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          2x 10 Reps &bull; 3s Hold
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-600">
                        <strong className="text-slate-800">Biomechanical Objective:</strong> Active-assisted sagittal flexion. Creates fluid shear stress in synovial compartments to prevent intra-articular adhesion formation across the suprapatellar pouch and lateral gutters, advancing tibiofemoral kinematic glide.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">3. Active Ankle Pumps</span>
                        <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          20x / Hour Awake
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-600">
                        <strong className="text-slate-800">Biomechanical Objective:</strong> Dynamic activation of the calf muscle pump (tibialis anterior and triceps surae). Accelerates popliteal and femoral venous flow velocities by &gt; 200%, clearing stasis pooling and mitigating thrombogenesis.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 5: Multidisciplinary Handover Matrix */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-teal-600" />
                    <h3 className="text-base font-bold text-slate-900">
                      5. Multidisciplinary Clinical Handover Matrix
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Defined clinical oversight roles across Orthopedic Surgeon, Physical Therapist, and Surgical Nurse.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Role A &bull; Attending Surgeon
                    </span>
                    <h4 className="text-xs font-bold text-slate-900">Orthopedic Surgeon Oversight</h4>
                    <ul className="text-[11px] text-slate-600 space-y-1 list-disc list-inside">
                      <li>Reviews Red Flag alerts for emergent clinical intervention.</li>
                      <li>Inspects Day 14 follow-up milestone for suture removal.</li>
                      <li>Authorizes Manipulation Under Anesthesia (MUA) if AROM stalls &lt; 80&deg;.</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Role B &bull; Rehabilitation
                    </span>
                    <h4 className="text-xs font-bold text-slate-900">Physical Therapist (PT) Lead</h4>
                    <ul className="text-[11px] text-slate-600 space-y-1 list-disc list-inside">
                      <li>Audits flexion/extension kinematic velocity curve.</li>
                      <li>Monitors patient compliance with quad sets and heel slides.</li>
                      <li>Adjusts gait training and walking distance goals on Amber alerts.</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Role C &bull; Triage Coordination
                    </span>
                    <h4 className="text-xs font-bold text-slate-900">Surgical Triage Nurse</h4>
                    <ul className="text-[11px] text-slate-600 space-y-1 list-disc list-inside">
                      <li>Conducts same-day telephone triage when Red/Amber alerts trigger.</li>
                      <li>Coordinates venous Doppler ultrasound orders for suspected DVT.</li>
                      <li>Monitors opioid weaning and multimodal compliance.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------------- */}
          {/* TAB 4: COHORT SIMULATOR & TEST DATA STUDIO                     */}
          {/* -------------------------------------------------------------- */}
          {activeTab === "simulation" && (
            <div className="space-y-6">
              {/* Studio Header Card */}
              <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-md space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
                    <FlaskConical className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                        Clinical Cohort &amp; Test Data Simulator
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-500/30 text-purple-200 border border-purple-400/40">
                        Evaluator Sandbox
                      </span>
                    </div>
                    <p className="text-xs text-purple-200/80 mt-1">
                      Generate realistic synthetic post-op patient cohorts with longitudinal recovery trajectories to test triage logic, pagination, kinematic curves, and AI recovery synthesis.
                    </p>
                  </div>
                </div>

                {/* Current Live Database Status */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/10 text-xs">
                  <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
                    <span className="text-[10px] uppercase tracking-wider text-purple-200 font-bold block">Current Cohort</span>
                    <span className="text-xl font-black mt-0.5 block">{patients.length} Patients</span>
                  </div>
                  <div className="bg-red-500/20 backdrop-blur-xs rounded-xl p-3 border border-red-500/30 text-red-200">
                    <span className="text-[10px] uppercase tracking-wider font-bold block">Critical Red</span>
                    <span className="text-xl font-black mt-0.5 block">{redCount} Urgent</span>
                  </div>
                  <div className="bg-amber-500/20 backdrop-blur-xs rounded-xl p-3 border border-amber-500/30 text-amber-200">
                    <span className="text-[10px] uppercase tracking-wider font-bold block">Watch Amber</span>
                    <span className="text-xl font-black mt-0.5 block">{amberCount} Plateau</span>
                  </div>
                  <div className="bg-emerald-500/20 backdrop-blur-xs rounded-xl p-3 border border-emerald-500/30 text-emerald-200">
                    <span className="text-[10px] uppercase tracking-wider font-bold block">Optimal Green</span>
                    <span className="text-xl font-black mt-0.5 block">{greenCount} On Track</span>
                  </div>
                </div>
              </div>

              {/* Section 1: Quick Preset Generators */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      1. One-Click Cohort Presets
                    </h3>
                    <p className="text-xs text-slate-500">
                      Instantly populate the database with clinical cohorts of varying sizes and triage mixes.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("roster")}
                    className="text-xs font-bold text-teal-600 hover:text-teal-700 inline-flex items-center gap-1"
                  >
                    <span>View in Roster &rarr;</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Preset 1: 5 Patients */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 font-black text-sm flex items-center justify-center border border-purple-200">
                          5
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                          Quick Test
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">5 Patients Cohort</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Generates 5 patients (2 Red, 1 Amber, 2 Green). Best for quick UI verification and fast inspection.
                      </p>
                    </div>

                    <button
                      onClick={() => handleGenerateTestData(5, false)}
                      disabled={isSimulating}
                      className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-2xs disabled:opacity-50"
                    >
                      {isSimulating ? "Generating..." : "Generate 5 Patients"}
                    </button>
                  </div>

                  {/* Preset 2: 7 Patients */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 font-black text-sm flex items-center justify-center border border-indigo-200">
                          7
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700">
                          Balanced
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">7 Patients Cohort</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Generates 7 patients (3 Red, 2 Amber, 2 Green). Rich multi-day check-in curves from Day 1 to 10.
                      </p>
                    </div>

                    <button
                      onClick={() => handleGenerateTestData(7, false)}
                      disabled={isSimulating}
                      className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-2xs disabled:opacity-50"
                    >
                      {isSimulating ? "Generating..." : "Generate 7 Patients"}
                    </button>
                  </div>

                  {/* Preset 3: 8 Patients */}
                  <div className="bg-white border-2 border-teal-500/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative">
                    <span className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-teal-600 text-white shadow-2xs">
                      Recommended
                    </span>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 font-black text-sm flex items-center justify-center border border-teal-200">
                          8
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700">
                          Optimal Mix
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">8 Patients Cohort</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Generates 8 patients (4 Red, 2 Amber, 2 Green). Full spectrum of Wells DVT flags and ROM plateaus.
                      </p>
                    </div>

                    <button
                      onClick={() => handleGenerateTestData(8, false)}
                      disabled={isSimulating}
                      className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-2xs disabled:opacity-50"
                    >
                      {isSimulating ? "Generating..." : "Generate 8 Patients"}
                    </button>
                  </div>

                  {/* Preset 4: 10+ Patients */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 font-black text-sm flex items-center justify-center border border-blue-200">
                          12
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                          Pagination Test
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">12 Patients Cohort</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Generates 12 patients spanning Page 1 and Page 2. Perfect for verifying pagination and list performance.
                      </p>
                    </div>

                    <button
                      onClick={() => handleGenerateTestData(12, false)}
                      disabled={isSimulating}
                      className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-2xs disabled:opacity-50"
                    >
                      {isSimulating ? "Generating..." : "Generate 12 (Test Pagination)"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 2: Custom Number Generator */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    2. Custom Cohort Generator
                  </h3>
                  <p className="text-xs text-slate-500">
                    Select a custom number of patients to generate with realistic baseline ML risk and longitudinal records.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
                    <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                      Patients to Generate:
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      value={simCount}
                      onChange={(e) => setSimCount(Number(e.target.value))}
                      className="flex-1 accent-teal-600 cursor-pointer"
                    />
                    <span className="w-10 text-center font-black text-base text-teal-700 bg-white border border-teal-200 py-1 px-2 rounded-xl">
                      {simCount}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={simAppend}
                        onChange={(e) => setSimAppend(e.target.checked)}
                        className="rounded text-teal-600 focus:ring-teal-500"
                      />
                      <span>Append to existing</span>
                    </label>

                    <button
                      onClick={() => handleGenerateTestData(simCount, simAppend)}
                      disabled={isSimulating}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-2xs disabled:opacity-50 whitespace-nowrap"
                    >
                      {isSimulating ? "Generating..." : `Generate ${simCount} Patients`}
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 3: Delete Test Data (Empty State Testing) */}
              <div className="bg-red-50/70 border border-red-200 rounded-3xl p-6 shadow-2xs space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
                      <Trash2 className="w-4 h-4 shrink-0" />
                      <h4>Delete All Test Data &bull; Reset to Empty Slate</h4>
                    </div>
                    <p className="text-xs text-red-800/80 max-w-xl leading-relaxed">
                      Wipes all simulated patients and longitudinal check-in records from the Neon database. Use this to verify how the application presents when zero patients are enrolled, and test the fresh bedside enrollment flow.
                    </p>
                  </div>

                  <button
                    onClick={handleDeleteAllTestData}
                    disabled={isSimulating || patients.length === 0}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete All Test Data</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. BEDSIDE ENROLLMENT MODAL (Crisp Hospital White)                 */}
      {/* ------------------------------------------------------------------ */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden">
            {/* Pinned Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Enroll New Surgical Patient</h3>
                  <p className="text-xs text-slate-500">
                    Assigns patient to {doctorDisplayName} &bull; Generates instant recovery link &amp; PIN
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsEnrollModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto modal-scroll flex-1">
              {!enrolledResult ? (
                <form onSubmit={handleEnrollSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Patient Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Arthur Pendelton"
                    value={enrollName}
                    onChange={(e) => setEnrollName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Patient Age
                    </label>
                    <input
                      type="number"
                      min="18"
                      max="100"
                      value={enrollAge}
                      onChange={(e) => setEnrollAge(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      4-Digit Passcode (PIN)
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={enrollPasscode}
                      onChange={(e) => setEnrollPasscode(e.target.value)}
                      placeholder="1234"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono tracking-widest focus:outline-none focus:border-teal-600"
                    />
                    <span className="text-[10px] text-slate-400">Default: 1234</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Biological Gender
                    </label>
                    <select
                      value={enrollGender}
                      onChange={(e) => setEnrollGender(e.target.value as "FEMALE" | "MALE")}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                    >
                      <option value="FEMALE">Female</option>
                      <option value="MALE">Male</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mobility Status
                    </label>
                    <select
                      value={enrollMobility}
                      onChange={(e) => setEnrollMobility(e.target.value as "INDEPENDENT" | "CANE" | "WALKER")}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                    >
                      <option value="INDEPENDENT">Independent (No device)</option>
                      <option value="CANE">Walking Stick / Cane</option>
                      <option value="WALKER">Walker / Frame</option>
                    </select>
                  </div>
                </div>

                {/* Pre-Operative Baseline Knee Severity */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Pre-Op Joint Severity (Baseline OKS)
                    </label>
                    <span className="text-[10px] font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-bold">
                      {enrollPreOpSeverity === "SEVERE"
                        ? "Baseline OKS: 12 / 48 (Severe)"
                        : enrollPreOpSeverity === "MODERATE"
                        ? "Baseline OKS: 18 / 48 (Moderate)"
                        : "Baseline OKS: 28 / 48 (Mild)"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "MILD", label: "Mild", sub: "Score 28-36" },
                      { id: "MODERATE", label: "Moderate", sub: "Score 18-27" },
                      { id: "SEVERE", label: "Severe", sub: "Score 0-17" },
                    ].map((sev) => (
                      <button
                        key={sev.id}
                        type="button"
                        onClick={() => setEnrollPreOpSeverity(sev.id as "MILD" | "MODERATE" | "SEVERE")}
                        className={`p-2 rounded-xl border text-center transition-all ${
                          enrollPreOpSeverity === sev.id
                            ? "bg-teal-50 border-teal-600 text-teal-900 ring-2 ring-teal-500/20 font-bold"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <span className="block text-xs">{sev.label}</span>
                        <span className="block text-[10px] text-slate-400">{sev.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chronic Comorbidities */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Pre-Existing Comorbidities (Select all that apply)
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100/80">
                      <input
                        type="checkbox"
                        checked={enrollHasHighBp}
                        onChange={(e) => setEnrollHasHighBp(e.target.checked)}
                        className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                      />
                      <span className="text-slate-800 text-[11px] font-medium">High Blood Pressure</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100/80">
                      <input
                        type="checkbox"
                        checked={enrollHasDiabetes}
                        onChange={(e) => setEnrollHasDiabetes(e.target.checked)}
                        className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                      />
                      <span className="text-slate-800 text-[11px] font-medium">Diabetes Mellitus</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100/80">
                      <input
                        type="checkbox"
                        checked={enrollHasHeartDisease}
                        onChange={(e) => setEnrollHasHeartDisease(e.target.checked)}
                        className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                      />
                      <span className="text-slate-800 text-[11px] font-medium">Heart Disease</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100/80">
                      <input
                        type="checkbox"
                        checked={enrollHasStroke}
                        onChange={(e) => setEnrollHasStroke(e.target.checked)}
                        className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                      />
                      <span className="text-slate-800 text-[11px] font-medium">Prior Stroke / TIA</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100/80 col-span-2">
                      <input
                        type="checkbox"
                        checked={enrollHasArthritis}
                        onChange={(e) => setEnrollHasArthritis(e.target.checked)}
                        className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                      />
                      <span className="text-slate-800 text-[11px] font-medium">Systemic Osteoarthritis</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Surgery Date
                    </label>
                    <input
                      type="date"
                      required
                      value={enrollSurgeryDate}
                      onChange={(e) => setEnrollSurgeryDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Operated Knee
                    </label>
                    <select
                      value={enrollKneeSide}
                      onChange={(e) => setEnrollKneeSide(e.target.value as "LEFT" | "RIGHT" | "BILATERAL")}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                    >
                      <option value="RIGHT">Right Knee</option>
                      <option value="LEFT">Left Knee</option>
                      <option value="BILATERAL">Bilateral</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mobile Number (Optional)
                    </label>
                    <input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={enrollPhone}
                      onChange={(e) => setEnrollPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="patient@example.com"
                      value={enrollEmail}
                      onChange={(e) => setEnrollEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isEnrolling}
                  className="w-full py-3 rounded-xl font-bold text-xs text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-xs"
                >
                  {isEnrolling ? "Saving to Clinical System & Analyzing Risk..." : "Enroll Patient & Generate Access Credentials →"}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-left space-y-1">
                  <p className="text-xs text-teal-800 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-teal-600" />
                    <span>Patient Registered in Clinical System</span>
                  </p>
                  <p className="text-xs text-slate-600">
                    Patient: <strong>{enrolledResult.name}</strong> &bull; {enrolledResult.kneeSide} Knee TKA
                  </p>
                </div>

                {/* Instant AI Stratification Result Badge */}
                {enrolledResult.mlRiskTier && (
                  <div
                    className={`p-3.5 rounded-xl border space-y-1.5 ${
                      enrolledResult.mlRiskTier.includes("HIGH")
                        ? "bg-red-50 border-red-200 text-red-950"
                        : enrolledResult.mlRiskTier.includes("MODERATE")
                        ? "bg-amber-50 border-amber-200 text-amber-950"
                        : "bg-emerald-50 border-emerald-200 text-emerald-950"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                        <span>Baseline AI Risk Stratification</span>
                      </span>
                      <span className="font-extrabold text-[11px] px-2 py-0.5 rounded-full bg-white/90 border border-current shadow-2xs">
                        {enrolledResult.mlRiskTier}
                      </span>
                    </div>
                    {enrolledResult.mlActionPlan && (
                      <p className="text-xs leading-relaxed font-medium">
                        {enrolledResult.mlActionPlan}
                      </p>
                    )}
                  </div>
                )}

                {/* Delivery Options */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>Patient Recovery Link:</span>
                    <button
                      onClick={() => {
                        copyTextWithToast(enrolledPatientUrl, "Patient Recovery Link");
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className="text-[11px] text-teal-600 hover:text-teal-700 font-bold inline-flex items-center gap-1"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
                    </button>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200 text-[11px] font-mono text-teal-700 truncate">
                    {enrolledPatientUrl}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <div className="flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-teal-600" />
                      <span className="text-xs text-slate-600">Access PIN:</span>
                      <strong className="text-xs font-mono text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        {enrolledResult.passcode}
                      </strong>
                    </div>

                    <button
                      onClick={() => {
                        copyTextWithToast(
                          `Your PostOp-Check recovery link: ${enrolledPatientUrl}\nYour 4-digit Passcode (PIN): ${enrolledResult.passcode}`,
                          "Recovery Link & PIN"
                        );
                        setCopiedPIN(true);
                        setTimeout(() => setCopiedPIN(false), 2000);
                      }}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                    >
                      {copiedPIN ? "Copied All!" : "Copy Link & PIN"}
                    </button>
                  </div>
                </div>

                {/* Bedside Camera QR Code */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5 text-teal-600" />
                      <span>Bedside Discharge QR Code</span>
                    </span>
                    <button
                      onClick={() => window.print()}
                      className="text-[11px] text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"
                    >
                      <Printer className="w-3 h-3" />
                      <span>Print</span>
                    </button>
                  </div>
                  <div className="py-1 flex justify-center">
                    <div className="p-2 bg-white rounded-xl inline-block shadow-xs border border-slate-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=3&data=${encodeURIComponent(
                          enrolledPatientUrl
                        )}`}
                        alt="Patient Recovery QR Code"
                        className="w-28 h-28"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Patient scans with phone camera &bull; Enter PIN: <strong className="text-teal-700">{enrolledResult.passcode}</strong>
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <a
                    href={`${enrolledPatientUrl}?view=doctor`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-teal-600 font-semibold hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Patient Recovery View &rarr;</span>
                  </a>

                  <button
                    onClick={() => setIsEnrollModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {/* AI Clinical Recovery Brief Modal */}
      {selectedPatient && (
        <AiClinicalBriefModal
          isOpen={aiBriefModalOpen}
          onClose={() => setAiBriefModalOpen(false)}
          isLoading={isGeneratingAiBrief}
          data={aiBriefData}
          patientName={selectedPatient.name}
          patientId={selectedPatient.id}
          postOpDay={selectedPatient.lastCheckinDay}
        />
      )}
    </div>
  );
}
