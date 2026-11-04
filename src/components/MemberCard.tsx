import { useState } from "react";
import FlipCard from "@/components/ui/FlipCard";
import { Icon } from "@/icons";

export type MemberCardData = {
  name: string;
  email: string;
  phone: string;
  plan: string;
  status: string;
  expires: string;
  joined?: string;
  due: string;
  trainer: string;
  memberId?: string;
  membershipId?: string;
  photo?: string;
};

type Props = {
  member: MemberCardData;
  selected: boolean;
  onSelect: (name: string) => void;
  onOpen: (member: MemberCardData) => void;
  onEdit: (member: MemberCardData) => void;
  onArchive: (member: MemberCardData) => void;
};

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

export function MemberCard({
  member,
  selected,
  onSelect,
  onOpen,
  onEdit,
  onArchive,
}: Props) {
  const [photoBroken, setPhotoBroken] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const showPhoto = Boolean(member.photo) && !photoBroken;
  const hasDues = member.due !== "₹0" && member.due !== "—";

  const stop = (event: React.MouseEvent) => event.stopPropagation();

  // Two full-bleed faces. The front is the photo with the name over it; the
  // back is the record. Both fill the same portrait box, so the flip reads as
  // one card turning over rather than two panels swapping.
  // Front: name at the top, the photo full bleed, two quiet facts at the foot.
  // Back: the same name and a short record, nothing else.
  const front = (
    <div className="member-card-face member-card-face--front">
      {showPhoto ? (
        <img
          src={member.photo}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setPhotoBroken(true)}
        />
      ) : (
        <span className="member-card-fallback">{initials(member.name)}</span>
      )}
      <div className="member-card-scrim" />

      <strong className="member-card-title" title={member.name}>
        {member.name}
      </strong>

      <div className="member-card-front-foot">
        <span>{member.plan}</span>
        <span>{member.status}</span>
      </div>
    </div>
  );

  const back = (
    <div className="member-card-face member-card-face--back">
      <strong className="member-card-title" title={member.name}>
        {member.name}
      </strong>

      <div className="member-card-rows">
        <span className={member.status === "Expired" ? "is-overdue" : ""}>
          <Icon name="calendar" size={13} />
          {member.expires === "—" ? "No active membership" : `Ends ${member.expires}`}
        </span>
        <span>
          <Icon name="mobile" size={13} />
          {member.phone}
        </span>
        <span className={hasDues ? "is-due" : ""}>
          <Icon name="wallet" size={13} />
          {hasDues ? `${member.due} due` : "No dues"}
        </span>
      </div>
    </div>
  );

  return (
    <article className={`member-card${selected ? " is-selected" : ""}`}>
      <FlipCard
        className="member-card-flipcard"
        front={front}
        back={back}
        flipped={flipped}
        onFlipChange={setFlipped}
        ariaLabel={`${member.name}: ${flipped ? "show card" : "show details"}`}
        radius={14}
        background="transparent"
        color="inherit"
        shadow={false}
        glare
        glareOpacity={0.16}
        hoverScale={1}
        tilt
        tiltMax={8}
        stiffness={170}
        damping={20}
      />

      <div className="member-card-actions">
        <button
          type="button"
          className="member-card-action"
          onClick={(event) => {
            stop(event);
            onOpen(member);
          }}
        >
          View profile
        </button>
        <button
          type="button"
          className="member-card-icon"
          aria-label={`More actions for ${member.name}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={(event) => {
            stop(event);
            setMenuOpen((open) => !open);
          }}
        >
          ···
        </button>
        <input
          type="checkbox"
          className="member-card-check"
          aria-label={`Select ${member.name}`}
          checked={selected}
          onChange={() => onSelect(member.name)}
          onClick={stop}
        />
      </div>

      {menuOpen && (
        <>
          <div className="member-card-backdrop" onClick={() => setMenuOpen(false)} />
          <div className="member-card-menu" role="menu">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                onEdit(member);
              }}
            >
              <Icon name="settings" size={14} />
              Edit details
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                onArchive(member);
              }}
            >
              <Icon name="package" size={14} />
              {member.status === "Archived" ? "Restore member" : "Archive member"}
            </button>
          </div>
        </>
      )}
    </article>
  );
}

export function MemberCardSkeleton() {
  return (
    <div className="member-card is-skeleton" aria-hidden="true">
      <div className="member-card-skeleton-face">
        <span className="skeleton-line" />
        <span className="skeleton-line short" />
      </div>
    </div>
  );
}
