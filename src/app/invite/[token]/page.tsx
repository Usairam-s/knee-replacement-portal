"use client";

import { use, useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { dbService, InviteRecord } from "@/lib/db-service";
import { logger } from "@/lib/logger";
import { Activity, ShieldCheck, Stethoscope, ArrowRight, UserCheck } from "lucide-react";

function InviteContent({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;
  const [invite, setInvite] = useState<InviteRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    logger.info("INVITE_SYSTEM", `Validating patient surgical invite token: ${token}`);
    async function fetchInvite() {
      try {
        const res = await fetch(`/api/invites/${token}`);
        const json = await res.json();
        if (json.success && json.data) {
          setInvite(json.data);
          setIsLoading(false);
          return;
        }
      } catch (err) {
        logger.warn("INVITE_SYSTEM", "API token fetch failed, using fallback", err);
      }
      const found = await dbService.getInviteByToken(token);
      setInvite(found || null);
      setIsLoading(false);
    }
    fetchInvite();
  }, [token]);

  return (
    <div className="max-w-md w-full relative z-10 space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <Activity className="w-5 h-5 stroke-[2.5]" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            PostOp<span className="text-cyan-400">-Check</span>
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Total Knee Arthroplasty (TKA) Clinical Recovery System
        </p>
      </div>

      {/* Invite Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {isLoading ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            Verifying surgical token...
          </div>
        ) : invite ? (
          <>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-cyan-950/60 border border-cyan-800/60">
              <div className="w-10 h-10 rounded-xl bg-cyan-900 flex items-center justify-center text-cyan-300 flex-shrink-0">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">
                  Surgical Care Team
                </span>
                <h3 className="text-sm font-bold text-white">
                  Dr. Alistair Wright, MD, FRCS
                </h3>
                <p className="text-[11px] text-slate-400">
                  Royal Orthopaedic Joint Arthroplasty Center
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <UserCheck className="w-4 h-4 text-cyan-400" />
                <span>Personalized Patient Registration</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Patient:</span>
                  <strong className="text-white">{invite.patientName || "Joint Replacement Patient"}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Surgical Procedure:</span>
                  <strong className="text-white">{invite.kneeSide} Knee TKA</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Surgery Date:</span>
                  <strong className="text-white">{invite.surgeryDate}</strong>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Your surgeon has enrolled you in the PostOp-Check continuous recovery protocol. You will complete a brief 60-second daily check-in to track knee mobility, pain, and detect complications early.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Link
                href="/sign-up"
                className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-cyan-600 hover:bg-cyan-500 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/30"
              >
                <span>Create Account &amp; Bind to Dr. Wright</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/patient/checkin"
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
              >
                <span>Skip to Daily Check-in (Demo Mode)</span>
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-800 text-red-400 flex items-center justify-center mx-auto">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Invalid or Expired Token</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              This surgical invite token could not be verified. Please contact your surgeon&apos;s administrative office for a new link.
            </p>
            <Link
              href="/"
              className="inline-block mt-2 text-xs text-cyan-400 hover:underline"
            >
              &larr; Return to Homepage
            </Link>
          </div>
        )}
      </div>

      <div className="text-center text-xs text-slate-500 flex items-center justify-center gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" />
        <span>Encrypted HIPAA Compliant Link &bull; Single-Patient Token</span>
      </div>
    </div>
  );
}

export default function InvitePage(props: { params: Promise<{ token: string }> }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-cyan-600/10 blur-[120px] rounded-full pointer-events-none" />
      <Suspense fallback={<div className="text-slate-400 text-sm">Loading invitation...</div>}>
        <InviteContent params={props.params} />
      </Suspense>
    </div>
  );
}
