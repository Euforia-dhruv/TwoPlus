import type { QueuedOp } from "@/lib/sync-queue"

// The one place a member learns that a write did not reach the server. It sits
// above the sections so a queued workout or measurement is visible where the
// data would have appeared, not buried in a toast.
export function PendingSync({
  ops,
  online,
  flushing,
  stale,
  onSync,
}: {
  ops: QueuedOp[]
  online: boolean
  flushing: boolean
  stale: boolean
  onSync: () => void
}) {
  if (!ops.length && online && !stale) return null

  return (
    <section className="mb-sync" aria-live="polite">
      <div className="mb-sync-head">
        <strong>
          {online
            ? `${ops.length} ${ops.length === 1 ? "change" : "changes"} waiting to sync`
            : "You are offline"}
        </strong>
        {online && ops.length > 0 && (
          <button type="button" className="mb-link" disabled={flushing} onClick={onSync}>
            {flushing ? "Syncing…" : "Sync now"}
          </button>
        )}
      </div>

      {!online && (
        <p className="mb-muted">
          Showing what this device saved last. Anything you log is kept here and sends
          by itself when the connection returns.
        </p>
      )}

      {stale && online && (
        <p className="mb-muted">
          Some of this is the last copy saved here while the connection was down.
        </p>
      )}

      {ops.length > 0 && (
        <ul className="mb-sync-list">
          {ops.map((op) => (
            <li key={op.key}>
              <span>{op.label}</span>
              {op.lastError && <small className="mb-error">{op.lastError}</small>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
