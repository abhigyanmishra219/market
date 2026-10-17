# Public Property & Local Services Marketplace

A unified public marketplace web application built with **Next.js App Router**, **TypeScript**, **Tailwind CSS v4**, and **MongoDB Atlas** with Mongoose.

## 1. Project Overview

The marketplace provides equal prominence to two discovery verticals:
- **Properties**: Apartments, independent villas, PG/co-living, and commercial spaces available for rent or purchase.
- **Local Services**: Skilled trade craft (plumbing, electrical, carpentry, deep cleaning, painting) and appointment booking requests.

Key product decisions:
- **Public Discovery**: Browse listings and explore details without mandatory login.
- **Direct Contact**: Direct phone and WhatsApp deep links; zero in-app chat clutter.
- **Admin Moderation**: Every newly submitted listing begins in `PENDING_REVIEW` and requires approval before public indexing.
- **Single-City Launch**: Configured for an initial launch city, with an extensible schema for multi-city expansion.
- **Unified Single-Account Model**: One account browses, lists properties, lists services, and requests service bookings.

---

## 2. Approved Design System & Colors

The user interface adheres to a clean, minimal, high-contrast visual style:

| Palette Token | Hex Code | Semantic Role |
| :--- | :--- | :--- |
| **Forest Green** | `#214A3B` | Primary brand color, headers, primary buttons, active highlights. |
| **Light Green** | `#E4EDE6` | Soft accent, property category badges, subtle highlights. |
| **Light Purple** | `#EAE7F5` | Secondary accent, service category badges (visual differentiation). |
| **Off-White** | `#F5F7F4` | Canvas background, card panels, alternating rows. |
| **Dark Text** | `#202923` | High-contrast body typography and page headings. |
| **Muted Text** | `#68736C` | Subtitles, input placeholders, timestamps, breadcrumbs. |

---

## 3. Technology Stack

