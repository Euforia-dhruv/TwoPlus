import { useState } from "react"
import type { BookableClass, ProgressPhoto } from "@/lib/member-api"

// Two member-app panels: the bookable class schedule, and the progress photo
// gallery. Both are presentational; the parent owns the data and the writes.

function when(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function ClassSchedule({
  classes,
  busyId,
  onBook,
  onCancel,
}: {
  classes: BookableClass[]
  busyId: string | null
  onBook: (id: string) => void
  onCancel: (id: string) => void
}) {
  if (!classes.length) {
    return <p className="mb-empty">No classes are scheduled yet. Check back soon.</p>
  }

  return (
    <div className="mb-classes">
      {classes.map((c) => {
        const full = c.booked >= c.capacity
        const mine = Boolean(c.my_booking)
        const busy = busyId === c.id
        return (
          <article className="mb-class" key={c.id}>
            <div className="mb-class-when">
              <strong>{when(c.starts_at)}</strong>
              <span className="mb-muted">
                {c.duration_minutes} min
                {c.trainer ? ` · ${c.trainer}` : ""}
                {c.branch ? ` · ${c.branch}` : ""}
              </span>
            </div>
            <div className="mb-class-main">
              <h3>{c.name}</h3>
              <span className={full && !mine ? "mb-seats is-full" : "mb-seats"}>
                {c.booked} of {c.capacity} booked
              </span>
            </div>
            {mine ? (
              <button
                type="button"
                className="btn secondary"
                disabled={busy}
                onClick={() => onCancel(c.id)}
              >
                {busy ? "Cancelling…" : "Cancel booking"}
              </button>
            ) : (
              <button
                type="button"
                className="btn"
                disabled={busy || full}
                onClick={() => onBook(c.id)}
              >
                {busy ? "Booking…" : full ? "Full" : "Book"}
              </button>
            )}
          </article>
        )
      })}
    </div>
  )
}

export function ProgressGallery({
  photos,
  onUpload,
  onDelete,
}: {
  photos: ProgressPhoto[]
  onUpload: (file: File, takenOn: string, note: string) => Promise<void>
  onDelete: (photo: ProgressPhoto) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [takenOn, setTakenOn] = useState(() => {
    // Local date, not UTC: a photo taken at 11pm should not be dated tomorrow.
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`
  })
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError("Choose a photo first.")
      return
    }
    setBusy(true)
    setError("")
    try {
      await onUpload(file, takenOn, note)
      setFile(null)
      setNote("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload that photo")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <form className="mb-photo-form" onSubmit={submit}>
        <label className="mb-field">
          <span>Photo</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <label className="mb-field">
          <span>Taken on</span>
          <input
            type="date"
            value={takenOn}
            max={takenOn}
            onChange={(e) => setTakenOn(e.target.value)}
          />
        </label>
        <label className="mb-field">
          <span>Note (optional)</span>
          <input
            value={note}
            maxLength={200}
            placeholder="Start of cut, week 4…"
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <button type="submit" className="btn" disabled={busy}>
          {busy ? "Uploading…" : "Add photo"}
        </button>
      </form>
      {error && <p className="mb-error">{error}</p>}

      {photos.length === 0 ? (
        <p className="mb-empty">
          No progress photos yet. These are private: only you and your gym's
          coaching staff can see them.
        </p>
      ) : (
        <div className="mb-gallery">
          {photos.map((p) => (
            <figure className="mb-photo" key={p.id}>
              {p.url ? (
                <img src={p.url} alt={p.note || `Progress photo from ${p.taken_on}`} loading="lazy" />
              ) : (
                <span className="mb-photo-missing">Preview unavailable</span>
              )}
              <figcaption>
                <span>{p.taken_on}</span>
                {p.note && <small>{p.note}</small>}
                <button
                  type="button"
                  className="mb-link"
                  onClick={() => onDelete(p)}
                >
                  Delete
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </>
  )
}
