"use client";

import { Suspense } from "react";
import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { Activity, ShieldCheck } from "lucide-react";

function SignUpContent() {
  return (
    <div className="w-full flex justify-center">
      <SignUp
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/dashboard"
      />
    </div>
  );
}

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center py-8 sm:py-12 px-3 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6 sm:mb-8 space-y-2">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
            <Activity className="w-5 h-5 stroke-[2.5]" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-900">
            PostOp<span className="text-teal-600">-Check</span>
          </span>
        </Link>
        <p className="text-xs text-slate-500">
          Create Clinician or Practice Account
        </p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-medium text-slate-600 shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
          <span>Surgeon &amp; Care Team Registration</span>
        </div>
      </div>

      <Suspense fallback={<div className="text-slate-500 text-sm">Loading registration...</div>}>
        <SignUpContent />
      </Suspense>

      <footer className="mt-8 text-center text-xs text-slate-400">
        &copy; 2026 PostOp-Check MedTech Systems &bull; TKA Clinical Recovery Intelligence
      </footer>
    </div>
  );
}
