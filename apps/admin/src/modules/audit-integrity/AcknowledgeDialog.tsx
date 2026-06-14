// Acknowledge dialog (Story 1.11b, AC-5 / §4.10) — a Radix Dialog primitive.
//
// Acknowledging a tamper signal is a consequential, security-relevant action, so it
// runs through a focus-trapped modal (Radix Dialog gives WCAG-AA focus management,
// ESC-to-close, `aria-modal`, and labelled Title/Description out of the box —
// §4.10). The modal body is the RHF + Zod `AcknowledgeForm`. The dialog stays open
// while the mutation is pending or errors; on success the banner re-derives to the
// acknowledged state and this whole subtree unmounts.

import * as Dialog from '@radix-ui/react-dialog';
import type { ReactElement } from 'react';

import { AcknowledgeForm } from './AcknowledgeForm.js';

export interface AcknowledgeDialogProps {
  onAcknowledge: (ticketRef: string) => void;
  pending: boolean;
  errorMessage?: string;
}

export function AcknowledgeDialog({
  onAcknowledge,
  pending,
  errorMessage,
}: AcknowledgeDialogProps): ReactElement {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="mt-4 self-start rounded bg-status-fail-border px-3 py-1 text-white"
          data-testid="open-acknowledge"
        >
          Acknowledge &amp; open ticket
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[min(28rem,90vw)] -translate-x-1/2 -translate-y-1/2 rounded bg-white p-6 text-gray-900 shadow-xl">
          <Dialog.Title className="text-lg font-bold">
            Acknowledge integrity failure
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm opacity-80">
            Recording an investigation-ticket reference acknowledges this tamper
            signal and clears the persistent alert banner. The failed verdict itself
            remains on the immutable record.
          </Dialog.Description>
          <AcknowledgeForm
            onAcknowledge={onAcknowledge}
            pending={pending}
            errorMessage={errorMessage}
          />
          <Dialog.Close asChild>
            <button type="button" className="mt-3 text-sm underline">
              Cancel
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
