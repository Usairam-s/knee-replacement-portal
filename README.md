# PostOp-Check &bull; Clinical Arthroplasty Recovery Portal

> **Post-Operative Total Knee Arthroplasty (TKA) Remote Patient Monitoring & AI Clinical Triage System**

[![Next.js 16](https://img.shields.io/badge/Next.js-16.4.2-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![Neon Database](https://img.shields.io/badge/Neon-PostgreSQL-00E599?logo=postgresql)](https://neon.tech/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?logo=openai)](https://openai.com/)

---

## Overview

**PostOp-Check** is a specialized hospital-grade clinical platform designed for orthopedic surgeons, physiotherapists, and knee replacement patients. It bridges the critical 90-day post-discharge care gap through:

1. **Daily Patient Recovery Portal (`/patient/[token]`)**:
   - Zero-friction authentication using encrypted patient token + 4-digit PIN (no app downloads or SMS OTP delays).
   - Validated daily check-ins capturing Active Knee Flexion (AROM), Pain Score (VAS 0–10), walking distance, opioid consumption, and acute surgical symptoms.
   - Built-in rehabilitation exercise library (quad sets, active heel slides, ankle pumps, prone hangs) with biomechanical rationale.

2. **Orthopedic Clinical Command Center (`/dashboard`)**:
   - **Executive Priority Cohort Triage**: Real-time triage stratification into **Critical Red Alert** (emergent review), **Watch Amber** (kinematic velocity plateau), and **Optimal Green** (on-track recovery).
   - **Single-Row Patient Worklist**: High-efficiency, scannable roster with 10-patient pagination.
   - **Dedicated Clinical Patient File (`/dashboard/patients/[id]`)**: Full-width longitudinal kinematics trajectory graph (Pain vs. Flexion from Day 1 to present), Oxford Knee Score (OKS /48) baseline stratification, and multi-day check-in audit trail.

3. **On-Demand AI Clinical Recovery Brief (OpenAI GPT-4o-mini)**:
   - One-click live clinical synthesis converting longitudinal patient data into structured orthopedic assessments:
     - Biomechanical & Kinematic Progress (ROM velocity and extension deficit)
     - Joint Effusion & Pain Dynamics (Arthrogenic Muscle Inhibition)
     - Complication Audit (Wells criteria for DVT, AAOS/BOA surgical site infection flags)
     - Distinct Surgeon Directives & Physiotherapy Plans
     - 1-click **"Copy EMR Note"** formatted for hospital electronic health record systems.

4. **Interactive Cohort Simulator & Test Data Studio (Tab 4)**:
   - Instant generation of realistic synthetic cohorts (5, 7, 8, 12+ patients) with multi-day trajectories.
   - "Delete All Test Data" button for clean-slate testing and evaluation.

---

## Tech Stack

- **Framework**: Next.js 16.4.2 (App Router with Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 & Lucide Icons
- **Authentication**: Clerk (`@clerk/nextjs`)
- **Database**: Neon Serverless PostgreSQL (`@neondatabase/serverless`)
- **Charting**: Recharts
- **Clinical AI Engine**: OpenAI GPT-4o-mini
- **Machine Learning Microservice**: PythonAnywhere WSGI (LightGBM/XGBoost on NHS PROMs Arthroplasty Registry Data)

---

## Environment Variables

Configure these variables in your local `.env.local` or in **Vercel Project Settings &rarr; Environment Variables**:

| Variable | Description |
| :--- | :--- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Authentication Publishable Key |
| `CLERK_SECRET_KEY` | Clerk Authentication Secret Key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `DATABASE_URL` | Neon PostgreSQL pooled connection string |
| `NEXT_PUBLIC_ML_API_URL` | Orthopedic ML Risk Prediction API endpoint |
| `OPENAI_API_KEY` | OpenAI API key for clinical brief generation |

---

## Deployment to Vercel

1. Import this repository into **Vercel** (`https://vercel.com/new`).
2. Framework Preset: **Next.js** (Root Directory: `./`).
3. Add the Environment Variables listed above.
4. Click **Deploy**.
