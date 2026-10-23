"use client";

import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";
import {
  Activity,
  ShieldCheck,
  Stethoscope,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  HeartPulse,
  QrCode,
  Smartphone,
  Hospital,
  Clock,
  FileCheck,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-teal-600 selection:text-white">
      {/* Top Clinical Navigation Bar */}
      <nav className="border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-xs">
              <Activity className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                PostOp<span className="text-teal-600">-Check</span>
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                CLINICAL ORTHOPAEDICS
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Show when="signed-out">
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition-all shadow-xs"
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>Doctor Sign-in</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Show>

            <Show when="signed-in">
              <UserButton />
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition-all shadow-xs"
              >
                <span>Clinician Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Show>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-20 pb-16 border-b border-slate-200 bg-gradient-to-b from-teal-50/40 via-white to-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-600 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>AAOS-Compliant Clinical Surveillance &bull; Total Knee Arthroplasty (TKA)</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Eliminate the 14-Day Post-Discharge <br />
            <span className="text-teal-600">
              Orthopedic Recovery Blindspot
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
            Continuous remote patient monitoring connecting knee replacement surgeons and patients from Day 1 to Day 30. Catch surgical complications early, reduce preventable readmissions, and guide recovery with automated clinical triage.
          </p>

          {/* Core Outcomes Cards */}
          <div className="pt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto text-left">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-start gap-3">
              <Clock className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-900">60-Second Daily Check-in</p>
                <p className="text-[11px] text-slate-500">Zero patient login friction. Unique link + 4-digit PIN.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-900">Exception-Based Triage</p>
                <p className="text-[11px] text-slate-500">Surgeons only review patients flagged 🔴 Red or 🟡 Amber.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-start gap-3">
              <Hospital className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-900">Prevent Costly Readmissions</p>
                <p className="text-[11px] text-slate-500">Detect DVT, joint sepsis, and wound dehiscence days earlier.</p>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Show when="signed-out">
              <Link
                href="/sign-in"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-sm text-white bg-teal-600 hover:bg-teal-700 transition-all shadow-xs flex items-center justify-center gap-2"
              >
                <Stethoscope className="w-4 h-4" />
                <span>Doctor Sign-in</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Show>

            <Show when="signed-in">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-sm text-white bg-teal-600 hover:bg-teal-700 transition-all shadow-xs flex items-center justify-center gap-2"
              >
                <Stethoscope className="w-4 h-4" />
                <span>Enter Clinician Triage Portal</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Show>
          </div>
        </div>
      </header>

      {/* 3-Step Practice Workflow Section */}
      <section className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">
              Clinical Workflow
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Designed for High-Volume Orthopedic Practices
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Zero disruption to your surgical calendar. Enroll in seconds at discharge; monitor by exception.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h3 className="text-base font-bold text-slate-900">
                30-Second Discharge Enrollment
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Before patient leaves the ward, surgical staff generates an encrypted token link with a 4-digit PIN. The patient scans the bedside QR code or receives an instant link.
              </p>
              <div className="pt-1 flex items-center gap-2 text-xs font-semibold text-teal-700">
                <QrCode className="w-4 h-4 text-teal-600" />
                <span>Single-scan bedside activation</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Daily 60-Second Mobile Check-in
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Patients log pain (0-10), knee flexion range, walking mobility, and opioid consumption once a day, with strict screening for surgical red flags.
              </p>
              <div className="pt-1 flex items-center gap-2 text-xs font-semibold text-teal-700">
                <Smartphone className="w-4 h-4 text-teal-600" />
                <span>Works on any mobile phone or browser</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Clinician Priority Action Board
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your clinical dashboard sorts patients automatically by urgency. Patients on track (🟢 Green) recover safely, while safety alerts (🔴 Red) trigger immediate clinical follow-up.
              </p>
              <div className="pt-1 flex items-center gap-2 text-xs font-semibold text-teal-700">
                <FileCheck className="w-4 h-4 text-teal-600" />
                <span>Documented clinical audit trail</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Tier Clinical Safety Architecture Section */}
      <section className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">
              Safety Architecture
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              3-Layer Orthopedic Triage Protocol
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Medical safety rules take absolute priority. Multi-day recovery trajectories provide early warning before readmission occurs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-red-200 rounded-2xl p-6 space-y-3 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-700 flex items-center justify-center font-bold text-sm">
                L1
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Deterministic Red Flags
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Emergency rule layer. Triggers immediate 🔴 RED priority on acute calf tenderness (suspected DVT), persistent fever &ge; 101.5&deg;F (sepsis), purulent wound drainage, or peroneal nerve foot drop.
              </p>
            </div>

            <div className="bg-white border border-amber-200 rounded-2xl p-6 space-y-3 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm">
                L2
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Recovery Trajectory Engine
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tracks 48h to 72h continuous deltas in pain vs knee flexion. Flags patients whose pain escalates (&ge; 2.5 pts) while walking mobility regresses or opioid intake spikes.
              </p>
            </div>

            <div className="bg-white border border-teal-200 rounded-2xl p-6 space-y-3 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm">
                L3
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Validated Risk Model
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Calibrated on longitudinal joint replacement cohorts. Evaluates baseline Oxford Knee Score (OKS), EQ-5D health utility, and systemic multimorbidity to deliver high-precision complication warnings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Professional Medical Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-8 px-4 sm:px-6 text-center text-xs text-slate-500 space-y-2">
        <p>&copy; 2026 PostOp-Check &bull; Total Knee Arthroplasty Clinical Intelligence Platform</p>
        <p className="text-[11px] text-slate-400">
          Encrypted HIPAA &amp; GDPR Compliant Clinical Decision Support. For Orthopedic Surgical Teams.
        </p>
      </footer>
    </div>
  );
}
