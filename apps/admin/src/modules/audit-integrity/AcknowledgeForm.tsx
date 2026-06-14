// Acknowledge form (Story 1.11b, DD-5 / AC-5).
//
// RHF + the SAME `AuditIntegrityAcknowledgeRequest` Zod schema the server enforces
// (§4.4) — a non-empty `ticketRef` is required (recording it IS the v1 "investigation
// ticket opened" artifact). Keyboard-reachable; the input is labelled + the error is
// announced (role="alert"), per §4.10.

import * as Label from '@radix-ui/react-label';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AuditIntegrityAcknowledgeRequest,
  type AuditIntegrityAcknowledgeRequest as AckRequest,
} from '@twt/contracts';
import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';

export interface AcknowledgeFormProps {
  onAcknowledge: (ticketRef: string) => void;
  pending: boolean;
  errorMessage?: string;
}

export function AcknowledgeForm({
  onAcknowledge,
  pending,
  errorMessage,
}: AcknowledgeFormProps): ReactElement {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AckRequest>({
    resolver: zodResolver(AuditIntegrityAcknowledgeRequest),
    defaultValues: { ticketRef: '' },
  });

  return (
    <form
      className="mt-4 flex flex-col gap-2"
      onSubmit={handleSubmit((values) => onAcknowledge(values.ticketRef))}
      aria-label="Acknowledge integrity failure"
    >
      <Label.Root htmlFor="ticketRef" className="text-sm font-medium">
        Investigation ticket reference
      </Label.Root>
      <input
        id="ticketRef"
        type="text"
        className="rounded border border-status-fail-border px-2 py-1"
        placeholder="e.g. JIRA-1234 or a ticket URL"
        aria-invalid={errors.ticketRef ? true : undefined}
        aria-describedby={errors.ticketRef ? 'ticketRef-error' : undefined}
        {...register('ticketRef')}
      />
      {errors.ticketRef && (
        <p id="ticketRef-error" role="alert" className="text-sm text-status-fail-fg">
          {errors.ticketRef.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="self-start rounded bg-status-fail-border px-3 py-1 text-white disabled:opacity-60"
      >
        {pending ? 'Acknowledging…' : 'Confirm acknowledgement'}
      </button>
      {errorMessage && (
        <p role="alert" className="text-sm text-status-fail-fg">
          {errorMessage}
        </p>
      )}
    </form>
  );
}
