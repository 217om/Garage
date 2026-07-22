# Garaje — Garage reviews for Oman 🔧🇴🇲

A mobile web app (Expo + React Native, Expo Router) for discovering and reviewing car
garages across Oman. The goal: replace "word of mouth" with a searchable, trustworthy
directory of garages, complete with an **in-app rating & review system** alongside
ratings sourced from Google Maps.

> **Status:** MVP running against a **local mock data layer** (seed data + on-device
> persistence). There is no backend yet — everything persists to the device via
> AsyncStorage (localStorage on web). The data layer is isolated so it can be swapped
> for a real backend (e.g. Supabase) later.

## Features

- **Browse-free directory** — an eBay-style scrollable list of garages; no account
  needed to browse. Search by name, area or service; filter to verified only.
- **Explore** — filter garages by service (oil change, engine, AC, tyres…) and region.
- **Garage detail** — location, phone, hours, services, and **two clearly separated
  rating sources**:
  - **App rating** — reviews written by users inside this app.
  - **Google** — rating and reviews sourced from Google Maps, always labelled
    *"Sourced from Google — not written in this app."*
- **Verified badges** — garages are Verified or Unverified. Only app admins can verify.
- **Roles** — on sign-up a user chooses **Driver** or **Garage owner**. Browsing is
  free; signing in is required only to write a review or manage a garage.
- **Owner applications** — a garage owner submits an application to claim their garage.
- **Admin dashboard** — admins review pending applications and **approve → verify** the
  garage (which also assigns the applicant as its owner) or reject them.

## Run it

```bash
npm install
npx expo start --web     # open http://localhost:8081
# or: npx expo start     # then press w (web), a (Android), i (iOS)
```

### Demo shortcuts

- **Sign in as Admin:** on the login screen tap **"Continue as Admin (demo)"** to reach
  the verification dashboard.
- **Reset demo data:** Account tab → **Reset demo data** restores the seed garages and
  clears all local reviews/applications/session.

## Project structure

```
src/
├── app/                     # Expo Router routes (file-based)
│   ├── _layout.tsx          # root Stack + AppProvider + theme
│   ├── (tabs)/              # bottom tabs: Garages / Explore / Account
│   │   ├── index.tsx        # garage list (search + verified filter)
│   │   ├── explore.tsx      # filter by service + region
│   │   └── profile.tsx      # account, roles, owner status, admin entry
│   ├── garage/[id].tsx      # garage detail (app vs Google reviews)
│   ├── review/[id].tsx      # write an app review (modal)
│   ├── login.tsx            # sign in / sign up with role choice (modal)
│   ├── apply.tsx            # owner: claim a garage (modal)
│   └── admin.tsx            # admin: verification requests
├── components/              # StarRating, VerifiedBadge, GarageCard, Button, Chip, themed-*
├── constants/theme.ts       # colors (light/dark), spacing, fonts
├── data/seed.ts             # mock Oman garages + Google-sourced reviews
├── store/app-context.tsx    # single source of truth (auth, reviews, applications)
├── lib/storage.ts           # AsyncStorage persistence
├── lib/util.ts              # thumbnail colour + initials helpers
└── types.ts                 # domain types
```

## Where the "real data" plugs in later

Everything the app reads/writes goes through `src/store/app-context.tsx`, which today is
backed by `src/data/seed.ts` and `src/lib/storage.ts`. To go live you would:

1. Replace the persistence in `store/app-context.tsx` with API/Supabase calls.
2. Source `googleRating` / `googleReviews` from a **compliant** provider.
   ⚠️ Scraping Google Maps violates Google's Terms of Service, and the Google Places API
   restricts how long most fields may be cached (`place_id` may be stored long-term;
   review/detail fields must generally be refreshed). Decide this before launch.
3. Add real authentication (the current auth is a local mock with no passwords).
