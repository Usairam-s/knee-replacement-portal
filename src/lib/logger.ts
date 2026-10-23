/**
 * PostOp-Check Structured Clinical Logger
 * Enables efficient component-by-component and layer-by-layer debugging.
 */

type LogScope = 
  | 'AUTH' 
  | 'DOCTOR_DASHBOARD' 
  | 'PATIENT_CHECKIN' 
  | 'PATIENT_PORTAL'
  | 'TRIAGE_ENGINE' 
  | 'ML_MODEL' 
  | 'DATABASE' 
  | 'INVITE_SYSTEM' 
  | 'ENROLLMENT'
  | 'API';

const SCOPE_COLORS: Record<LogScope, string> = {
  AUTH: 'color: #8b5cf6; font-weight: bold;',
  DOCTOR_DASHBOARD: 'color: #0284c7; font-weight: bold;',
  PATIENT_CHECKIN: 'color: #10b981; font-weight: bold;',
  PATIENT_PORTAL: 'color: #0d9488; font-weight: bold;',
  TRIAGE_ENGINE: 'color: #f59e0b; font-weight: bold;',
  ML_MODEL: 'color: #ec4899; font-weight: bold;',
  DATABASE: 'color: #14b8a6; font-weight: bold;',
  INVITE_SYSTEM: 'color: #6366f1; font-weight: bold;',
  ENROLLMENT: 'color: #059669; font-weight: bold;',
  API: 'color: #64748b; font-weight: bold;',
};

export const logger = {
  info: (scope: LogScope, message: string, payload?: unknown) => {
    const timestamp = new Date().toISOString().substring(11, 19);
    if (typeof window !== 'undefined') {
      console.log(
        `%c[PostOp::${scope}]%c [${timestamp}] ${message}`,
        SCOPE_COLORS[scope] || 'font-weight: bold;',
        'color: inherit;',
        payload !== undefined ? payload : ''
      );
    } else {
      console.log(`[PostOp::${scope}] [${timestamp}] ${message}`, payload !== undefined ? payload : '');
    }
  },

  warn: (scope: LogScope, message: string, payload?: unknown) => {
    const timestamp = new Date().toISOString().substring(11, 19);
    console.warn(`⚠️ [PostOp::${scope}] [${timestamp}] ${message}`, payload !== undefined ? payload : '');
  },

  error: (scope: LogScope, message: string, error?: unknown) => {
    const timestamp = new Date().toISOString().substring(11, 19);
    console.error(`🚨 [PostOp::${scope}] [${timestamp}] ${message}`, error !== undefined ? error : '');
  },

  layer1Alert: (flagName: string, details: unknown) => {
    console.error(`🛑 [PostOp::TRIAGE_L1_RED_FLAG] Triggered: ${flagName}`, details);
  },

  layer2Trend: (delta: string, severity: 'WARNING' | 'CRITICAL', details: unknown) => {
    console.warn(`📈 [PostOp::TRIAGE_L2_TREND] ${severity}: ${delta}`, details);
  },

  layer3ML: (patientId: string, riskProb: number, classification: string) => {
    console.log(
      `🤖 [PostOp::TRIAGE_L3_ML] Patient ${patientId} => Calibrated Risk: ${(riskProb * 100).toFixed(1)}% [${classification}]`
    );
  }
};
