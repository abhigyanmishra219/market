import mongoose, { Schema, Document, Model } from "mongoose";
import {
  ListingType,
  ListingStatus,
  PropertyPurpose,
  PropertyClassification,
  FurnishingStatus,
  ServiceCategory,
  ServicePricingModel,
  ListingPhoto,
  GeoLocation,
  ContactPreferences,
} from "@/types/listing";

export interface IListingPropertyDetails {
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
  availableFrom: Date;
  preferredTenants?: "ANY" | "FAMILY" | "BACHELORS_MEN" | "BACHELORS_WOMEN" | "COMPANY_LEASE";
}

export interface IListingServiceDetails {
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

export interface IListingModeration {
  reviewedBy?: mongoose.Types.ObjectId | null;
  reviewedAt?: Date | null;
  rejectionReason?: string | null;
}

export interface IListingMetrics {
  views: number;
  contactReveals: number;
  savesCount: number;
}

export interface IListing extends Document {
  _id: mongoose.Types.ObjectId;
  type: ListingType;
  status: ListingStatus;
  title: string;
  slug: string;
  description: string;
  ownerId: mongoose.Types.ObjectId;
  location: GeoLocation;
  contactPreferences: ContactPreferences;
  photos: ListingPhoto[];
  propertyDetails?: IListingPropertyDetails;
  serviceDetails?: IListingServiceDetails;
  moderation: IListingModeration;
  metrics: IListingMetrics;
  createdAt: Date;
  updatedAt: Date;
}

const PhotoSchema = new Schema(
  {
    id: { type: String, required: true },
    url: { type: String, required: true },
    key: { type: String, required: true },
    isPrimary: { type: Boolean, default: false },
    caption: { type: String, default: null },
  },
  { _id: false }
);

const LocationSchema = new Schema(
  {
    city: { type: String, required: true, trim: true },
    cityCode: { type: String, required: true, uppercase: true, trim: true },
    locality: { type: String, required: true, trim: true },
    streetAddress: { type: String, default: null, trim: true },
    geo: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
  },
  { _id: false }
);

const ContactPreferencesSchema = new Schema(
  {
    phone: { type: String, default: null, trim: true },
    whatsapp: { type: String, default: null, trim: true },
    showPhone: { type: Boolean, default: true },
    showWhatsapp: { type: Boolean, default: true },
  },
  { _id: false }
);

const PropertyDetailsSchema = new Schema(
  {
    purpose: {
      type: String,
      enum: ["FOR_RENT", "FOR_SALE", "PG_CO_LIVING"],
      required: true,
    },
    propertyType: {
      type: String,
      enum: ["APARTMENT", "INDEPENDENT_HOUSE", "VILLA", "PLOT", "COMMERCIAL"],
      required: true,
    },
    price: { type: Number, required: true, min: 1 },
    securityDeposit: { type: Number, default: 0 },
    maintenanceFee: { type: Number, default: 0 },
    bedrooms: { type: Number, min: 0, max: 20 },
    bathrooms: { type: Number, min: 0, max: 20 },
    balconies: { type: Number, min: 0, max: 10 },
    carpetArea: { type: Number, required: true, min: 1 },
    superArea: { type: Number },
    furnishing: {
      type: String,
      enum: ["UNFURNISHED", "SEMI_FURNISHED", "FULLY_FURNISHED"],
      required: true,
    },
    floorNumber: { type: Number },
    totalFloors: { type: Number },
    amenities: { type: [String], default: [] },
    availableFrom: { type: Date, default: Date.now },
    preferredTenants: {
      type: String,
      enum: ["ANY", "FAMILY", "BACHELORS_MEN", "BACHELORS_WOMEN", "COMPANY_LEASE"],
      default: "ANY",
    },
  },
  { _id: false }
);

const ServiceDetailsSchema = new Schema(
  {
    category: {
      type: String,
      enum: [
        "PLUMBING",
        "ELECTRICAL",
        "CARPENTRY",
        "CLEANING",
        "PAINTING",
        "APPLIANCE_REPAIR",
        "PEST_CONTROL",
        "MOVERS_PACKERS",
        "OTHER",
      ],
      required: true,
    },
    pricingModel: {
      type: String,
      enum: ["FIXED", "HOURLY", "QUOTE_BASED"],
      required: true,
    },
    startingPrice: { type: Number, min: 0 },
    experienceYears: { type: Number, required: true, min: 0, max: 60 },
    serviceAreas: { type: [String], default: [] },
    workingDays: { type: [String], default: [] },
    workingHours: {
      start: { type: String, default: "08:00" },
      end: { type: String, default: "20:00" },
    },
    guarantees: { type: String, default: null, trim: true },
  },
  { _id: false }
);

const ModerationSchema = new Schema(
  {
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null },
  },
  { _id: false }
);

const MetricsSchema = new Schema(
  {
    views: { type: Number, default: 0 },
    contactReveals: { type: Number, default: 0 },
    savesCount: { type: Number, default: 0 },
  },
  { _id: false }
);

const ListingSchema = new Schema<IListing>(
  {
    type: {
      type: String,
      enum: ["PROPERTY", "SERVICE"],
      required: [true, "Listing type is required"],
      index: true,
    },
    status: {
      type: String,
      enum: ["DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED", "PAUSED", "ARCHIVED"],
      default: "PENDING_REVIEW",
      index: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [5, "Title must be at least 5 characters"],
      maxlength: [140, "Title cannot exceed 140 characters"],
    },
    slug: {
      type: String,
      required: [true, "Slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [4000, "Description cannot exceed 4000 characters"],
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owner ID is required"],
      index: true,
    },
    location: {
      type: LocationSchema,
      required: true,
    },
    contactPreferences: {
      type: ContactPreferencesSchema,
      required: true,
    },
    photos: {
      type: [PhotoSchema],
      default: [],
    },
    propertyDetails: {
      type: PropertyDetailsSchema,
      required: false,
    },
    serviceDetails: {
      type: ServiceDetailsSchema,
      required: false,
    },
    moderation: {
      type: ModerationSchema,
      default: () => ({}),
    },
    metrics: {
      type: MetricsSchema,
      default: () => ({ views: 0, contactReveals: 0, savesCount: 0 }),
    },
  },
  {
    timestamps: true,
    collection: "listings",
  }
);

// Indexes defined per Section 2.5 of database-schema.md
ListingSchema.index({ type: 1, status: 1, "location.cityCode": 1, createdAt: -1 });
ListingSchema.index({ status: 1, "propertyDetails.purpose": 1, "propertyDetails.price": 1 });
ListingSchema.index({ status: 1, "propertyDetails.bedrooms": 1 });
ListingSchema.index({ status: 1, "serviceDetails.category": 1, "serviceDetails.startingPrice": 1 });
ListingSchema.index({ ownerId: 1, status: 1 });
ListingSchema.index({ "location.geo": "2dsphere" }, { sparse: true });

export const Listing: Model<IListing> =
  mongoose.models.Listing || mongoose.model<IListing>("Listing", ListingSchema);
