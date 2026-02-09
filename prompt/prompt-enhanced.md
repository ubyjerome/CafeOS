# CafeOS

Design and implement **CafeOS**, a client-side-only SaaS platform for managing physical cyber cafés. The system must be production-grade, fully functional, responsive, and extensible. Prioritize correctness, clarity of roles, flexibility of services, and operational reliability over visual novelty.

---

## 1. Core Definition

CafeOS is a **web-based cyber café management system** with three role tiers:

* **Guests**: External users who pay for and consume services.
* **Admins**: Operational staff responsible for guest check-ins and service validation.
* **Managers**: Supervisory users with full administrative and configuration authority.

The platform operates without a backend server. All logic is client-side.

---

## 2. Technology Stack (Hard Constraints)

* **Database & Auth**: InstantDB (client-side)
* **Payments**: Paystack (inline payments only, using `onSuccess` / `onClose` and others where neccesary for payment validation)
* **Media Storage**: Cloudinary
* **PDF Generation**: Client-side PDF generation for receipts
* **UI**: Use the image uploaded as a UI inspiration for layouts only and arrangments...
* **Styling**:

  * TailwindCSS or equivalent
  * No gradients
  * Small border-radius
  * Minimal animation (fade only; no scale, glow, bounce, or hover gimmicks)
  * Duotone icons only when functionally justified
  * Font: DM Sans (overrideable via CSS)

---

## 3. Environment Configuration

All sensitive or variable values must be injected via environment variables:

* InstantDB configuration
* Cloudinary configuration
* Paystack configuration
* `PRIMARY_COLOR` (hex value)

The primary color must:

* Never be hard-coded
* Generate light/dark shades dynamically via an external npm utility
* Apply consistently across headings, highlights, and UI accents
* Support both light and dark themes

---

## 4. Service Model (Critical)

The system must support **arbitrary service types**, including but not limited to:

* One-off services
* Daily services
* Weekly services
* Monthly services
* Fixed time-range services

Each service definition must support:

* Pricing
* Visibility (public or private)
* Duration logic
* Completion rules

### Service Consumption Logic

#### One-Off Services

* Guest pays once
* System generates a **verifiable QR code**
* Admin validates QR code
* Service is marked as consumed

#### Time-Based Services

* Guest pays in advance
* Guest physically checks in at café
* Timer starts on check-in
* Timer pauses/resumes manually by admin
* Completion state updates progressively:

  * Daily: completes at day end
  * Weekly: progress tracked (e.g. `3/7 days used`)
  * Monthly: cumulative tracking

System must remain flexible enough to accommodate new service archetypes without redesign.

---

## 5. Role Capabilities

### Guests

After authentication, guests must be able to:

* View payment history (paginated)
* View active and past services
* Access QR codes for paid services
* Download/print payment receipts
* Manage minimal profile settings:

  * Name
  * Phone number
  * Profile image or Gravatar
  * Theme preference (light/dark)

---

### Admins

Admins must be able to:

* View guest profiles
* View guest payment history
* View active and completed services
* Validate QR codes
* Check guests in and out
* Pause and resume service timers
* View currently checked-in guests
* Print receipts on behalf of guests
* Ban guests (prevent future login)

---

### Managers

Managers inherit **all admin privileges** and additionally can:

* Create, edit, and price services
* Add, remove, and block admins
* Add, remove, and manage other managers
* View all guests and all admins
* Access full guest activity history
* Generate reports:

  * Daily / Monthly / Yearly check-ins
  * Financial summaries
* Update global system configuration:

  * Company name
  * Company information
  * Company logo
  * Branding color (via env)
* View system-wide analytics

---

## 6. SaaS Behavior

* No marketing or landing page
* App loads directly at root or subdomain (e.g. `app.cafeone.com`)
* Public services are visible before authentication
* Guests may sign in or sign up directly from the app
* Designed for multi-tenant reuse

---

## 7. Defaults & First-Run Behavior

On first deployment:

* Default company logo:
  `https://ilabs.world/ilabs-logo.png`
* Default company info: example placeholder business
* Default admin account:

  * Email: `admin@cafeos.ilabs.world`
  * Password: `admin123`

Passwords:

* Must never be stored in plaintext
* Use client-side obfuscation/encryption appropriate to frontend-only constraints
* Do not claim cryptographic guarantees that cannot be met client-side

---

## 8. Payments & Receipts

* Paystack inline payment only
* Payment state handled via callbacks
* All payments must be persisted
* Receipts:

  * Generated as PDFs
  * Include company logo and company details
  * Styled like real-world vouchers
* Guests and admins must both be able to print receipts

---

## 9. UI / UX Rules (Strict)

* Fully responsive across desktop, tablet, and mobile
* Mobile-only bottom sheets allowed for dense interactions
* No icon-as-illustration abuse
* Text-first UI, icons only for affordances
* No glowing outlines
* No animated scaling
* No decorative excess
* Optimize images aggressively
* Pagination for all large datasets
* Analytics should be modern and sleek, i don't wanna see no chartjs old ass gimmick, use moderrn charting/ graph library when showing analytics for admins or managers.

Modern, restrained, functional UI. Clarity over flair.

---

## 10. Non-Negotiable Outcome

The delivered system must be:

* Fully functional
* End-to-end usable
* Realistically deployable
* Internally consistent
* Flexible enough to support future service models
* Built as a serious SaaS product, not a demo

Failure to implement any core workflow, role capability, or service lifecycle logic is unacceptable.
