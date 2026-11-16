---
name: Clerk + Tailwind v4 + Vite integration (Replit-managed Clerk)
description: Non-obvious gotchas wiring @clerk/react into a Vite + Tailwind v4 artifact with the Replit-managed Clerk tenant.
---

# Clerk + Tailwind v4 + Vite integration

Hard-won setup details when adding Replit-managed Clerk to a Vite + Tailwind v4 app.

## Tailwind v4 CSS layer ordering
- `@layer theme, base, clerk, components, utilities;` MUST be the FIRST line of `index.css`, before `@import "tailwindcss"`. A CSS `@layer` *statement* (the comma list) is allowed before `@import`; a layer *block* is not.
- Import the Clerk theme css explicitly: `@import "@clerk/themes/shadcn.css";` and pass `cssLayerName: "clerk"` in the appearance object so Clerk styles land in that layer.
- In `vite.config.ts` use `tailwindcss({ optimize: false })` — lightningcss optimization otherwise mangles Clerk's layered styles.

## Publishable key + proxy
- Derive the key per-host: `publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)` from `@clerk/react/internal`.
- Pass `proxyUrl={import.meta.env.VITE_CLERK_PROXY_URL}` unconditionally on `<ClerkProvider>`.
- Secrets are provisioned by `setupClerkWhitelabelAuth`: `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`. Server needs `clerkProxyMiddleware` + `clerkMiddleware` in app.ts.

## Routing (wouter, base path)
- App is mounted under a base path (`import.meta.env.BASE_URL`). Wrap in `<WouterRouter base={basePath}>` and strip the base in `routerPush`/`routerReplace` before calling `setLocation`.
- `<SignIn>`/`<SignUp>` need `routing="path"` and FULL paths including base: `path={\`${basePath}/sign-in\`}`.
- Routes must use the catch-all form: `<Route path="/sign-in/*?" ...>` (wouter) so Clerk's nested steps resolve.

## Web auth transport
- Web uses cookie auth — do NOT call `setAuthTokenGetter` (that is Expo-only). The generated `customFetch` uses same-origin `fetch`, so the Clerk session cookie rides along to same-origin `/api/*` automatically.

## German localization
- Only the `signIn.start`/`signUp.start` `title`/`subtitle` were customized via the `localization` prop. Form field labels ("Email address", "Continue") remain Clerk defaults unless a full German locale is supplied.
