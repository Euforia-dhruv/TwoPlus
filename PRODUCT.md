# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Owners and staff of independent gyms and small-to-medium fitness businesses in India.
Within one organization the PRD defines these roles: **owner** (full business visibility),
**manager** (daily operations), **receptionist** (front desk: members, payments, enquiries,
attendance), **trainer** (assigned clients, workouts), **finance/payroll staff** (expenses,
collections, salary records).

A second audience is the **gym member**, who uses a self-service portal rather than the
staff dashboard.

Later-phase audiences (multi-branch operators, equipment suppliers, marketplace
administrators, support agents, integration providers) are not current users.

## Product Purpose

Replace the fragmented reality of gym administration — paper registers, spreadsheets, manual
payment reminders, disconnected messaging apps — with one integrated system.

The product succeeds when an owner can answer five questions from one place:

1. How is my gym performing financially?
2. Which members need attention today?
3. Which enquiries should my staff follow up with?
4. Which payments and memberships are overdue or expiring?
5. What tasks must my team complete today?

Definition of success: a gym owner can run the most important daily business processes from
one web application, with accurate records, clear financial visibility, reliable reminders,
and appropriate access controls.

## Positioning

**Open — deliberately undecided.** No differentiator has been chosen. Do not invent one in
copy, marketing surfaces, or onboarding text. The user intends to settle this later.

## Operating Context

Used at a front desk, often by one person handling several jobs at once, and increasingly on
a phone. Data entry speed matters more than density. Collections happen through cash, UPI and
bank transfer rather than online gateways today. Real gyms validate the product through a
controlled pilot before advanced features are considered.

## Capabilities and Constraints

**Phase 1 (current scope):** authentication and onboarding, owner dashboard, members,
membership plans and lifecycle, attendance, payments and receipts, enquiries and lead
conversion, follow-ups and reminders, notifications, staff and trainers, expenses, basic
reports, role-based permissions, member portal, workouts, basic class scheduling, feedback and
support tickets, gym settings and audit history.

**Phases 2–3 (later, must not be presented as available):** payment gateway automation,
automated collection and retention workflows, messaging, payroll automation, offers and
referrals, inventory, multi-branch management, native mobile apps, live video classes,
marketplace, biometric/RFID, AI insights.

**Durable technical and integrity constraints:**

- Money is stored in integer minor units, never floating point.
- Every organization-owned record is scoped to its organization; one gym must never read
  another's data, including by changing identifiers in a URL.
- Authorization is enforced server-side and in database policies, never only in the interface.
  Client-supplied roles, organization IDs, and admin flags are never trusted.
- Membership status and payment status are separate concerns. An active membership does not
  imply the fees are paid.
- A payment is never marked successful because a user returned from a payment page; only
  server-side verification counts.
- Historical transactions, membership records and attendance survive archiving, expiry,
  suspension and cancellation.
- Administrative and financial changes carry audit records.
- The product must not claim end-to-end encryption, or any unverified guarantee, before it is
  real and independently verified.
- Later-phase features must not be represented as shipped.

## Brand Commitments

**Naming is unsettled.** The PRD is titled *GymOS*; the shipped frontend is branded
**TwoPlus.fit**, and the in-app shell reads **HeyGym**. This is not a visual decision to make
unilaterally — treat the existing in-app naming as incumbent and flag any rename rather than
performing one.

No logo, voice document, or identity asset set has been formally established.

## Evidence on Hand

**None yet.** No real customers, testimonials, case studies, press, benchmarks, or usage
metrics. The only accounts in existence are test accounts belonging to the owner.

Do not fabricate social proof, customer counts, logos, ratings, or performance claims on any
surface. When marketing content is needed, the user will supply real evidence first ("we will
do it") — until then, write without claims rather than around them.

## Product Principles

1. **Workflows, not screens.** A renewal connects the membership record, expiry date,
   notification, follow-up task, payment, receipt and dashboard. Features that do not
   participate in that chain are not finished.
2. **The server is the boundary.** Interface restrictions are ergonomics; database policies and
   server-side functions are the security model.
3. **History is append-only in spirit.** Corrections and cancellations never silently rewrite
   what already happened.
4. **No fake state.** If a payment, statistic, or integration is not real, the interface says so
   or omits it.
5. **Dependable core before complexity.** The essential daily workflows must be trustworthy
   before anything ambitious is added.

## Accessibility & Inclusion

Not yet established as a product requirement. The PRD asks for accessible forms, tables,
dialogs and navigation, and for responsive use on phones. No standard (WCAG level) has been
committed to, and no accessibility audit has been performed.
