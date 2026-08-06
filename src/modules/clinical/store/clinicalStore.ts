"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type EncounterDraft = {
  history: string;
  noteId?: string;
  noteVersion?: number;
  noteClosed?: boolean;
  saveState: "idle" | "saving" | "saved" | "error";
  saveMessage?: string;
  clinicalRecordId?: string;
};

type ClinicalStoreState = {
  drafts: Record<string, EncounterDraft>;
  hydrateDraft: (encounterId: string, draft: Partial<EncounterDraft>) => void;
  setHistory: (encounterId: string, history: string) => void;
  setSaveState: (encounterId: string, saveState: EncounterDraft["saveState"], saveMessage?: string) => void;
  clearDraft: (encounterId: string) => void;
};

const initialDraft: EncounterDraft = {
  history: "",
  saveState: "idle"
};

export const useClinicalStore = create<ClinicalStoreState>()(
  persist(
    (set) => ({
      drafts: {},
      hydrateDraft: (encounterId, draft) =>
        set((state) => ({
          drafts: {
            ...state.drafts,
            [encounterId]: {
              ...(state.drafts[encounterId] ?? initialDraft),
              ...draft
            }
          }
        })),
      setHistory: (encounterId, history) =>
        set((state) => ({
          drafts: {
            ...state.drafts,
            [encounterId]: {
              ...(state.drafts[encounterId] ?? initialDraft),
              history
            }
          }
        })),
      setSaveState: (encounterId, saveState, saveMessage) =>
        set((state) => ({
          drafts: {
            ...state.drafts,
            [encounterId]: {
              ...(state.drafts[encounterId] ?? initialDraft),
              saveState,
              saveMessage
            }
          }
        })),
      clearDraft: (encounterId) =>
        set((state) => {
          const next = { ...state.drafts };
          delete next[encounterId];
          return { drafts: next };
        })
    }),
    { name: "salvio-clinical-drafts" }
  )
);
