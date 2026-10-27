# BPAA demo CRM

A password-protected demo of the BPAA packages. Live at https://bpaa-demo.vercel.app.

The demo shows how the packages look in daily work for a fictional kitchen workshop, «Демо-Кухни», in October 2026: Telegram digests at 9:00, 13:00 and 19:00, incoming leads with owners, a deal board with stuck-deal highlighting and a sample «Разбор» report. Every company, person, phone number and figure is invented. Only the packages and prices are real; they come from the BPAA price list of 24.10.2026.

## Stack

- Next.js 16 (App Router, `proxy.ts`), React 19, Tailwind CSS 4.
- No database. The month is generated deterministically from a seed (`lib/demo/generate.ts`), and every number on screen comes from `lib/demo/selectors.ts`, so all tabs agree.
- Login uses scrypt password hashes from the `DEMO_ACCOUNTS` env var and an HMAC-signed session cookie. It also has an Origin check, constant-time compares, a minimum response time and a per-IP failure limit. CSP uses nonces.
- A visitor's own marks (moved deals, contacted leads, tour state) stay in their browser's localStorage only.

## Run locally

```bash
npm install
cp .env.example .env.local   # then fill DEMO_SECRET and DEMO_ACCOUNTS
npm run add-account -- demo 30   # prints a password and the JSON entry for DEMO_ACCOUNTS
npm run dev
```

## Checks

```bash
npm test        # data quotas, message texts, no unmasked phones, no client names, copy length
npm run lint
npm run build
```

## Accounts and /admin

Pavel, or any login listed in `ADMIN_LOGINS`, can open `/admin` to:

- create a login for a prospect with an expiry date; the password is shown once, together with a ready message to send;
- add 14 days to a login, disable it or delete it;
- see when each prospect last visited and which tabs they opened;
- read the login log, which keeps only country and device type; IP addresses are not stored.

Logins created on `/admin` live in Upstash Redis (Vercel Marketplace, free plan) and take effect without a redeploy. Logins in `DEMO_ACCOUNTS` still work, but changing them needs a redeploy: `npm run add-account -- p01 30`. Set `DEMO_ENABLED=false` to close the demo for everyone.

To get a Telegram message every time a prospect logs in, set `DEMO_NOTIFY_TG_TOKEN` and `DEMO_NOTIFY_CHAT_ID`. This is optional.
