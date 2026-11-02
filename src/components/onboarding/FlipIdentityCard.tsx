import { useState } from "react";
import { Icon } from "../../icons";
import "./identity-card.css";

// Premium digital gym identity card: front shows the brand face, back reveals
// the submitted registration details. Real data only; optional fields degrade
// gracefully. Flip via click/tap or keyboard (Enter/Space).
export function FlipIdentityCard({
  gymName,
  tagline,
  location,
  ownerName,
  email,
  phone,
  address,
  gymType,
  branchName,
  status = "Active",
}: {
  gymName: string;
  tagline?: string;
  location?: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  address?: string;
  gymType?: string;
  branchName?: string;
  status?: string;
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="id-card-wrap">
      <div
        className={`id-card${flipped ? " is-flipped" : ""}`}
        role="button"
        tabIndex={0}
        aria-label="Gym identity card. Press Enter or Space to flip."
        onClick={() => setFlipped((f) => !f)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setFlipped((f) => !f);
          }
        }}
      >
        <div className="id-card__inner">
          <div className="id-card__face id-card__face--front">
            <div className="id-card__halo" aria-hidden="true" />
            <div className="id-card__brand">
              <span className="id-card__logo">
                <Icon name="activity" size={22} />
              </span>
              <span className="id-card__wordmark">TwoPlus<span>·fit</span></span>
            </div>
            <div className="id-card__gym">
              <h2>{gymName}</h2>
              {tagline && <p>{tagline}</p>}
            </div>
            <div className="id-card__meta">
              <span>
                <Icon name="building" size={14} /> {branchName || "Main branch"}
              </span>
              {location && (
                <span>
                  <Icon name="shield" size={14} /> {location}
                </span>
              )}
            </div>
            <div className="id-card__foot">
              <span>WORKSPACE MEMBER CARD</span>
              <span className="id-card__hint">Flip to view details</span>
            </div>
          </div>

          <div className="id-card__face id-card__face--back">
            <div className="id-card__dl">
              <div><span>Gym</span><strong>{gymName || "—"}</strong></div>
              <div><span>Owner</span><strong>{ownerName || "—"}</strong></div>
              <div><span>Email</span><strong>{email || "—"}</strong></div>
              <div><span>Contact</span><strong>{phone || "—"}</strong></div>
              <div><span>Address</span><strong>{address || "—"}</strong></div>
              <div><span>Type</span><strong>{gymType || "—"}</strong></div>
              <div><span>Branch</span><strong>{branchName || "Main branch"}</strong></div>
              <div><span>Status</span><strong className="id-card__status">{status}</strong></div>
            </div>
            <div className="id-card__foot">
              <span>FLIP BACK</span>
              <span className="id-card__hint">Tap card</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
