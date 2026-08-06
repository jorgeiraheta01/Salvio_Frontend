"use client";

import { useEffect, useState } from "react";

import { updatePatient, type PatientItem } from "@/modules/clinical/api/clinical.api";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Modal } from "@/shared/components/ui/modal";
import { formatPhone } from "@/shared/utils/format";

type EditPatientDialogProps = {
  open: boolean;
  patient: PatientItem;
  onClose: () => void;
  onSaved: (patient: PatientItem) => void;
};

export function EditPatientDialog({ open, patient, onClose, onSaved }: EditPatientDialogProps) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyRelationship, setEmergencyRelationship] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEmail(patient.email ?? "");
    setPhone(patient.phone ?? "");
    setAddress(patient.address ?? "");
    setEmergencyName(patient.emergency_contact_name ?? "");
    setEmergencyPhone(patient.emergency_contact_phone ?? "");
    setEmergencyRelationship(patient.emergency_contact_relationship ?? "");
    setError(null);
  }, [open, patient]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const updated = await updatePatient(patient.id, {
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        emergency_contact_name: emergencyName.trim() || undefined,
        emergency_contact_phone: emergencyPhone.trim() || undefined,
        emergency_contact_relationship: emergencyRelationship.trim() || undefined
      });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar los cambios.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Editar paciente" description={`${patient.first_name} ${patient.last_name}`}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-email">Correo</Label>
            <Input id="edit-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-phone">Telefono</Label>
            <Input id="edit-phone" value={phone} onChange={(event) => setPhone(formatPhone(event.target.value))} placeholder="0000-0000" maxLength={9} inputMode="numeric" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-address">Direccion</Label>
          <Input id="edit-address" value={address} onChange={(event) => setAddress(event.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-emergency-name">Contacto de emergencia</Label>
            <Input id="edit-emergency-name" value={emergencyName} onChange={(event) => setEmergencyName(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-emergency-phone">Telefono</Label>
            <Input
              id="edit-emergency-phone"
              value={emergencyPhone}
              onChange={(event) => setEmergencyPhone(formatPhone(event.target.value))}
              placeholder="0000-0000"
              maxLength={9}
              inputMode="numeric"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-emergency-relationship">Parentesco</Label>
            <Input
              id="edit-emergency-relationship"
              value={emergencyRelationship}
              onChange={(event) => setEmergencyRelationship(event.target.value)}
            />
          </div>
        </div>

        {error ? (
          <Alert>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
