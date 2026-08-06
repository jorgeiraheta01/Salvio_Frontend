"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * El backend no expone ningun endpoint para listar encuentros/notas clinicas por
 * paciente (solo por encounter_id, que hay que conocer de antemano) — confirmado
 * contra /openapi.json, no es una omision de la UI. Este store mantiene un indice
 * local persistido (patientId -> encounterId[]) poblado cada vez que la app inicia
 * un encuentro, para poder reconstruir el historial de consultas pasadas iniciadas
 * desde este dispositivo. No cubre encuentros creados fuera de esta app/navegador.
 */
type EncounterHistoryState = {
  byPatient: Record<string, string[]>;
  recordEncounter: (patientId: string, encounterId: string) => void;
};

export const useEncounterHistoryStore = create<EncounterHistoryState>()(
  persist(
    (set) => ({
      byPatient: {},
      recordEncounter: (patientId, encounterId) =>
        set((state) => {
          const existing = state.byPatient[patientId] ?? [];
          if (existing.includes(encounterId)) return state;
          return { byPatient: { ...state.byPatient, [patientId]: [...existing, encounterId] } };
        })
    }),
    { name: "salvio-encounter-history" }
  )
);
