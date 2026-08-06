"use client";

import { useState } from "react";

import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Modal } from "@/shared/components/ui/modal";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
};

export function ConfirmDialog({ open, title, description, confirmLabel, destructive, onCancel, onConfirm }: ConfirmDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la accion.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onCancel} title={title} description={description}>
      <div className="space-y-4">
        {error ? (
          <Alert>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className={destructive ? "bg-red-600 text-white hover:bg-red-600/90" : undefined}
          >
            {submitting ? "Procesando..." : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
