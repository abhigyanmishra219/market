"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PropertyImageUploader } from "@/components/properties/PropertyImageUploader";
import {
  ListingPhotoInput,
  PropertyPurpose,
  PropertyClassification,
  FurnishingStatus,
} from "@/types/listing";
import {
  Building2,
  Layers,
  Sparkles,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  Save,
  Send,
  Eye,
  Lock,
} from "lucide-react";

interface PropertyFormProps {
  initialData?: any;
  isEditing?: boolean;
  listingId?: string;
  defaultCityName?: string;
  defaultCityCode?: string;
  userProfile?: {
    name?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
  };
}

export function PropertyForm({
  initialData,
  isEditing = false,
  listingId,
  defaultCityName = "Metropolis",
  defaultCityCode = "METRO",
  userProfile,
}: PropertyFormProps) {
  const router = useRouter();

  // Wizard Step State (1: Type, 2: Specs & Pricing, 3: Location, 4: Photos, 5: Contact & Review)
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submittedStatus, setSubmittedStatus] = useState<string | null>(null);

  // Form Fields State
  const [purpose, setPurpose] = useState<PropertyPurpose>(
    initialData?.propertyDetails?.purpose || "FOR_RENT"
  );
  const [propertyType, setPropertyType] = useState<PropertyClassification>(
    initialData?.propertyDetails?.propertyType || "APARTMENT"
  );
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");

  // Specs & Pricing
  const [price, setPrice] = useState(initialData?.propertyDetails?.price?.toString() || "");
  const [securityDeposit, setSecurityDeposit] = useState(
    initialData?.propertyDetails?.securityDeposit?.toString() || ""
  );
  const [maintenanceFee, setMaintenanceFee] = useState(
    initialData?.propertyDetails?.maintenanceFee?.toString() || ""
  );
  const [bedrooms, setBedrooms] = useState(
    initialData?.propertyDetails?.bedrooms !== undefined
      ? initialData.propertyDetails.bedrooms.toString()
      : "2"
  );
  const [bathrooms, setBathrooms] = useState(
    initialData?.propertyDetails?.bathrooms !== undefined
      ? initialData.propertyDetails.bathrooms.toString()
      : "2"
  );
  const [balconies, setBalconies] = useState(
    initialData?.propertyDetails?.balconies !== undefined
      ? initialData.propertyDetails.balconies.toString()
      : "1"
  );
  const [carpetArea, setCarpetArea] = useState(
    initialData?.propertyDetails?.carpetArea?.toString() || ""
  );
  const [superArea, setSuperArea] = useState(
    initialData?.propertyDetails?.superArea?.toString() || ""
  );
  const [furnishing, setFurnishing] = useState<FurnishingStatus>(
    initialData?.propertyDetails?.furnishing || "SEMI_FURNISHED"
  );
  const [floorNumber, setFloorNumber] = useState(
    initialData?.propertyDetails?.floorNumber !== undefined
      ? initialData.propertyDetails.floorNumber.toString()
      : "2"
  );
  const [totalFloors, setTotalFloors] = useState(
    initialData?.propertyDetails?.totalFloors !== undefined
      ? initialData.propertyDetails.totalFloors.toString()
      : "5"
  );
  const [availableFrom, setAvailableFrom] = useState(
    initialData?.propertyDetails?.availableFrom
      ? new Date(initialData.propertyDetails.availableFrom).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [preferredTenants, setPreferredTenants] = useState(
    initialData?.propertyDetails?.preferredTenants || "ANY"
  );

  const approvedAmenities = [
    { id: "LIFT", label: "Elevator / Lift" },
    { id: "POWER_BACKUP", label: "Power Backup" },
    { id: "PARKING", label: "Dedicated Parking" },
    { id: "SECURITY", label: "24/7 Security" },
    { id: "WATER_SUPPLY", label: "24/7 Water Supply" },
    { id: "GYM", label: "Fitness Center / Gym" },
    { id: "SWIMMING_POOL", label: "Swimming Pool" },
    { id: "GAS_PIPELINE", label: "Piped Gas Connection" },
    { id: "CLUBHOUSE", label: "Community Clubhouse" },
  ];

  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(
    initialData?.propertyDetails?.amenities || ["LIFT", "POWER_BACKUP", "PARKING", "SECURITY"]
  );

  // Location
  const [city, setCity] = useState(initialData?.location?.city || defaultCityName);
  const [cityCode, setCityCode] = useState(initialData?.location?.cityCode || defaultCityCode);
  const [locality, setLocality] = useState(initialData?.location?.locality || "");
  const [streetAddress, setStreetAddress] = useState(initialData?.location?.streetAddress || "");

  // Photos
  const [photos, setPhotos] = useState<ListingPhotoInput[]>(initialData?.photos || []);

  // Contact Preferences
  const [phone, setPhone] = useState(
    initialData?.contactPreferences?.phone || userProfile?.phone || ""
  );
  const [whatsapp, setWhatsapp] = useState(
    initialData?.contactPreferences?.whatsapp || userProfile?.whatsapp || ""
  );
  const [showPhone, setShowPhone] = useState(
    initialData?.contactPreferences?.showPhone !== undefined
      ? initialData.contactPreferences.showPhone
      : true
  );
  const [showWhatsapp, setShowWhatsapp] = useState(
    initialData?.contactPreferences?.showWhatsapp !== undefined
      ? initialData.contactPreferences.showWhatsapp
      : true
  );

  // Field Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleAmenity = (id: string) => {
    if (selectedAmenities.includes(id)) {
      setSelectedAmenities(selectedAmenities.filter((a) => a !== id));
    } else {
      setSelectedAmenities([...selectedAmenities, id]);
    }
  };

  const validateStep = (currentStep: number): boolean => {
    const errs: Record<string, string> = {};

    if (currentStep === 1) {
      if (!title.trim() || title.trim().length < 5) {
        errs.title = "Title must be at least 5 characters.";
      } else if (title.trim().length > 140) {
        errs.title = "Title cannot exceed 140 characters.";
      }

      if (!description.trim() || description.trim().length < 20) {
        errs.description = "Description must be at least 20 characters.";
      }
    }

    if (currentStep === 2) {
      const numPrice = parseFloat(price);
      if (isNaN(numPrice) || numPrice <= 0) {
        errs.price = "Price / Rent must be a positive number.";
      }

      const numCarpet = parseFloat(carpetArea);
      if (isNaN(numCarpet) || numCarpet <= 0) {
        errs.carpetArea = "Carpet area must be a positive number (sq. ft.).";
      }
    }

    if (currentStep === 3) {
      if (!city.trim() || city.trim().length < 2) {
        errs.city = "City name is required.";
      }
      if (!locality.trim() || locality.trim().length < 2) {
        errs.locality = "Locality / Neighborhood is required.";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, 5));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (submitStatus: "DRAFT" | "PENDING_REVIEW") => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      setStep(1);
      return;
    }

    setIsSubmitting(true);
    setServerError(null);

    const payload = {
      type: "PROPERTY",
      status: submitStatus,
      title: title.trim(),
      description: description.trim(),
      location: {
        city: city.trim(),
        cityCode: cityCode.trim().toUpperCase(),
        locality: locality.trim(),
        streetAddress: streetAddress.trim() || null,
      },
      contactPreferences: {
        phone: phone.trim() || null,
        whatsapp: whatsapp.trim() || null,
        showPhone,
        showWhatsapp,
      },
      photos,
      propertyDetails: {
        purpose,
        propertyType,
        price: parseFloat(price),
        securityDeposit: securityDeposit ? parseFloat(securityDeposit) : undefined,
        maintenanceFee: maintenanceFee ? parseFloat(maintenanceFee) : undefined,
        bedrooms: ["PLOT", "COMMERCIAL"].includes(propertyType)
          ? 0
          : bedrooms
          ? parseInt(bedrooms, 10)
          : undefined,
        bathrooms: ["PLOT"].includes(propertyType)
          ? 0
          : bathrooms
          ? parseInt(bathrooms, 10)
          : undefined,
        balconies: balconies ? parseInt(balconies, 10) : undefined,
        carpetArea: parseFloat(carpetArea),
        superArea: superArea ? parseFloat(superArea) : undefined,
        furnishing,
        floorNumber: floorNumber ? parseInt(floorNumber, 10) : undefined,
        totalFloors: totalFloors ? parseInt(totalFloors, 10) : undefined,
        amenities: selectedAmenities,
        availableFrom,
        preferredTenants: purpose === "FOR_SALE" ? undefined : preferredTenants,
      },
    };

    try {
      const url = isEditing && listingId ? `/api/v1/listings/${listingId}` : "/api/v1/listings";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to save property listing.");
      }

      setSubmittedStatus(submitStatus);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "An unexpected server error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirmation Success View after submission
  if (submittedStatus) {
    return (
      <div className="max-w-xl mx-auto rounded-2xl border border-border-subtle bg-white p-8 text-center shadow-sm">
        <div className="w-16 h-16 rounded-full bg-light-green text-forest-green flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-dark-text tracking-tight">
          {submittedStatus === "DRAFT"
            ? "Property Saved as Draft"
            : "Property Submitted for Moderation"}
        </h2>
        <p className="text-xs text-muted-text mt-2 leading-relaxed">
          {submittedStatus === "DRAFT"
            ? "Your listing has been safely saved. You can continue editing or submit it for review whenever you're ready."
            : "To preserve marketplace quality and protect residents from fraud, all new and edited listings undergo administrative verification before becoming visible in public search."}
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="primary"
            onClick={() => router.push("/dashboard/properties")}
            leftIcon={<Building2 className="w-4 h-4" />}
          >
            Go to My Properties
          </Button>
          {!isEditing && (
            <Button
              variant="outline"
              onClick={() => {
                setSubmittedStatus(null);
                setStep(1);
                setTitle("");
                setDescription("");
                setPhotos([]);
              }}
            >
              Post Another Property
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8">
      {/* Rejection Alert Banner if previously rejected */}
      {isEditing && initialData?.status === "REJECTED" && initialData?.moderation?.rejectionReason && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 sm:p-5 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-red-900">Moderator Feedback / Action Needed</h4>
            <p className="text-xs text-red-800 mt-1 leading-relaxed">
              {initialData.moderation.rejectionReason}
            </p>
            <p className="text-[11px] text-red-700 mt-2 font-medium">
              Update the fields below and submit for re-review to publish your listing.
            </p>
          </div>
        </div>
      )}

      {/* Re-Review Notice Banner if editing currently approved listing */}
      {isEditing && initialData?.status === "APPROVED" && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-amber-900">Live Listing Re-Review Notice</h4>
            <p className="text-xs text-amber-800 mt-0.5">
              Materially modifying title, price, photos, or specs will resubmit the listing for admin review.
            </p>
          </div>
        </div>
      )}

      {/* Multi-step Stepper Indicator */}
      <div className="rounded-2xl border border-border-subtle bg-white p-4 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between">
          {[
            { num: 1, label: "Type & Info" },
            { num: 2, label: "Specs & Price" },
            { num: 3, label: "Location" },
            { num: 4, label: "Photos" },
            { num: 5, label: "Contact & Review" },
          ].map((s) => (
            <div
              key={s.num}
              onClick={() => {
                if (s.num < step) setStep(s.num);
              }}
              className={`flex flex-col items-center flex-1 text-center cursor-pointer ${
                s.num <= step ? "text-forest-green" : "text-muted-text opacity-50"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all mb-1 ${
                  s.num === step
                    ? "bg-forest-green text-white shadow-xs scale-105"
                    : s.num < step
                    ? "bg-light-green text-forest-green"
                    : "bg-off-white text-muted-text border border-border-subtle"
                }`}
              >
                {s.num < step ? "✓" : s.num}
              </div>
              <span className="text-[11px] font-semibold hidden sm:inline">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {serverError && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Step Container Card */}
      <div className="rounded-2xl border border-border-subtle bg-white p-6 sm:p-8 shadow-xs">
        {/* STEP 1: Purpose & Basic Info */}
        {step === 1 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-bold text-dark-text">Step 1 — Listing Type & Core Info</h2>
              <p className="text-xs text-muted-text">Select your transaction model and property classification.</p>
            </div>

            {/* Purpose Selection */}
            <div>
              <label className="text-xs font-semibold text-dark-text uppercase tracking-wider block mb-2">
                Listing Purpose <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: "FOR_RENT", title: "For Rent", desc: "Monthly lease or tenant rental" },
                  { id: "FOR_SALE", title: "For Sale", desc: "Outright purchase or real estate ownership" },
                  { id: "PG_CO_LIVING", title: "PG / Co-Living", desc: "Paying guest, shared flat, or student room" },
                ].map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setPurpose(p.id as PropertyPurpose)}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                      purpose === p.id
                        ? "border-forest-green bg-light-green/30 ring-1 ring-forest-green"
                        : "border-border-subtle hover:border-gray-300 bg-white"
                    }`}
                  >
                    <span className="text-sm font-bold text-dark-text block">{p.title}</span>
                    <span className="text-[11px] text-muted-text mt-0.5 block leading-normal">{p.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Property Classification Selection */}
            <div>
              <label className="text-xs font-semibold text-dark-text uppercase tracking-wider block mb-2">
                Property Classification <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {[
                  { id: "APARTMENT", label: "Apartment", icon: Building2 },
                  { id: "INDEPENDENT_HOUSE", label: "House", icon: Layers },
                  { id: "VILLA", label: "Villa", icon: Sparkles },
                  { id: "PLOT", label: "Plot / Land", icon: MapPin },
                  { id: "COMMERCIAL", label: "Commercial", icon: Building2 },
                ].map((pt) => {
                  const Icon = pt.icon;
                  return (
                    <div
                      key={pt.id}
                      onClick={() => setPropertyType(pt.id as PropertyClassification)}
                      className={`p-3 rounded-xl border text-center cursor-pointer transition-all flex flex-col items-center gap-1.5 ${
                        propertyType === pt.id
                          ? "border-forest-green bg-light-green/30 ring-1 ring-forest-green text-forest-green"
                          : "border-border-subtle hover:border-gray-300 bg-white text-dark-text"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-semibold">{pt.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Listing Title */}
            <FormField
              label="Listing Title"
              required
              error={errors.title}
              helperText="E.g., 'Spacious 2BHK Apartment in Greenwood Valley with Balcony'"
            >
              <Input
                placeholder="Enter a descriptive title for your property"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={140}
              />
            </FormField>

            {/* Detailed Description */}
            <FormField
              label="Property Description"
              required
              error={errors.description}
              helperText="Describe layout, ventilation, nearby landmarks, schools, and transport connectivity (min 20 characters)."
            >
              <Textarea
                placeholder="Provide comprehensive details about the property..."
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={4000}
              />
            </FormField>
          </div>
        )}

        {/* STEP 2: Specifications & Pricing */}
        {step === 2 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-bold text-dark-text">Step 2 — Specifications & Pricing</h2>
              <p className="text-xs text-muted-text">Enter financial terms and physical dimensions.</p>
            </div>

            {/* Price / Rent & Deposits */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                label={purpose === "FOR_SALE" ? "Total Sale Price (₹)" : "Monthly Rent (₹)"}
                required
                error={errors.price}
              >
                <Input
                  type="number"
                  placeholder={purpose === "FOR_SALE" ? "E.g., 8500000" : "E.g., 25000"}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  min={1}
                />
              </FormField>

              {purpose !== "FOR_SALE" && (
                <FormField label="Security Deposit (₹)" optional>
                  <Input
                    type="number"
                    placeholder="E.g., 50000"
                    value={securityDeposit}
                    onChange={(e) => setSecurityDeposit(e.target.value)}
                    min={0}
                  />
                </FormField>
              )}

              <FormField label="Monthly Maintenance (₹)" optional>
                <Input
                  type="number"
                  placeholder="E.g., 2000"
                  value={maintenanceFee}
                  onChange={(e) => setMaintenanceFee(e.target.value)}
                  min={0}
                />
              </FormField>
            </div>

            {/* Area Dimensions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Carpet Area (sq. ft.)"
                required
                error={errors.carpetArea}
                helperText="Actual usable floor area."
              >
                <Input
                  type="number"
                  placeholder="E.g., 1150"
                  value={carpetArea}
                  onChange={(e) => setCarpetArea(e.target.value)}
                  min={1}
                />
              </FormField>

              <FormField label="Super Built-up Area (sq. ft.)" optional>
                <Input
                  type="number"
                  placeholder="E.g., 1400"
                  value={superArea}
                  onChange={(e) => setSuperArea(e.target.value)}
                  min={1}
                />
              </FormField>
            </div>

            {/* Rooms & Furnishing (Hidden for PLOT) */}
            {propertyType !== "PLOT" && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <FormField label="Bedrooms (BHK)">
                  <Select value={bedrooms} onChange={(e) => setBedrooms(e.target.value)}>
                    <option value="0">Studio / 0 BHK</option>
                    <option value="1">1 BHK</option>
                    <option value="2">2 BHK</option>
                    <option value="3">3 BHK</option>
                    <option value="4">4 BHK</option>
                    <option value="5">5+ BHK</option>
                  </Select>
                </FormField>

                <FormField label="Bathrooms">
                  <Select value={bathrooms} onChange={(e) => setBathrooms(e.target.value)}>
                    <option value="1">1 Bath</option>
                    <option value="2">2 Baths</option>
                    <option value="3">3 Baths</option>
                    <option value="4">4+ Baths</option>
                  </Select>
                </FormField>

                <FormField label="Balconies">
                  <Select value={balconies} onChange={(e) => setBalconies(e.target.value)}>
                    <option value="0">0 Balconies</option>
                    <option value="1">1 Balcony</option>
                    <option value="2">2 Balconies</option>
                    <option value="3">3+ Balconies</option>
                  </Select>
                </FormField>

                <FormField label="Furnishing Status">
                  <Select
                    value={furnishing}
                    onChange={(e) => setFurnishing(e.target.value as FurnishingStatus)}
                  >
                    <option value="UNFURNISHED">Unfurnished</option>
                    <option value="SEMI_FURNISHED">Semi-Furnished</option>
                    <option value="FULLY_FURNISHED">Fully Furnished</option>
                  </Select>
                </FormField>
              </div>
            )}

            {/* Floor, Availability, Tenant Preferences */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Floor Level" optional>
                <Input
                  type="number"
                  placeholder="Unit floor e.g. 2"
                  value={floorNumber}
                  onChange={(e) => setFloorNumber(e.target.value)}
                />
              </FormField>

              <FormField label="Total Building Floors" optional>
                <Input
                  type="number"
                  placeholder="Total floors e.g. 5"
                  value={totalFloors}
                  onChange={(e) => setTotalFloors(e.target.value)}
                />
              </FormField>

              <FormField label="Available From Date">
                <Input
                  type="date"
                  value={availableFrom}
                  onChange={(e) => setAvailableFrom(e.target.value)}
                />
              </FormField>
            </div>

            {purpose !== "FOR_SALE" && (
              <FormField label="Preferred Tenant Profile">
                <Select
                  value={preferredTenants}
                  onChange={(e) => setPreferredTenants(e.target.value)}
                >
                  <option value="ANY">Any (Family, Working Professionals, Students)</option>
                  <option value="FAMILY">Family Only</option>
                  <option value="BACHELORS_MEN">Bachelors (Men)</option>
                  <option value="BACHELORS_WOMEN">Bachelors (Women)</option>
                  <option value="COMPANY_LEASE">Corporate / Company Lease</option>
                </Select>
              </FormField>
            )}

            {/* Amenities Checkbox Matrix */}
            <div>
              <label className="text-xs font-semibold text-dark-text uppercase tracking-wider block mb-2">
                Included Amenities
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {approvedAmenities.map((amenity) => {
                  const isChecked = selectedAmenities.includes(amenity.id);
                  return (
                    <label
                      key={amenity.id}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer select-none transition-colors text-xs ${
                        isChecked
                          ? "border-forest-green bg-light-green/30 text-dark-text font-medium"
                          : "border-border-subtle bg-white text-muted-text hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleAmenity(amenity.id)}
                        className="rounded border-gray-300 text-forest-green focus:ring-forest-green"
                      />
                      <span>{amenity.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Location */}
        {step === 3 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-bold text-dark-text">Step 3 — Location & Privacy</h2>
              <p className="text-xs text-muted-text">Specify where the property is situated.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="City" required error={errors.city}>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="E.g., Metropolis"
                />
              </FormField>

              <FormField label="Locality / Neighborhood" required error={errors.locality}>
                <Input
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  placeholder="E.g., Greenwood Valley"
                />
              </FormField>
            </div>

            {/* Private Address with Privacy Notice */}
            <div className="rounded-xl border border-border-subtle bg-off-white p-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Lock className="w-4 h-4 text-forest-green" />
                <span className="text-xs font-bold text-dark-text">Confidential Property Address</span>
                <Badge variant="property" size="sm">Privacy Guarded</Badge>
              </div>
              <p className="text-[11px] text-muted-text mb-3 leading-relaxed">
                In compliance with marketplace privacy safeguards, your exact flat, house, or building number is 
                <strong> never published on public search results</strong>. Only verified contacts receive directions.
              </p>
              <FormField label="Door / Flat / Street Address" optional>
                <Input
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="E.g., Flat 204, Green Heights Apartment"
                />
              </FormField>
            </div>
          </div>
        )}

        {/* STEP 4: Photos */}
        {step === 4 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-bold text-dark-text">Step 4 — Property Photographs</h2>
              <p className="text-xs text-muted-text">
                Upload clear, real photos of the living room, bedrooms, kitchen, and exterior (up to 12 images).
              </p>
            </div>

            <PropertyImageUploader photos={photos} onChange={setPhotos} maxPhotos={12} />
          </div>
        )}

        {/* STEP 5: Contact Preferences & Review */}
        {step === 5 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-bold text-dark-text">Step 5 — Contact Preferences & Submission</h2>
              <p className="text-xs text-muted-text">Confirm your contact settings and review before moderation submission.</p>
            </div>

            {/* Direct Contact Settings */}
            <div className="rounded-xl border border-border-subtle bg-white p-5 flex flex-col gap-4">
              <h4 className="text-xs font-bold text-dark-text uppercase tracking-wider">
                Direct Communication Controls
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Contact Phone Number" helperText="Used for voice calls from prospective tenants/buyers.">
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+919876543210"
                  />
                </FormField>

                <FormField label="WhatsApp Number" helperText="Direct WhatsApp deep-link for instant enquiries.">
                  <Input
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="+919876543210"
                  />
                </FormField>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-dark-text select-none">
                  <input
                    type="checkbox"
                    checked={showPhone}
                    onChange={(e) => setShowPhone(e.target.checked)}
                    className="rounded text-forest-green focus:ring-forest-green"
                  />
                  <span>Display "Call Owner" button on listing</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-dark-text select-none">
                  <input
                    type="checkbox"
                    checked={showWhatsapp}
                    onChange={(e) => setShowWhatsapp(e.target.checked)}
                    className="rounded text-forest-green focus:ring-forest-green"
                  />
                  <span>Display "WhatsApp" enquiry button</span>
                </label>
              </div>
            </div>

            {/* Review Summary Card */}
            <div className="rounded-xl border border-border-subtle bg-off-white p-5 flex flex-col gap-3">
              <h4 className="text-xs font-bold text-dark-text uppercase tracking-wider">
                Submission Summary
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div>
                  <span className="text-muted-text block">Title</span>
                  <span className="font-semibold text-dark-text truncate block">{title || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-text block">Purpose</span>
                  <Badge variant="property" size="sm">{purpose.replace("_", " ")}</Badge>
                </div>
                <div>
                  <span className="text-muted-text block">Price / Rent</span>
                  <span className="font-bold text-forest-green">₹{price ? Number(price).toLocaleString("en-IN") : "—"}</span>
                </div>
                <div>
                  <span className="text-muted-text block">Location</span>
                  <span className="font-medium text-dark-text">{locality}, {city}</span>
                </div>
                <div>
                  <span className="text-muted-text block">Carpet Area</span>
                  <span className="font-medium text-dark-text">{carpetArea} sq. ft.</span>
                </div>
                <div>
                  <span className="text-muted-text block">Photos</span>
                  <span className="font-medium text-dark-text">{photos.length} uploaded</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div className="flex items-center justify-between border-t border-border-subtle pt-6 mt-8">
          <div>
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleBack}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                disabled={isSubmitting}
              >
                Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {step < 5 ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleNext}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Next Step
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSubmit("DRAFT")}
                  isLoading={isSubmitting}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  Save as Draft
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => handleSubmit("PENDING_REVIEW")}
                  isLoading={isSubmitting}
                  leftIcon={<Send className="w-4 h-4" />}
                >
                  Submit for Review
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
