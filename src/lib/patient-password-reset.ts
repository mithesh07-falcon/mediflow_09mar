import fs from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export const OTP_EXPIRY_MS = 3 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 3;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const RESET_TOKEN_EXPIRY_MS = 10 * 60 * 1000;

const OTP_STORE_FILE = path.join(process.cwd(), "data", "patient-password-otps.json");
const CLEANUP_RETENTION_MS = 24 * 60 * 60 * 1000;

type OtpUsedReason = "verified" | "expired" | "attempts_exceeded" | "superseded";

export interface PasswordResetOtpRecord {
  id: string;
  mobile: string;
  otpHash: string;
  attempts: number;
  used: boolean;
  usedReason?: OtpUsedReason;
  createdAt: string;
  expiresAt: string;
  resendAvailableAt: string;
  verificationToken?: string;
  verificationTokenExpiresAt?: string;
  verifiedAt?: string;
  resetCompleted: boolean;
  resetCompletedAt?: string;
}

declare global {
  var __mediflow_password_reset_otps: PasswordResetOtpRecord[] | undefined;
}

function ensureOtpStoreDir(): void {
  const dir = path.dirname(OTP_STORE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function parseMs(value?: string): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function cleanupStoreRecords(records: PasswordResetOtpRecord[], nowMs: number): PasswordResetOtpRecord[] {
  return records.filter((record) => {
    const createdMs = parseMs(record.createdAt);
    if (!createdMs) return false;

    const isOlderThanRetention = nowMs - createdMs > CLEANUP_RETENTION_MS;
    const isExpired = parseMs(record.expiresAt) <= nowMs;

    if (!isOlderThanRetention) return true;
    return !(record.resetCompleted || isExpired || record.used);
  });
}

function readOtpStore(): PasswordResetOtpRecord[] {
  if (global.__mediflow_password_reset_otps) {
    return global.__mediflow_password_reset_otps;
  }

  ensureOtpStoreDir();
  if (!fs.existsSync(OTP_STORE_FILE)) {
    global.__mediflow_password_reset_otps = [];
    try {
      fs.writeFileSync(OTP_STORE_FILE, "[]", "utf-8");
    } catch {
      // Ignore write failures in read-only deployments.
    }
    return global.__mediflow_password_reset_otps;
  }

  try {
    const raw = fs.readFileSync(OTP_STORE_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      global.__mediflow_password_reset_otps = parsed as PasswordResetOtpRecord[];
    } else {
      global.__mediflow_password_reset_otps = [];
    }
  } catch {
    global.__mediflow_password_reset_otps = [];
  }

  const nowMs = Date.now();
  global.__mediflow_password_reset_otps = cleanupStoreRecords(global.__mediflow_password_reset_otps, nowMs);
  return global.__mediflow_password_reset_otps;
}

function writeOtpStore(records: PasswordResetOtpRecord[]): void {
  const nowMs = Date.now();
  const cleaned = cleanupStoreRecords(records, nowMs);
  global.__mediflow_password_reset_otps = cleaned;

  try {
    ensureOtpStoreDir();
    fs.writeFileSync(OTP_STORE_FILE, JSON.stringify(cleaned, null, 2), "utf-8");
  } catch {
    // Ignore write failures in read-only deployments.
  }
}

export function normalizeIndianMobile(value: string): string | null {
  const compact = value.replace(/\s+/g, "").replace(/-/g, "");
  const digitsOnly = compact.replace(/\D/g, "");

  let national = "";
  if (/^\+91\d{10}$/.test(compact)) {
    national = compact.slice(3);
  } else if (/^91\d{10}$/.test(digitsOnly)) {
    national = digitsOnly.slice(2);
  } else if (/^\d{10}$/.test(digitsOnly)) {
    national = digitsOnly;
  } else {
    return null;
  }

  if (!/^[6-9]\d{9}$/.test(national)) {
    return null;
  }

  return `+91${national}`;
}

export function isSecureTransport(request: Request): boolean {
  try {
    const url = new URL(request.url);
    const hostname = url.hostname.toLowerCase();
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
      return true;
    }

    const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0].trim().toLowerCase();
    if (forwardedProto) {
      return forwardedProto === "https";
    }

    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export function generateSixDigitOtp(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function hashBcryptSecret(secret: string): Promise<string> {
  return bcrypt.hash(secret, 10);
}

export async function compareBcryptSecret(plainText: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plainText, hash);
  } catch {
    return false;
  }
}

export async function issuePasswordResetOtp(mobile: string): Promise<{
  otp: string | null;
  blocked: boolean;
  cooldownSeconds: number;
  cooldownRemainingSeconds: number;
  expiresInSeconds: number;
}> {
  const store = readOtpStore();
  const nowMs = Date.now();

  const latestRecord = [...store]
    .reverse()
    .find((record) => record.mobile === mobile && !record.resetCompleted);

  const cooldownRemainingMs = latestRecord ? parseMs(latestRecord.resendAvailableAt) - nowMs : 0;
  if (cooldownRemainingMs > 0) {
    return {
      otp: null,
      blocked: true,
      cooldownSeconds: Math.floor(OTP_RESEND_COOLDOWN_MS / 1000),
      cooldownRemainingSeconds: Math.ceil(cooldownRemainingMs / 1000),
      expiresInSeconds: Math.floor(OTP_EXPIRY_MS / 1000),
    };
  }

  for (const record of store) {
    if (record.mobile === mobile && !record.used && !record.resetCompleted) {
      record.used = true;
      record.usedReason = "superseded";
    }
  }

  const otp = generateSixDigitOtp();
  const otpHash = await hashBcryptSecret(otp);

  const createdAt = new Date(nowMs).toISOString();
  const expiresAt = new Date(nowMs + OTP_EXPIRY_MS).toISOString();
  const resendAvailableAt = new Date(nowMs + OTP_RESEND_COOLDOWN_MS).toISOString();

  store.push({
    id: crypto.randomUUID(),
    mobile,
    otpHash,
    attempts: 0,
    used: false,
    createdAt,
    expiresAt,
    resendAvailableAt,
    resetCompleted: false,
  });

  writeOtpStore(store);

  return {
    otp,
    blocked: false,
    cooldownSeconds: Math.floor(OTP_RESEND_COOLDOWN_MS / 1000),
    cooldownRemainingSeconds: Math.floor(OTP_RESEND_COOLDOWN_MS / 1000),
    expiresInSeconds: Math.floor(OTP_EXPIRY_MS / 1000),
  };
}

export async function sendPasswordResetOtpSms(mobile: string, otp: string): Promise<boolean> {
  const smsApiUrl = process.env.SMS_API_URL;
  const smsApiKey = process.env.SMS_API_KEY;
  const smsSender = process.env.SMS_SENDER ?? "MediFlow";

  const message = `Your MediFlow password reset OTP is ${otp}. It expires in 3 minutes.`;

  if (!smsApiUrl || !smsApiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[MediFlow:OTP] SMS provider not configured. OTP for ${mobile}: ${otp}`);
      return true;
    }
    console.error("[MediFlow:OTP] SMS provider configuration missing in production.");
    return false;
  }

  try {
    const response = await fetch(smsApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${smsApiKey}`,
      },
      body: JSON.stringify({
        to: mobile,
        message,
        sender: smsSender,
      }),
      cache: "no-store",
    });

    return response.ok;
  } catch (error) {
    console.error("[MediFlow:OTP] SMS dispatch failed.", error);
    return false;
  }
}

