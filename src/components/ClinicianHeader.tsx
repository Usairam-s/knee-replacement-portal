"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Show, SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import { Activity, Users, Stethoscope, ShieldCheck } from "lucide-react";

export function ClinicianHeader() {
  const pathname = usePathname();
  const { user } = useUser();

  const doctorName = user?.fullName
    ? user.fullName
    : user?.firstName
    ? `Dr. ${user.firstName}`
    : user?.primaryEmailAddress?.emailAddress
    ? `Dr. ${user.primaryEmailAddress.emailAddress.split("@")[0]}`
    : "Orthopedic Clinician";

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Hospital & Brand Title */}
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
                <Activity className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold tracking-tight text-slate-900">
                    PostOp<span className="text-teal-600">-Check</span>
                  </span>
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                    ORTHOPEDIC SURGICAL SUITE
                  </span>
                </div>
                <p className="text-xs text-slate-500 hidden sm:block">
                  Joint Arthroplasty Continuous Care Protocol
                </p>
              </div>
            </Link>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1 ml-6 border-l border-slate-200 pl-6">
              <Link
                href="/dashboard"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  pathname === "/dashboard"
                    ? "bg-teal-50 text-teal-700 border border-teal-200"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Users className="w-3.5 h-3.5 text-teal-600" />
                <span>Patient Triage Roster</span>
              </Link>
            </nav>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Surveillance: Active</span>
            </div>

            <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
              <Show when="signed-in">
                <div className="flex items-center gap-2.5">
                  <UserButton />
                  <div className="hidden lg:block text-left text-xs">
                    <p className="font-semibold text-slate-900">{doctorName}</p>
                    <p className="text-[10px] text-slate-500">Orthopedic Surgery</p>
                  </div>
                </div>
              </Show>

              <Show when="signed-out">
                <div className="flex items-center gap-2">
                  <SignInButton mode="modal">
                    <button className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors">
                      Doctor Sign In
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 px-3 py-1.5 rounded-lg transition-colors shadow-xs">
                      Register Practice
                    </button>
                  </SignUpButton>
                </div>
              </Show>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
