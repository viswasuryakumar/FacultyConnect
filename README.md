# FacultyConnect

A responsive frontend for the student–professor meeting platform in the supplied PowerPoint. Built with React 19, Vite 7 and strict TypeScript. The application uses shared, simulated data so student and professor journeys can be demonstrated without real accounts or connected services.

## Run locally

Use Node.js 22.12 or newer. This workspace also contains a local Node distribution under `.tools/node-v22.23.4-win-x64`; the Windows helper uses it automatically.

From this project directory in PowerShell:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\run.ps1
```

Open **http://127.0.0.1:5173**. Keep that terminal running; press `Ctrl+C` to stop the server. The execution-policy flag applies only to this command and does not change the machine policy.

For an installed Node.js environment:

```sh
npm install
npm run dev
```

For a production bundle:

```sh
npm run build
npm run preview
```

Vite serves this frontend locally. A production deployment and hosting provider have not been selected.

## Preview workflows

- Use the preview identity control to switch between student, professor and admin examples. Identity switching demonstrates different screens; it is not authentication or a role grant.
- As a student, browse professors, open a profile, choose an eligible 30-minute time and type a meeting type, discussion topic and message. Student email is editable in profile settings and appears in the professor's meeting details as a mailto link. Students do not see their own email repeated on meeting details. Manual requests remain pending until the professor accepts them.
- As a professor, open the selected request and accept or decline it. Switching back to the student displays the same booking record and updated status.
- Use Availability → Booking rules to demonstrate automatic confirmation for new bookings. Existing pending requests remain pending.
- Edit weekly hours or the optional One-off schedule changes section to demonstrate conflict review. Confirmed meetings stay booked when explicitly kept as exceptions.
- Rescheduling proposes a replacement time while retaining the original appointment until agreement.
- Connect and Join Zoom actions explain their preview limitations. No provider account is connected and no external meeting is created.
- Open **Notes** or a meeting's **Notes** tab for shared chat during the scheduled meeting window. Messages become read-only afterward. Drafts stay private; shared history and downloads remain available. Notes persist in this browser preview; they do not synchronize between separate devices.
- A separate **Conversation record** tab includes **View example format** for the automatic transcript/recap demonstration. The example is clearly labeled; real Zoom capture remains a backend integration.
- Use **Reset demo** to restore the sample records. Reset affects only this application's preview data.

Dates are generated relative to the preview clock instead of copying the presentation's fixed November appointments. Meeting times are displayed in the selected IANA time zone. Ratings and review counts are illustrative examples.

## Code and contracts

The application separates reusable presentation components, feature screens, booking/time rules and a local preview service adapter. Student and professor views share normalized records rather than keeping separate copies of appointments. Browser persistence belongs to the adapter, not individual screens.

- [Page map](docs/page-map.md): presentation screens and navigation.
- [Design system](DESIGN.md): the implemented visual tokens and responsive components.
- [Architecture and service contracts](docs/architecture.md): boundaries, domain models, lifecycle and future service responsibilities.
- [Meeting notes and automatic summaries](docs/meeting-notes.md): local notes behavior and the future Zoom summary contract.
- [Open policies](docs/policies.md): choices still requiring product or faculty approval.
- [Questions for the professor](docs/professor-questions.md): sign-in (Okta), Zoom and Google Calendar, with items that may cost money flagged.
- `reference/slide-text.txt` and `reference/slides/`: extracted presentation references. The PNGs are approximate vector renders using a substitute font, not screenshots of the implementation.

The app reproduces the presentation's purple and white interface, horizontal desktop navigation, initials, profile cards, forms and status treatments. Slide titles, slide numbers and the right-hand design-notes rail are presentation material and are excluded from the website.

## Checks

```sh
npm run typecheck
npm run lint
npm run format:check
npm run test
npm run test:e2e
npm run build
```

Unit tests target booking transitions, shared state, availability validation and time handling. Browser checks target the student request → professor acceptance → student confirmation journey and automatic booking. Browser tests use the installed Google Chrome (`channel: 'chrome'` in `playwright.config.ts`). To use Playwright's bundled Chromium instead, remove that channel setting and run `npx playwright install chromium`.

Latest verification completed November 9, 2026: TypeScript, production build, lint, formatting, all 44 unit tests and all 13 Chrome browser scenarios passed. See [validation results](docs/validation.md) for the tested workflows, viewport sizes and limitations.

## Backend work remaining

This phase does not implement Okta, account creation, passwords, a server database, real faculty verification, email delivery, Zoom or Google Calendar authorization. Backend, database, hosting and identity-provider ownership remain undecided.

Production services must enforce authenticated roles and record access, validate availability atomically, prevent concurrent reservations, process idempotent commands, protect provider credentials server-side and run retryable meeting/calendar jobs. A confirmed booking and a ready meeting link are separate states. Local checks are useful for the preview but cannot provide these production guarantees.

Production policy still needs decisions for pending-slot holds, expiry, notice and booking limits, rescheduling deadlines, availability conflicts, review eligibility and faculty approval.
