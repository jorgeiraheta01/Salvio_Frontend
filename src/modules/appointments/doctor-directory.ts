"use client";

import { useEffect, useState } from "react";

import { listUsers, type UserDirectoryEntry } from "@/modules/clinical/api/clinical.api";

/**
 * Fallback solo para doctores creados antes de que `users.specialty` existiera
 * en el backend (ver migracion de columna). Cualquier doctor nuevo ya trae su
 * especialidad real desde el registro (onboarding o alta directa).
 */
const LEGACY_SPECIALTY_BY_NAME: Record<string, string> = {
  "Dr. Arrieta": "Cardiologia",
  "Dra. Mendez": "Pediatria",
  "Dr. Vega": "Traumatologia"
};

export function specialtyForDoctor(fullName: string, specialty?: string | null): string {
  return specialty?.trim() || LEGACY_SPECIALTY_BY_NAME[fullName] || "Medicina general";
}

export function useDoctorDirectory() {
  const [doctors, setDoctors] = useState<UserDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    listUsers("doctor")
      .then((data) => {
        if (mounted) setDoctors(data);
      })
      .catch(() => {
        if (mounted) setDoctors([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const byId = new Map(doctors.map((doctor) => [doctor.id, doctor]));

  return { doctors, byId, loading };
}