- **Framework**: [Next.js](https://nextjs.org) 16 (React 19) App Router
- **Language**: [TypeScript](https://www.typescriptlang.org) 5 (Strict Mode)
- **Styling**: [Tailwind CSS](https://tailwindcss.com) v4 + PostCSS
- **Database & ODM**: [MongoDB Atlas](https://www.mongodb.com/atlas) + [Mongoose](https://mongoosejs.com) 8/9
- **Authentication**: [Auth.js](https://authjs.dev) (NextAuth v5 beta) + Google OAuth provider
- **Adapter & Session Model**: `@auth/mongodb-adapter` using MongoDB-backed database sessions (`sessions` collection)
- **Validation**: [Zod](https://zod.dev) 3/4
- **Icons**: [Lucide React](https://lucide.dev)

---

## 4. Local Development Setup

### Prerequisites
- [Node.js](https://nodejs.org) >= 20.x
- [npm](https://www.npmjs.com) >= 10.x
- A MongoDB Atlas cluster URI or local MongoDB instance

### 1. Clone & Install Dependencies
```bash
git clone <repo-url>
cd webapp
npm install
```

### 2. Configure Environment Variables
Copy the example environment template:
```bash
cp .env.example .env.local
```
Update `.env.local` with your configuration:
```ini
# Database Connection (MongoDB Atlas)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/marketplace?retryWrites=true&w=majority

# Launch City Configuration
NEXT_PUBLIC_LAUNCH_CITY_NAME="Metropolis"
NEXT_PUBLIC_LAUNCH_CITY_CODE="METRO"

# Authentication (Auth.js v5)
AUTH_SECRET=your_auth_secret_minimum_32_characters_random
AUTH_URL=http://localhost:3000/api/auth

# Google OAuth Credentials (Google Cloud Console)
AUTH_GOOGLE_ID=your_google_oauth_client_id.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=your_google_oauth_client_secret
```

### 3. Google Cloud Console OAuth Setup
To enable real Google sign-in:
1. Visit the [Google Cloud Console Credentials Page](https://console.cloud.google.com/apis/credentials).
2. Create or select a project, then configure the **OAuth consent screen** (User Type: External, Scopes: `email`, `profile`, `openid`).
3. Click **Create Credentials** -> **OAuth client ID** -> Application type: **Web application**.
4. Set **Authorized JavaScript origins**:
   - `http://localhost:3000`
5. Set **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google`
   *(When deploying to production, add your production domain: `https://yourdomain.com/api/auth/callback/google`)*
6. Copy the generated Client ID and Client Secret into `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` inside `.env.local`.

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Verification Commands & Tests
- **API Health Check**: [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health) (reports server status and MongoDB connectivity)
- **Run W2 Automated Test Suite**:
  ```bash
  npx tsx --conditions=import tests/auth-w2.test.mts
  ```
- **Type Checking**:
  ```bash
  npx tsc --noEmit
  ```
- **Linting**:
  ```bash
  npm run lint
  ```
- **Production Build**:
  ```bash
  npm run build
  ```

---

## 5. Authentication & Authorization Architecture

### Database-Backed Sessions
Web sessions are stored in the MongoDB `sessions` collection via `@auth/mongodb-adapter`. This enables instant server-side session revocation when a user logs out, deletes their account, or is suspended by an administrator.

### Role-Based Access Control (RBAC)
- Roles: `USER` (default for all new accounts) and `ADMIN` (platform staff).
- Security Rule: OAuth returns identity only; permissions are never accepted from client input or OAuth tokens. Role elevation is strictly prohibited via server-side Zod validation stripping.
- Route Protection:
  - Edge Proxy (`src/proxy.ts` adhering to Next.js 16 conventions) intercepts `/dashboard/*`, `/account/*`, and `/admin/*`.
  - Defense-in-depth Server Component guards (`requirePageAuth` and `requirePageAdmin`) enforce authentication before data rendering.
  - Route Handlers enforce `requireAuth()` and `requireAdmin()`.

---

## 6. Directory Structure

```
webapp/
├── docs/                               # Phase W0 Specification & Architecture Documentation
│   ├── README.md                       # Master documentation index
│   ├── product-requirements.md         # Deliverable A: PRD
│   ├── sitemap-and-user-flows.md       # Deliverable B: Information Architecture & Flows
│   ├── technical-architecture.md       # Deliverable C: Engineering Specifications
│   ├── database-schema.md              # Deliverable D: Mongoose Data Models
│   ├── api-contracts.md                # Deliverable E: REST API Contracts
│   ├── authentication-and-authorization.md # Deliverable F: Auth.js & Security
│   ├── security-and-privacy.md         # Deliverable G: Security Protocols
│   └── development-roadmap.md          # Deliverable H: Roadmap W0-W9
├── public/                             # Static assets (favicons, logos)
├── src/
│   ├── app/                            # App Router routes and pages
│   │   ├── (auth)/auth/signin/page.tsx # Sign-in page (Continue with Google)
│   │   ├── account/profile/page.tsx    # Protected Account Profile & Preferences page
│   │   ├── admin/page.tsx              # Protected Admin Moderation Console
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts # NextAuth v5 Route Handler
│   │   │   └── v1/
│   │   │       ├── health/route.ts     # Health check Route Handler
│   │   │       └── users/me/route.ts   # Profile retrieval & update API
│   │   ├── dashboard/page.tsx          # Protected User Activity Hub
│   │   ├── error.tsx                   # Client error boundary
│   │   ├── globals.css                 # Tailwind v4 configuration & tokens
│   │   ├── layout.tsx                  # Root layout shell with Inter font & AuthProvider
│   │   ├── loading.tsx                 # Loading skeleton screen
│   │   ├── not-found.tsx               # Accessible 404 page
│   │   └── page.tsx                    # Public homepage scaffolding
│   ├── components/                     # Reusable UI component library
│   │   ├── account/
│   │   │   └── ProfileForm.tsx         # Account profile form Client Component
│   │   ├── layout/
│   │   │   ├── Header.tsx              # Responsive navigation header with UserNav
│   │   │   ├── Footer.tsx              # Responsive footer
│   │   │   └── UserNav.tsx             # Dynamic user avatar & account dropdown
│   │   ├── listings/
│   │   │   ├── PropertyCard.tsx        # Property card component
│   │   ├── home/
│   │   │   └── HomeSearchHero.tsx      # Dual-vertical search hero with tabbed routing
│   │   ├── layout/
│   │   │   ├── Header.tsx              # Global navigation header with city badge & UserNav
│   │   │   ├── Footer.tsx              # Global footer with trust & directory links
│   │   │   └── UserNav.tsx             # Interactive avatar menu & Google sign-in CTA
│   │   ├── listings/
│   │   │   ├── PropertyCard.tsx        # Property card with detail links & contact reveal
│   │   │   ├── PropertyDetailClient.tsx # Client contact reveal & sharing actions
│   │   │   ├── ServiceCard.tsx         # Service card with detail links & call action
│   │   │   └── ServiceDetailClient.tsx # Service booking notice & contact reveal
│   │   ├── properties/
│   │   │   └── PropertyFilters.tsx     # Synchronized faceted property filters & chips
│   │   ├── services/
│   │   │   └── ServiceFilters.tsx      # Synchronized faceted service filters & chips
│   │   ├── providers/
│   │   │   └── AuthProvider.tsx        # SessionProvider wrapper
│   │   └── ui/
│   │       ├── Badge.tsx               # Reusable Badge (property/service/neutral)
│   │       ├── Button.tsx              # Reusable Button (primary/secondary/service)
│   │       ├── Card.tsx                # Reusable Card container components
│   │       ├── Dialog.tsx              # Accessible modal dialog
│   │       ├── FormField.tsx           # Form input wrapper with error display
│   │       ├── Input.tsx               # Text input with icon support
│   │       └── Skeleton.tsx            # Animated loading placeholder
│   ├── lib/
│   │   ├── api-response.ts             # Standardized API response helpers
│   │   ├── auth.ts                     # Auth.js configuration with MongoDBAdapter
│   │   ├── auth-guards.ts              # Server-side auth & RBAC guards (requireAuth, requireAdmin)
│   │   ├── db.ts                       # Mongoose connection singleton with caching
│   │   ├── errors.ts                   # Standardized application error classes
│   │   ├── listings-data.ts            # Server Component direct data access with status isolation
│   │   ├── rate-limiter.ts             # Anti-scraping sliding-window rate limiter
│   │   ├── utils.ts                    # Utility helpers (cn, formatCurrency)
│   │   └── validations/
│   │       ├── listing.ts              # Zod listing search schemas & regex escaping
│   │       └── user.ts                 # Zod profile update schema (privilege-safe)
│   ├── models/
│   │   ├── Listing.ts                  # Polymorphic Mongoose Listing model conforming to W0
│   │   └── User.ts                     # Mongoose User model conforming to Auth.js & W0
│   ├── proxy.ts                        # Next.js 16 Proxy convention for route interception
│   └── types/
│       ├── api.ts                      # API response interfaces
│       ├── listing.ts                  # Listing domain interfaces
│       └── next-auth.d.ts              # NextAuth session & user type extensions
├── tests/
│   ├── auth-w2.test.mts                # Automated test suite for W2 auth & security
│   └── discovery-w3.test.mts           # Automated test suite for W3 discovery & search
├── .env.example                        # Template environment variables with OAuth instructions
├── .gitignore                          # Git exclusions (allowing .env.example)
├── package.json                        # Dependencies and scripts
├── postcss.config.mjs                  # PostCSS with @tailwindcss/postcss
└── tsconfig.json                       # Strict TypeScript compiler options
```

---

## 7. Implementation Roadmap

- [x] **W0**: Product Specification and Technical Architecture (Completed)
- [x] **W1**: Next.js Foundation and Design System (Completed)
- [x] **W2**: Google Authentication and User Accounts (Completed)
- [x] **W3**: Public Discovery, Search & Listing Details (Completed)
- [ ] **W4**: Property Module (Listing creation, photo management, review workflows)
- [ ] **W5**: Services Module (Provider onboarding, portfolio management)
- [ ] **W6**: Booking Requests and Direct Contact Flows
- [ ] **W7**: User Dashboard and Activity
- [ ] **W8**: Admin Panel and Moderation
- [ ] **W9**: Testing, Security Hardening, and Production Deployment

#   m a r k e t  
 