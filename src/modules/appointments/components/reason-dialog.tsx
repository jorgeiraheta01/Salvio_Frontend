"use client";

import { useState } from "react";

import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Modal } from "@/shared/components/ui/modal";
import { Textarea } from "@/shared/components/ui/textarea";

type ReasonDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: (reason: string) => Promise<void>;
};

export function ReasonDialog({ open, title, description, confirmLabel, onCancel, onConfirm }: ReasonDialogProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (reason.trim().length < 3) {
      setError("Escribe un motivo de al menos 3 caracteres.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(reason.trim());
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la accion.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setReason("");
    setError(null);
    onCancel();
  }

  return (
    <Modal open={open} onClose={handleClose} title={title} description={description}>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="reason">Motivo</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Describe brevemente el motivo..."
            autoFocus
          />
        </div>
        {error ? (
          <Alert>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={submitting}>
            {submitting ? "Guardando..." : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
