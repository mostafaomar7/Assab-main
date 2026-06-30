// Pre-login entry selection (dashboard + role), chosen on the landing flow BEFORE
// the credential login. Persisted so the mockup can open directly on the chosen role
// after the user authenticates.
export type EntrySelection = { slug: string; role: string };

const KEY = "asab_entry_selection";

export function readEntrySelection(): EntrySelection | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.slug === "string" && typeof parsed.role === "string") {
      return parsed as EntrySelection;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeEntrySelection(sel: EntrySelection): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(sel));
  } catch {
    /* ignore storage failures */
  }
}

export function clearEntrySelection(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
