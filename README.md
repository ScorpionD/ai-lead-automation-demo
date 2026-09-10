# AI Lead Automation

A responsive portfolio demo showing how an inbound inquiry becomes a qualified sales lead. Built with **React, TypeScript, and Vite**, ready for Cloudflare Pages.

## What works

- Lead form with Full name, Email, Company, optional Phone, Estimated budget (USD), and Message.
- Accessible field validation, loading, success, and error states; duplicate submissions are prevented.
- A sample lead button for a quick walkthrough.
- A deterministic qualification result with priority, category, score, simulated AI summary, and recommended next step.
- Workflow: Lead Capture → AI Qualification → CRM → Email Follow-up → Manager Notification.
- Responsive mobile/desktop layout, keyboard focus, status announcements, and reduced-motion support.

## Demo boundaries

**Frontend MVP only.** Qualification uses transparent rules in the browser, not an LLM. Form values live only in React memory, disappear on refresh, and are never sent, logged, or persisted. No backend, API keys, analytics, cookies, database, CRM writes, emails, or manager notifications are implemented. The page loads fonts from Google Fonts; this request contains no form values.

React is implemented. API/Webhooks, n8n, OpenAI, CRM, and PostgreSQL are displayed as planned integrations. No paid resources or external AI calls are required.

## Run locally

Use Node.js **22.12+** (deployment pins 22.16.0) and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. No `.env` file is needed. `.env.example` documents a future public endpoint setting, which this release does not read. Never place credentials in `VITE_*` variables: they are included in the public browser bundle.

## Build and verify

```sh
npm run build
npm run preview
npm test
```

The build type-checks TypeScript and creates `dist/`. Tests cover validation, score/category differences, deterministic scoring, service failure, and successful retry. Node 22 may print an experimental warning for native TypeScript stripping in the test runner.

To walk through the UI, select **Use sample lead**, then **Submit Lead**. Change the budget or project brief and resubmit to see a different assessment. Submit an empty form to see validation. Expand **Demo controls**, enable **Simulate a submission error**, and submit valid details to exercise the failure state. Disable it and retry; the form is retained.

## Cloudflare Pages deployment

1. In **Workers & Pages**, choose **Create application**, then the **Pages** path and **Import an existing Git repository**.
2. Connect GitHub and select `ScorpionD/ai-lead-automation-demo`.
3. Configure:

   | Setting | Value |
   | --- | --- |
   | Project name | `ai-lead-automation-demo` (if available) |
   | Production branch | `main` |
   | Framework preset | Vite or React (Vite), if offered |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | Repository root (leave blank) |
   | Environment variables | None required |

4. Select **Save and Deploy**. Cloudflare installs dependencies and builds the static site. Open the assigned `*.pages.dev` URL when the deployment succeeds.
5. Future commits to `main` trigger production deployments through the Git integration.

Use the existing free Pages allowance. No custom domain, DNS change, Worker, database, secret, or paid service is needed. Stop if an account setup flow asks for a plan upgrade or payment.

Reference: [Cloudflare Vite deployment guide](https://developers.cloudflare.com/pages/framework-guides/deploy-a-vite3-project/).

## Structure and next phase

```text
src/
  components/QualificationPanel.tsx   # Empty, loading, and result display
  services/
    leadService.ts                   # Async adapter used by the UI
    qualification.ts                 # Pure demo scoring and summary
    validation.ts                    # Validation and whitespace normalization
  types/lead.ts                      # Shared types and demo fixture
  App.tsx                            # Form and single-page experience
  main.tsx
  styles.css
tests/lead.test.ts
```

The score starts at 25, adds 0–35 for the selected budget, 20 for service-related keywords, 10 for a brief of at least 100 characters, and 10 for recognized near-term timing. High priority starts at 75, medium at 50. Category detection uses English keywords. These simple heuristics can miss context or negation; the result is illustrative and should be reviewed by a person. Identity, email domain, phone, and sensitive attributes do not affect the score.

To add a backend later, replace the `LeadService` adapter in `src/services/leadService.ts` while retaining the typed form/result contract. Validate inputs again server-side, add abuse protection and request timeouts, and keep all OpenAI/CRM/messaging credentials exclusively on the server. Implement n8n/CRM/email/notification/storage behavior as a separate phase.

## License

MIT — see [LICENSE](LICENSE).
