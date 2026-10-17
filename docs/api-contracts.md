# REST API Contracts & Endpoint Specifications

## Document Information
- **Document Title**: Versioned REST API Contract (`/api/v1/`)
- **Phase**: W0 — Architecture & Product Specification
- **Version**: 1.0.0
- **Status**: Approved Baseline
- **Base URI**: `/api/v1`
- **Auth Routes**: `/api/auth/[...nextauth]`

---

## 1. Global API Conventions

### 1.1 Headers
- `Content-Type`: `application/json` (Required for POST, PUT, PATCH)
- `Accept`: `application/json`
- `Cookie`: Transmits the secure Auth.js database session token (`authjs.session-token` or `__Secure-authjs.session-token`).

### 1.2 Global Pagination & Query Parameters
Standard listing and search endpoints support:
- `page`: Integer >= 1 (Default: `1`)
- `limit`: Integer between 1 and 50 (Default: `20`)
- `sortBy`: String field name (e.g. `'createdAt'`, `'price'`, `'rating'`)
- `sortOrder`: `'asc'` | `'desc'` (Default: `'desc'`)

### 1.3 Uniform Response Envelopes
Every response from `/api/v1/` adheres to a standard envelope.

#### Success Response (200 / 201)
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "totalCount": 85,
    "totalPages": 5
  }
}
```

#### Error Response (4xx / 5xx)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Human-readable summary of the error.",
    "details": [
      { "field": "price", "message": "Price must be a positive integer" }
    ]
  }
}
```

---

## 2. Authentication Endpoints (Auth.js v5)

| HTTP Method | Route | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET/POST` | `/api/auth/[...nextauth]` | Handles Auth.js Google OAuth dance, session retrieval, and CSRF token management. | Public |
| `GET` | `/api/auth/session` | Returns the current active session user or `null`. | Public |
| `POST` | `/api/auth/signout` | Invalidates the active MongoDB database session and clears cookies. | Authenticated |

---

## 3. User Endpoints (`/api/v1/users`)

### 3.1 `GET /api/v1/users/me`
- **Purpose**: Retrieve current authenticated user's profile, contact details, and role.
- **Auth**: Authenticated User.
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "653b1f9c0e2a1b001a9f1111",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "image": "https://lh3.googleusercontent.com/...",
    "role": "USER",
    "phone": "+919876543210",
    "whatsapp": "+919876543210",
    "contactPreferences": {
      "showPhone": true,
      "showWhatsapp": true
    },
    "createdAt": "2026-10-15T10:00:00.000Z"
  }
}
```

### 3.2 `PATCH /api/v1/users/me`
- **Purpose**: Update user's profile, phone numbers, or default contact preferences.
- **Auth**: Authenticated User (Own profile).
- **Request Body (Zod Validated)**:
```json
{
  "name": "Jane Doe",
  "phone": "+919876543210",
  "whatsapp": "+919876543210",
  "contactPreferences": {
    "showPhone": true,
    "showWhatsapp": true
  }
}
```
- **Response (200 OK)**: Updated user object.
- **Errors**: `400 Bad Request`, `401 Unauthenticated`, `422 Validation Error`.

### 3.3 `DELETE /api/v1/users/me`
- **Purpose**: Soft delete account, archive active listings, invalidate all active sessions.
- **Auth**: Authenticated User.
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": { "message": "Account scheduled for deletion and sessions invalidated." }
}
```

---

## 4. Media Upload Endpoints (`/api/v1/uploads`)

### 4.1 `POST /api/v1/uploads/presigned-url`
- **Purpose**: Generates a pre-signed S3 / Cloudflare R2 upload URL for direct, secure binary upload from the browser.
- **Auth**: Authenticated User.
- **Request Body**:
```json
{
  "fileName": "apartment-living-room.jpg",
  "fileType": "image/jpeg",
  "fileSize": 2105400,
  "purpose": "listing"
}
```
- **Validation**:
  - `fileType`: Must be one of `['image/jpeg', 'image/png', 'image/webp']`.
  - `fileSize`: Must be <= 5,242,880 bytes (5MB).
  - `purpose`: `['listing', 'profile', 'review']`.
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://marketplace-bucket.s3.region.amazonaws.com/listings/653b1...-photo.jpg?AWSAccessKeyId=...",
    "fileKey": "listings/653b1...-photo.jpg",
    "publicUrl": "https://media.marketplace.com/listings/653b1...-photo.jpg",
    "expiresInSeconds": 900
  }
}
```

