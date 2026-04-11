export function normalizeEmail(value: string | null | undefined): string {
  return String(value || "").trim().toLowerCase();
}

export function isElderlyPatientRecord(record: any): boolean {
  if (!record) return false;
  const age = Number.parseInt(String(record.age || ""), 10);
  return record.isElderly === true || record.user_type === "elderly" || (Number.isFinite(age) && age >= 60);
}

export function isGuardianLinkedToAnyElderly(guardianEmail: string | null | undefined, patients: any[]): boolean {
  const normalizedEmail = normalizeEmail(guardianEmail);
  if (!normalizedEmail) return false;

  return (patients || []).some((patient) =>
    isElderlyPatientRecord(patient) && normalizeEmail(patient.guardianEmail) === normalizedEmail
  );
}

export function findLinkedElderlyForGuardian(guardianEmail: string | null | undefined, patients: any[]): any | null {
  const normalizedEmail = normalizeEmail(guardianEmail);
  if (!normalizedEmail) return null;

  return (
    (patients || []).find(
      (patient) => isElderlyPatientRecord(patient) && normalizeEmail(patient.guardianEmail) === normalizedEmail
    ) || null
  );
}
