import { z } from "zod";

/**
 * Escapes regex special characters to prevent ReDoS / Regex Injection.
 */
export function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

/**
 * Zod schema for public listing search query parameters
 */
export const listingQuerySchema = z.object({
  type: z.enum(["PROPERTY", "SERVICE"]).optional(),
  cityCode: z.string().trim().optional(),
  locality: z.string().trim().max(100).optional(),
  search: z.string().trim().max(150).optional(),

  // Property filters
  purpose: z.enum(["FOR_RENT", "FOR_SALE", "PG_CO_LIVING"]).optional(),
  propertyType: z.string().trim().optional(), // Can be single or comma-separated e.g. "APARTMENT,VILLA"
  bedrooms: z.string().trim().optional(), // Can be single or comma-separated e.g. "1,2,3"
  furnishing: z.enum(["UNFURNISHED", "SEMI_FURNISHED", "FULLY_FURNISHED"]).optional(),

  // Service filters
  category: z
    .enum([
      "PLUMBING",
      "ELECTRICAL",
      "CARPENTRY",
      "CLEANING",
      "PAINTING",
      "APPLIANCE_REPAIR",
      "PEST_CONTROL",
      "MOVERS_PACKERS",
      "OTHER",
    ])
    .optional(),
  pricingModel: z.enum(["FIXED", "HOURLY", "QUOTE_BASED"]).optional(),

  // Pricing range
  minPrice: z.coerce.number().min(0).max(1000000000).optional(),
  maxPrice: z.coerce.number().min(0).max(1000000000).optional(),

  // Pagination & Sorting
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  sortBy: z.enum(["createdAt", "price", "title"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type ListingQueryInput = z.infer<typeof listingQuerySchema>;

/**
 * Zod schema for contact reveal request
 */
export const contactRevealSchema = z.object({
  listingId: z.string().trim().min(1, "Listing ID is required"),
});

export type ContactRevealInput = z.infer<typeof contactRevealSchema>;

/**
 * Zod schema for listing photos
 */
export const listingPhotoSchema = z.object({
  id: z.string().trim().min(1, "Photo ID is required"),
  url: z.string().trim().min(1, "Photo URL is required"),
  key: z.string().trim().min(1, "Storage key is required"),
  isPrimary: z.boolean().default(false),
  caption: z.string().trim().max(200).optional().nullable(),
});

export type ListingPhotoInput = z.infer<typeof listingPhotoSchema>;

/**
 * Zod schema for location information
 */
export const listingLocationSchema = z.object({
  city: z.string().trim().min(2, "City name must be at least 2 characters").max(100),
  cityCode: z.string().trim().min(2).max(20).toUpperCase().default("METRO"),
  locality: z.string().trim().min(2, "Locality must be at least 2 characters").max(100),
  streetAddress: z.string().trim().max(250).optional().nullable(),
  geo: z
    .object({
      type: z.literal("Point").default("Point"),
      coordinates: z.tuple([z.number(), z.number()]).default([0, 0]),
    })
    .optional(),
});

export type ListingLocationInput = z.infer<typeof listingLocationSchema>;

/**
 * Zod schema for contact preferences
 */
export const contactPreferencesSchema = z.object({
  phone: z.string().trim().max(30).optional().nullable(),
  whatsapp: z.string().trim().max(30).optional().nullable(),
  showPhone: z.boolean().default(true),
  showWhatsapp: z.boolean().default(true),
});

export type ContactPreferencesInput = z.infer<typeof contactPreferencesSchema>;

/**
 * Zod schema for Property details
 */
export const propertyDetailsSchema = z.object({
  purpose: z.enum(["FOR_RENT", "FOR_SALE", "PG_CO_LIVING"], {
    message: "Purpose must be FOR_RENT, FOR_SALE, or PG_CO_LIVING",
  }),
  propertyType: z.enum(
    ["APARTMENT", "INDEPENDENT_HOUSE", "VILLA", "PLOT", "COMMERCIAL"],
    {
      message: "Property type must be APARTMENT, INDEPENDENT_HOUSE, VILLA, PLOT, or COMMERCIAL",
    }
  ),
  price: z.coerce.number().min(1, "Price/Rent must be at least 1").max(1000000000, "Price exceeds platform limit"),
  securityDeposit: z.preprocess(
    (v) => (v === null || v === "" ? undefined : v),
    z.coerce.number().min(0).max(1000000000).optional()
  ),
  maintenanceFee: z.preprocess(
    (v) => (v === null || v === "" ? undefined : v),
    z.coerce.number().min(0).max(10000000).optional()
  ),
  bedrooms: z.preprocess(
    (v) => (v === null || v === "" ? undefined : v),
    z.coerce.number().int().min(0).max(20).optional()
  ),
  bathrooms: z.preprocess(
    (v) => (v === null || v === "" ? undefined : v),
    z.coerce.number().int().min(0).max(20).optional()
  ),
  balconies: z.preprocess(
    (v) => (v === null || v === "" ? undefined : v),
    z.coerce.number().int().min(0).max(10).optional()
  ),
  carpetArea: z.coerce.number().min(1, "Carpet area is required and must be positive"),
  superArea: z.preprocess(
    (v) => (v === null || v === "" ? undefined : v),
    z.coerce.number().min(1).optional()
  ),
  furnishing: z.enum(["UNFURNISHED", "SEMI_FURNISHED", "FULLY_FURNISHED"], {
    message: "Furnishing must be UNFURNISHED, SEMI_FURNISHED, or FULLY_FURNISHED",
  }),
  floorNumber: z.preprocess(
    (v) => (v === null || v === "" ? undefined : v),
    z.coerce.number().int().min(-2).max(150).optional()
  ),
  totalFloors: z.preprocess(
    (v) => (v === null || v === "" ? undefined : v),
    z.coerce.number().int().min(1).max(150).optional()
  ),
  amenities: z.array(z.string()).default([]),
  availableFrom: z.string().or(z.date()).optional().nullable(),
  preferredTenants: z.preprocess(
    (v) => (v === null || v === "" ? undefined : v),
    z.enum(["ANY", "FAMILY", "BACHELORS_MEN", "BACHELORS_WOMEN", "COMPANY_LEASE"]).optional()
  ),
});

export type PropertyDetailsInput = z.infer<typeof propertyDetailsSchema>;

/**
 * Zod schema for Creating a Property Listing
 */
export const createPropertyListingSchema = z.object({
  type: z.literal("PROPERTY").default("PROPERTY"),
  status: z.enum(["DRAFT", "PENDING_REVIEW"]).default("PENDING_REVIEW"),
  title: z
    .string()
    .trim()
    .min(5, "Title must be at least 5 characters")
    .max(140, "Title cannot exceed 140 characters"),
  description: z
    .string()
    .trim()
    .min(20, "Description must be at least 20 characters")
    .max(4000, "Description cannot exceed 4000 characters"),
  location: listingLocationSchema,
  contactPreferences: contactPreferencesSchema.default({
    showPhone: true,
    showWhatsapp: true,
  }),
  photos: z.array(listingPhotoSchema).max(12, "Maximum 12 photos allowed").default([]),
  propertyDetails: propertyDetailsSchema,
});

export type CreatePropertyListingInput = z.infer<typeof createPropertyListingSchema>;

/**
 * Zod schema for Updating a Property Listing
 */
export const updatePropertyListingSchema = z.object({
  status: z.enum(["DRAFT", "PENDING_REVIEW", "PAUSED", "APPROVED", "ARCHIVED"]).optional(),
  title: z
    .string()
    .trim()
    .min(5, "Title must be at least 5 characters")
    .max(140, "Title cannot exceed 140 characters")
    .optional(),
  description: z
    .string()
    .trim()
    .min(20, "Description must be at least 20 characters")
    .max(4000, "Description cannot exceed 4000 characters")
    .optional(),
  location: listingLocationSchema.optional(),
  contactPreferences: contactPreferencesSchema.optional(),
  photos: z.array(listingPhotoSchema).max(12, "Maximum 12 photos allowed").optional(),
  propertyDetails: propertyDetailsSchema.optional(),
});

export type UpdatePropertyListingInput = z.infer<typeof updatePropertyListingSchema>;

/**
 * Zod schema for status transitions
 */
export const listingStatusTransitionSchema = z.object({
  status: z.enum(["DRAFT", "PENDING_REVIEW", "PAUSED", "APPROVED", "REJECTED", "ARCHIVED"]),
  rejectionReason: z.string().trim().max(500).optional(),
});

export type ListingStatusTransitionInput = z.infer<typeof listingStatusTransitionSchema>;