export type VerifyPasswordResetOtpResult =
  | {
      success: true;
      resetToken: string;
      resetTokenExpiresInSeconds: number;
    }
  | {
      success: false;
      code: "invalid" | "expired" | "attempts_exceeded";
    };

export async function verifyPasswordResetOtp(mobile: string, otp: string): Promise<VerifyPasswordResetOtpResult> {
  const store = readOtpStore();
  const nowMs = Date.now();

  const record = [...store]
    .reverse()
    .find((item) => item.mobile === mobile && !item.used && !item.resetCompleted);

  if (!record) {
    return { success: false, code: "invalid" };
  }

  if (parseMs(record.expiresAt) <= nowMs) {
    record.used = true;
    record.usedReason = "expired";
    writeOtpStore(store);
    return { success: false, code: "expired" };
  }

  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    record.used = true;
    record.usedReason = "attempts_exceeded";
    writeOtpStore(store);
    return { success: false, code: "attempts_exceeded" };
  }

  const otpMatches = await compareBcryptSecret(otp, record.otpHash);
  if (!otpMatches) {
    record.attempts += 1;
    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      record.used = true;
      record.usedReason = "attempts_exceeded";
      writeOtpStore(store);
      return { success: false, code: "attempts_exceeded" };
    }

    writeOtpStore(store);
    return { success: false, code: "invalid" };
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  record.used = true;
  record.usedReason = "verified";
  record.verifiedAt = new Date(nowMs).toISOString();
  record.verificationToken = resetToken;
  record.verificationTokenExpiresAt = new Date(nowMs + RESET_TOKEN_EXPIRY_MS).toISOString();
  writeOtpStore(store);

  return {
    success: true,
    resetToken,
    resetTokenExpiresInSeconds: Math.floor(RESET_TOKEN_EXPIRY_MS / 1000),
  };
}

export type ValidatePasswordResetTokenResult =
  | {
      success: true;
      recordId: string;
      mobile: string;
    }
  | {
      success: false;
      code: "invalid" | "expired";
    };

export function validatePasswordResetToken(resetToken: string): ValidatePasswordResetTokenResult {
  const store = readOtpStore();
  const nowMs = Date.now();

  const record = store.find(
    (item) =>
      item.verificationToken === resetToken &&
      !!item.verificationToken &&
      !item.resetCompleted
  );

  if (!record) {
    return { success: false, code: "invalid" };
  }

  if (!record.verificationTokenExpiresAt || parseMs(record.verificationTokenExpiresAt) <= nowMs) {
    return { success: false, code: "expired" };
  }

  return {
    success: true,
    recordId: record.id,
    mobile: record.mobile,
  };
}

export function completePasswordResetSession(recordId: string): void {
  const store = readOtpStore();
  const record = store.find((item) => item.id === recordId);

  if (!record) {
    return;
  }

  record.resetCompleted = true;
  record.resetCompletedAt = new Date().toISOString();
  record.verificationToken = undefined;
  record.verificationTokenExpiresAt = undefined;
  writeOtpStore(store);
}
