"use client";

import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { createGroup } from "@/libs/groups/api";
import { useChatStore } from "@/store/chatStore";

export function CreateGroupDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const loadInbox = useChatStore((s) => s.loadInbox);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Open and close the native <dialog> from the `open` prop.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName || isCreating) return;

    setIsCreating(true);
    setError(null);

    try {
      const group = await createGroup({
        name: trimmedName,
        description: description.trim() || undefined,
      });

      // There's no "group created" socket event, so refresh the inbox ourselves.
      loadInbox({ silent: true });

      setName("");
      setDescription("");
      onClose();
      router.push(`/messages/g/${group.conversationId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the group");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-0 text-[var(--text)] backdrop:bg-black/50"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
        <h2 className="text-lg font-bold">New group</h2>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="Group name"
            autoComplete="off"
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-[15px] font-normal outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent-text)]"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Description <span className="font-normal text-[var(--muted)]">(optional)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="What is this group for?"
            className="resize-none rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-[15px] font-normal outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent-text)]"
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm text-[var(--muted)] hover:bg-[var(--surface-2)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || isCreating}
            className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-[var(--accent-fg)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCreating ? "Creating…" : "Create"}
          </button>
        </div>
      </form>
    </dialog>
  );
}