import EncounterModulePage from "@/modules/clinical/pages/encounter/[id]/page";

export default function EncounterPage({ params }: { params: { id: string } }) {
  return <EncounterModulePage encounterId={params.id} />;
}