---

## 5. Listing Endpoints (`/api/v1/listings`)

### 5.1 `GET /api/v1/listings`
- **Purpose**: Search and filter public listings (`status === 'APPROVED'`).
- **Auth**: Public (No auth required).
- **Query Parameters**:
  - `type`: Optional enum `PROPERTY` | `SERVICE`.
  - `cityCode`: Optional string (defaults to active launch city).
  - `locality`: Optional string keyword.
  - `search`: Full-text search term.
  - *Property Specific*:
    - `purpose`: `FOR_RENT` | `FOR_SALE` | `PG_CO_LIVING`.
    - `propertyType`: Comma-separated (e.g. `APARTMENT,VILLA`).
    - `minPrice`, `maxPrice`: Numbers.
    - `bedrooms`: Comma-separated numbers (e.g. `1,2,3`).
    - `furnishing`: `UNFURNISHED` | `SEMI_FURNISHED` | `FULLY_FURNISHED`.
  - *Service Specific*:
    - `category`: Service category enum.
    - `pricingModel`: `FIXED` | `HOURLY` | `QUOTE_BASED`.
    - `minPrice`, `maxPrice`: Numbers.
  - `page`, `limit`, `sortBy`, `sortOrder`.
- **Response (200 OK)**: Array of listing summary cards with pagination metadata.

### 5.2 `GET /api/v1/listings/:idOrSlug`
- **Purpose**: Retrieve full details of a specific listing.
- **Auth**: Public (Returns full details if `APPROVED`; returns full details to listing owner or admin regardless of status; returns 404 to guests if not `APPROVED`).
- **Response (200 OK)**: Full listing document.

### 5.3 `POST /api/v1/listings`
- **Purpose**: Create a new listing (Property or Service). Initial status is always `PENDING_REVIEW` (or `DRAFT` if requested).
- **Auth**: Authenticated User.
- **Request Body (Property Example)**:
```json
{
  "type": "PROPERTY",
  "status": "PENDING_REVIEW",
  "title": "Spacious 2BHK Apartment in Greenwood Valley",
  "description": "Bright and airy second floor apartment with balcony...",
  "location": {
    "city": "Metropolis",
    "cityCode": "METRO",
    "locality": "Greenwood Valley",
    "streetAddress": "Flat 204, Green Heights",
    "geo": { "type": "Point", "coordinates": [77.5946, 12.9716] }
  },
  "contactPreferences": {
    "phone": "+919876543210",
    "whatsapp": "+919876543210",
    "showPhone": true,
    "showWhatsapp": true
  },
  "photos": [
    {
      "id": "uuid-1",
      "url": "https://media.marketplace.com/listings/photo1.webp",
      "key": "listings/photo1.webp",
      "isPrimary": true
    }
  ],
  "propertyDetails": {
    "purpose": "FOR_RENT",
    "propertyType": "APARTMENT",
    "price": 25000,
    "securityDeposit": 50000,
    "maintenanceFee": 2000,
    "bedrooms": 2,
    "bathrooms": 2,
    "balconies": 1,
    "carpetArea": 1150,
    "furnishing": "SEMI_FURNISHED",
    "floorNumber": 2,
    "totalFloors": 5,
    "amenities": ["LIFT", "POWER_BACKUP", "PARKING"],
    "availableFrom": "2026-11-01T00:00:00.000Z",
    "preferredTenants": "FAMILY"
  }
}
```
- **Response (201 Created)**: Created listing document with assigned `_id`, generated `slug`, and status `PENDING_REVIEW`.

