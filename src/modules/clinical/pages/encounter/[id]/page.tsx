"use client";

import { EncounterScreen } from "@/modules/clinical/ui/encounter-screen";

export default function EncounterModulePage({ encounterId }: { encounterId: string }) {
  return <EncounterScreen encounterId={encounterId} />;
}
