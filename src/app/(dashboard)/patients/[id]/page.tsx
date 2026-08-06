import { PatientProfileScreen } from "@/modules/patients/ui/patient-profile-screen";

export default function PatientProfilePage({ params }: { params: { id: string } }) {
  return <PatientProfileScreen patientId={params.id} />;
}