### 5.4 `PATCH /api/v1/listings/:id`
- **Purpose**: Update an existing listing.
- **Auth**: Authenticated Owner or Admin.
- **Business Rule**: Edits to critical fields (price change > 50%, property type, photos, address) automatically transition status from `APPROVED` back to `PENDING_REVIEW`.
- **Response (200 OK)**: Updated listing.
- **Errors**: `403 Forbidden` (if not owner/admin), `404 Not Found`.

### 5.5 `PATCH /api/v1/listings/:id/status`
- **Purpose**: Fast status toggle by owner (Pause / Resume / Archive).
- **Auth**: Authenticated Owner or Admin.
- **Request Body**:
```json
{
  "status": "PAUSED"
}
```
- **Allowed Values for Owner**: `['PAUSED', 'APPROVED', 'ARCHIVED']` (Can only resume to `APPROVED` if it was previously approved).

### 5.6 `POST /api/v1/listings/:id/contact-reveal`
- **Purpose**: Unmasks owner's verified phone/WhatsApp number and records metrics view.
- **Auth**: Public / Rate-Limited (Max 15 requests per hour per IP/User).
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "phone": "+919876543210",
    "whatsapp": "+919876543210",
    "whatsappDeepLink": "https://wa.me/919876543210?text=Hello%2C%20I%20am%20interested..."
  }
}
```
- **Errors**: `429 Too Many Requests` (Rate limit exceeded).

---

## 6. Booking Endpoints (`/api/v1/bookings`)

### 6.1 `POST /api/v1/bookings`
- **Purpose**: Submit a new service appointment booking request.
- **Auth**: Authenticated User (Customer).
- **Request Body**:
```json
{
  "listingId": "653b204e0e2a1b001a9f8888",
  "requestedDate": "2026-10-25T00:00:00.000Z",
  "timeSlot": "MORNING",
  "serviceAddress": {
    "line1": "Flat 301, Lakeview Residency",
    "locality": "Greenwood Valley"
  },
  "customerPhone": "+919876543210",
  "customerNotes": "Master bathroom faucet leaking and pipe clogged."
}
```
- **Validation**:
  - `requestedDate`: Future date within 30 days.
  - `listingId`: Must be an active, approved listing of type `SERVICE`.
  - Customer cannot book their own service.
- **Response (201 Created)**: Booking document with status `REQUESTED`.

### 6.2 `GET /api/v1/bookings`
- **Purpose**: Retrieve bookings for the authenticated user.
- **Auth**: Authenticated User.
- **Query Parameters**:
  - `role`: `'customer'` (default) | `'provider'`.
  - `status`: Optional status filter (`PENDING`, `ACCEPTED`, `ALTERNATIVE_PROPOSED`, `CANCELLED`, `COMPLETED`, `REJECTED`).
  - `page`, `limit`.
- **Response (200 OK)**: Paginated array of booking documents populated with counterpart user and listing summary.

### 6.3 `GET /api/v1/bookings/:id`
- **Purpose**: Retrieve a single booking detail by ID.
- **Auth**: Authenticated Customer, Provider, or Admin. (Enforces participant privacy boundary; returns 403 Forbidden to unrelated users).
- **Response (200 OK)**: Full populated booking document.

### 6.4 `PATCH /api/v1/bookings/:id/status`
- **Purpose**: Atomic state machine transitions with concurrency conflict prevention.
- **Auth**: Authenticated Customer, Provider, or Admin.
- **Supported Actions**:
  - `ACCEPT`: Provider accepts pending request.
  - `REJECT` (or `DECLINE`): Provider declines request with optional reason.
  - `PROPOSE_ALTERNATIVE` (or `RESCHEDULE`): Provider proposes future `proposedDate`, `proposedSlot`, and optional `note`.
  - `ACCEPT_ALTERNATIVE`: Customer accepts provider's proposed alternative time.
  - `DECLINE_ALTERNATIVE`: Customer declines provider's proposed alternative time.
  - `CANCEL`: Customer or Provider cancels appointment.
  - `COMPLETE`: Provider marks accepted appointment as completed.
- **Response (200 OK)**: Updated booking object.
- **Errors**: `403 Forbidden` (non-participant), `409 Conflict` (racing status update), `422 Unprocessable` (invalid state transition).

---

## 7. Saved Listings / Favorites Endpoints (`/api/v1/saved-listings`)

### 7.1 `GET /api/v1/saved-listings`
- **Purpose**: Retrieve all listings bookmarked by the authenticated user.
- **Auth**: Authenticated User.
- **Response (200 OK)**: Array of populated listing objects.

### 7.2 `POST /api/v1/saved-listings/toggle`
- **Purpose**: Idempotent toggle to add or remove a listing from user favorites.
- **Auth**: Authenticated User.
- **Request Body**:
```json
{
  "listingId": "653b204e0e2a1b001a9f8888"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "isSaved": true,
    "listingId": "653b204e0e2a1b001a9f8888"
  }
}
```

---

## 8. Review Endpoints (`/api/v1/reviews`)

### 8.1 `GET /api/v1/reviews`
- **Purpose**: Fetch public reviews for a listing.
- **Auth**: Public.
- **Query Parameters**: `listingId` (Required), `page`, `limit`.
- **Response (200 OK)**: Paginated reviews with author names and avatars.

### 8.2 `POST /api/v1/reviews`
- **Purpose**: Submit a rating and review for a service listing.
- **Auth**: Authenticated User.
- **Request Body**:
```json
{
  "listingId": "653b204e0e2a1b001a9f8888",
  "rating": 5,
  "comment": "Punctual, professional, and resolved the electrical short circuit within an hour."
}
```
- **Validation**:
  - `rating`: Integer between 1 and 5.
  - `comment`: 10 to 1000 characters.
  - One review per user per listing constraint.
- **Response (201 Created)**: Review object.

---

## 9. Report & Complaint Endpoints (`/api/v1/reports`)

### 9.1 `POST /api/v1/reports`
- **Purpose**: File a complaint against a fraudulent or inappropriate listing.
- **Auth**: Public (Optional auth attaches `reporterId`).
- **Request Body**:
```json
{
  "listingId": "653b204e0e2a1b001a9f8888",
  "reporterEmail": "user@example.com",
  "reason": "FAKE_PROPERTY",
  "details": "The owner is demanding an upfront advance deposit before allowing physical inspection."
}
```
- **Response (201 Created)**: Report acknowledgment.

---

## 10. Administrative Endpoints (`/api/v1/admin`)

*Strictly restricted to users with `role === 'ADMIN'`. Non-admin requests receive `403 Forbidden`.*

### 10.1 `GET /api/v1/admin/listings`
- **Purpose**: Fetch moderation queue.
- **Query Parameters**: `status` (default: `PENDING_REVIEW`), `type`, `page`, `limit`.
- **Response (200 OK)**: Paginated listings awaiting review.

### 10.2 `PATCH /api/v1/admin/listings/:id/moderate`
- **Purpose**: Approve or reject a listing.
- **Request Body (Approve)**:
```json
{
  "action": "APPROVE"
}
```
- **Request Body (Reject)**:
```json
{
  "action": "REJECT",
  "rejectionReason": "Price deviates significantly from market standards and images appear to be stock photos."
}
```
- **Response (200 OK)**: Updated listing; triggers automatic audit log entry.

### 10.3 `GET /api/v1/admin/users`
- **Purpose**: Search and inspect users.
- **Query Parameters**: `search`, `role`, `status`, `page`, `limit`.
- **Response (200 OK)**: Paginated user records.

### 10.4 `PATCH /api/v1/admin/users/:id/status`
- **Purpose**: Suspend or reactivate a user account.
- **Request Body**:
```json
{
  "status": "SUSPENDED",
  "reason": "Repeated fraudulent property submissions."
}
```
- **Response (200 OK)**: Updated user status; terminates all active user sessions immediately.

### 10.5 `GET /api/v1/admin/audit-logs`
- **Purpose**: Read immutable administrative action logs.
- **Query Parameters**: `adminUserId`, `action`, `page`, `limit`.
- **Response (200 OK)**: Paginated audit records.
