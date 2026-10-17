# W0 — Product Specification & Technical Architecture Documentation

## Document Index & Project Baseline

Welcome to the architectural and product documentation for the **Public Property & Local Services Marketplace** web application. 

This repository of specifications defines the functional, architectural, data, API, security, and design requirements completed during **Phase W0**. It serves as the single source of truth for engineering execution from Phase W1 through Phase W9.

---

## 1. Documentation Index

| Document | Primary Focus & Summary | Deliverable Tag |
| :--- | :--- | :---: |
| [**`product-requirements.md`**](file:///c:/Users/abhig/Desktop/app/webapp/docs/product-requirements.md) | Product goals, user personas, MVP scope, explicit exclusions, functional & non-functional requirements, acceptance criteria (Gherkin). | **Deliverable A** |
| [**`sitemap-and-user-flows.md`**](file:///c:/Users/abhig/Desktop/app/webapp/docs/sitemap-and-user-flows.md) | Complete navigation tree, page specifications (purpose, access, components, states), and 10 detailed user flow diagrams. | **Deliverable B** |
| [**`technical-architecture.md`**](file:///c:/Users/abhig/Desktop/app/webapp/docs/technical-architecture.md) | Modular monolith architecture, Next.js RSC vs Client Components, Mongoose singleton, S3/R2 direct uploads, folder topology. | **Deliverable C** |
| [**`database-schema.md`**](file:///c:/Users/abhig/Desktop/app/webapp/docs/database-schema.md) | MongoDB Atlas collection schemas, Mongoose models, polymorphic `listings` collection, indexes, state machines, and soft deletes. | **Deliverable D** |
| [**`api-contracts.md`**](file:///c:/Users/abhig/Desktop/app/webapp/docs/api-contracts.md) | Versioned REST API (`/api/v1/*`), request/response JSON schemas, Zod validation rules, HTTP status codes, pagination, rate limits. | **Deliverable E** |
| [**`authentication-and-authorization.md`**](file:///c:/Users/abhig/Desktop/app/webapp/docs/authentication-and-authorization.md) | Auth.js v5 Google OAuth setup, MongoDB database sessions, RBAC permissions matrix, zero-trust server-side authorization guards. | **Deliverable F** |
| [**`security-and-privacy.md`**](file:///c:/Users/abhig/Desktop/app/webapp/docs/security-and-privacy.md) | Threat modeling, contact anti-scraping protocol, private vs public address masking, file upload constraints, CSP & HTTP headers. | **Deliverable G** |
| [**`development-roadmap.md`**](file:///c:/Users/abhig/Desktop/app/webapp/docs/development-roadmap.md) | 10-milestone engineering schedule (W0 to W9) with scope, dependencies, deliverables, test requirements, and acceptance criteria. | **Deliverable H** |

---

## 2. Core Confirmed Decisions Summary

| Decision Area | Baseline Decision | Architectural Rationale |
| :--- | :--- | :--- |
| **Product Type** | Public Property & Local Services Marketplace | Both verticals share equal top-level platform priority. |
| **Core Architecture** | Modular Monolith (Next.js App Router) | Avoids premature distributed microservice overhead while maintaining clean domain boundaries. |
| **Styling Framework** | Tailwind CSS (Strict Approved Tokens) | Fast, utility-first styling adhering strictly to the approved design palette. |
| **Database & ODM** | MongoDB Atlas with Mongoose 8.x | Document flexibility for polymorphic listings; native `2dsphere` geospatial indexing for local discovery. |
| **Authentication** | Auth.js (NextAuth v5) + Google OAuth | Passwordless, trusted identity verification with frictionless Google sign-in. |
| **Session Model** | MongoDB-Backed Database Sessions | Immediate session revocation capability upon suspension or logout; no custom JWT web sessions. |
| **Listing Moderation** | Mandatory Pre-Publication Admin Review | All new listings start as `PENDING_REVIEW` and require administrator approval before appearing publicly. |
| **Contact Model** | Direct Phone Call & WhatsApp Only | Frictionless real-world communication; zero in-app chat sockets or message threads in MVP. |
| **Service Booking** | Requested -> Provider Confirmed | Structured appointment requests with date/time slot; provider accepts or reschedules. |
| **Media Handling** | S3 / Cloudflare R2 Presigned Direct Uploads | Zero binary blobs stored in MongoDB; files upload directly from client to cloud bucket. |
| **Launch Geography** | Single-city launch (extensible schema) | Normalized `location.cityCode` ensures multi-city expansion without schema migrations. |

---

## 3. Approved Design System Reference

The project adheres strictly to the approved visual color palette. No extraneous gradients, glassmorphism, or alternate primary colors may be introduced.

| Color Name | Hex Code | Visual Swatch Role | Approved Usage |
| :--- | :--- | :---: | :--- |
| **Forest Green** | `#214A3B` | Primary Brand | Headers, primary action buttons, active navigation states. |
| **Light Green** | `#E4EDE6` | Soft Accent | Property category badges, callout cards, active tab backgrounds. |
| **Light Purple** | `#EAE7F5` | Secondary Accent | Service category badges, service card highlights (visual differentiation). |
| **Off-White** | `#F5F7F4` | Canvas Surface | App background, card panels, table backgrounds, alternating rows. |
| **Dark Text** | `#202923` | High Contrast | Primary typography, page headings, high-importance labels. |
| **Muted Text** | `#68736C` | Low Contrast | Subtitles, input placeholders, timestamps, breadcrumbs. |

---

## 4. Phase W1 Readiness Checklist

- [x] All 8 W0 specification documents created and cross-verified.
- [x] Data models match API contracts and page component requirements.
- [x] Lifecycle state machines for Listings and Bookings fully defined.
- [x] Next.js project initialized with TypeScript and App Router.
- [ ] **W1 Next Step**: Configure Tailwind tokens (`#214A3B`, etc.), implement `src/lib/db.ts` Mongoose singleton, build atomic UI components, and lay out the global application shell.
