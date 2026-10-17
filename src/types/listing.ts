/**
 * Listing Domain Types conforming to W0 Schema Specification.
 */

export type ListingType = "PROPERTY" | "SERVICE";

export type ListingStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "PAUSED"
  | "ARCHIVED";

export type PropertyPurpose = "FOR_RENT" | "FOR_SALE" | "PG_CO_LIVING";

export type PropertyClassification =
  | "APARTMENT"
  | "INDEPENDENT_HOUSE"
  | "VILLA"
  | "PLOT"
  | "COMMERCIAL";

export type FurnishingStatus = "UNFURNISHED" | "SEMI_FURNISHED" | "FULLY_FURNISHED";

export type ServiceCategory =
  | "PLUMBING"
  | "ELECTRICAL"
  | "CARPENTRY"
  | "CLEANING"
  | "PAINTING"
  | "APPLIANCE_REPAIR"
  | "PEST_CONTROL"
  | "MOVERS_PACKERS"
  | "OTHER";

export type ServicePricingModel = "FIXED" | "HOURLY" | "QUOTE_BASED";

export interface GeoLocation {
  city: string;
  cityCode: string;
  locality: string;
  streetAddress?: string | null;
  geo?: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
}

export interface ContactPreferences {
  phone?: string | null;
  whatsapp?: string | null;
  showPhone: boolean;
  showWhatsapp: boolean;
}

export interface ListingPhoto {
  id: string;
  url: string;
  key: string;
  isPrimary: boolean;
  caption?: string | null;
}

export type ListingPhotoInput = ListingPhoto;

export interface PropertyDetails {
  purpose: PropertyPurpose;
  propertyType: PropertyClassification;
  price: number;
  securityDeposit?: number;
  maintenanceFee?: number;
  bedrooms?: number;
  bathrooms?: number;
  balconies?: number;
  carpetArea: number;
  superArea?: number;
  furnishing: FurnishingStatus;
  floorNumber?: number;
  totalFloors?: number;
  amenities: string[];
  availableFrom: string | Date;
  preferredTenants?: "ANY" | "FAMILY" | "BACHELORS_MEN" | "BACHELORS_WOMEN" | "COMPANY_LEASE";
}

export interface ServiceDetails {
  category: ServiceCategory;
  pricingModel: ServicePricingModel;
  startingPrice?: number;
  experienceYears: number;
  serviceAreas: string[];
  workingDays: string[];
  workingHours?: {
    start: string;
    end: string;
  };
  guarantees?: string;
}

export interface ListingSummary {
  id: string;
  type: ListingType;
  status: ListingStatus;
  title: string;
  slug: string;
  description: string;
  location: GeoLocation;
  contactPreferences: ContactPreferences;
  photos: ListingPhoto[];
  propertyDetails?: PropertyDetails;
  serviceDetails?: ServiceDetails;
  providerName?: string;
  providerAvatar?: string;
  createdAt: string | Date;
}
