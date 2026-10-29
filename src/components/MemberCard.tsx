import { useState } from "react";
import { Badge } from "@/components/kit";
import { Icon } from "@/icons";

export type MemberCardData = {
  name: string;
  email: string;
  phone: string;
  plan: string;
  status: string;
  expires: string;
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
  const showPhoto = Boolean(member.photo) && !photoBroken;
  const hasDues = member.due !== "₹0" && member.due !== "—";

  const stop = (event: React.MouseEvent) => event.stopPropagation();

  return (
    <article className={`member-card${selected ? " is-selected" : ""}`}>
      <div
        className="member-card-open"
        role="button"
        tabIndex={0}
        aria-label={`Open ${member.name}`}
        onClick={() => onOpen(member)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpen(member);
          }
        }}
      >
        <div className="member-card-photo">
          {showPhoto ? (
            <img
              src={member.photo}
              alt=""
              loading="lazy"
              decoding="async"
              onError={() => setPhotoBroken(true)}
            />
          ) : (
            <span className={`member-card-fallback tone-${member.name.charCodeAt(0) % 5}`}>
              {initials(member.name)}
            </span>
          )}
          <Badge>{member.status}</Badge>
          <div className="member-card-scrim" />
        </div>

        <div className="member-card-body">
          <strong title={member.name}>{member.name}</strong>
          <small>{member.email === "—" ? member.phone : member.email}</small>

          <div className="member-card-rows">
            <span>
              <Icon name="clipboard" size={13} />
              {member.plan}
            </span>
            <span className={member.status === "Expired" ? "is-overdue" : ""}>
              <Icon name="calendar" size={13} />
              {member.expires === "—" ? "No active membership" : `Ends ${member.expires}`}
            </span>
            {hasDues && (
              <span className="is-due">
                <Icon name="wallet" size={13} />
                {member.due} due
              </span>
            )}
            {member.trainer !== "Unassigned" && (
              <span>
                <Icon name="members" size={13} />
                {member.trainer}
              </span>
            )}
          </div>
        </div>
      </div>

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
      <div className="member-card-photo" />
      <div className="member-card-body">
        <span className="skeleton-line wide" />
        <span className="skeleton-line" />
        <span className="skeleton-line short" />
      </div>
    </div>
  );
}

export { STATUS_TONE };
