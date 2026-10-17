"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { PropertyImageUploader } from "@/components/properties/PropertyImageUploader";
import {
  ListingPhotoInput,
  ServiceCategory,
  ServicePricingModel,
} from "@/types/listing";
import { SERVICE_CATEGORIES, getServiceCategory } from "@/lib/service-categories";
import { formatCurrency } from "@/lib/utils";
import {
  MapPin,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  Save,
  Send,
  Lock,
} from "lucide-react";

interface ServiceFormProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialData?: Record<string, any>;
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

const ALL_DAYS = [
  { id: "MON", label: "Mon" },
  { id: "TUE", label: "Tue" },
  { id: "WED", label: "Wed" },
  { id: "THU", label: "Thu" },
  { id: "FRI", label: "Fri" },
  { id: "SAT", label: "Sat" },
  { id: "SUN", label: "Sun" },
];

const COMMON_LOCALITIES = [
  "Greenwood",
  "Downtown",
  "Tech Corridor",
  "North Park",
  "Highland Greens",
  "Westside",
  "Airport Road",
  "Lakeside",
];

export function ServiceForm({
  initialData,
  isEditing = false,
  listingId,
  defaultCityName = "Metropolis",
  defaultCityCode = "METRO",
  userProfile,
}: ServiceFormProps) {
  const router = useRouter();

  // Wizard Step State (1: Category & Scope, 2: Pricing & Hours, 3: Location & Areas, 4: Photos, 5: Contact & Review)
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Form Fields State
  const [category, setCategory] = useState<ServiceCategory>(
    initialData?.serviceDetails?.category || "PLUMBING"
  );
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [guarantees, setGuarantees] = useState(
    initialData?.serviceDetails?.guarantees || ""
  );

  // Pricing & Experience
  const [pricingModel, setPricingModel] = useState<ServicePricingModel>(
    initialData?.serviceDetails?.pricingModel || "FIXED"
  );
  const [startingPrice, setStartingPrice] = useState<string>(
    initialData?.serviceDetails?.startingPrice !== undefined
      ? String(initialData.serviceDetails.startingPrice)
      : "500"
  );
  const [experienceYears, setExperienceYears] = useState<string>(
    initialData?.serviceDetails?.experienceYears !== undefined
      ? String(initialData.serviceDetails.experienceYears)
      : "3"
  );

  // Operating Schedule
  const [workingDays, setWorkingDays] = useState<string[]>(
    initialData?.serviceDetails?.workingDays || [
      "MON",
      "TUE",
      "WED",
      "THU",
      "FRI",
      "SAT",
    ]
  );
  const [workingHoursStart, setWorkingHoursStart] = useState<string>(
    initialData?.serviceDetails?.workingHours?.start || "08:00"
  );
  const [workingHoursEnd, setWorkingHoursEnd] = useState<string>(
    initialData?.serviceDetails?.workingHours?.end || "20:00"
  );

  // Location & Service Areas
  const [city, setCity] = useState(initialData?.location?.city || defaultCityName);
  const [cityCode] = useState(initialData?.location?.cityCode || defaultCityCode);
  const [locality, setLocality] = useState(initialData?.location?.locality || "");
  const [streetAddress, setStreetAddress] = useState(
    initialData?.location?.streetAddress || ""
  );
  const [serviceAreas, setServiceAreas] = useState<string[]>(
    initialData?.serviceDetails?.serviceAreas || ["Greenwood", "Downtown"]
  );
  const [customAreaInput, setCustomAreaInput] = useState("");

  // Photos
  const [photos, setPhotos] = useState<ListingPhotoInput[]>(
    initialData?.photos || []
  );

  // Contact Preferences
  const [phone, setPhone] = useState(
    initialData?.contactPreferences?.phone || userProfile?.phone || ""
  );
  const [whatsapp, setWhatsapp] = useState(
    initialData?.contactPreferences?.whatsapp || userProfile?.whatsapp || ""
  );
  const [showPhone, setShowPhone] = useState<boolean>(
    initialData?.contactPreferences?.showPhone ?? true
  );
  const [showWhatsapp, setShowWhatsapp] = useState<boolean>(
    initialData?.contactPreferences?.showWhatsapp ?? true
  );

  // Validation Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Toggle Operating Day
  const toggleDay = (dayId: string) => {
    if (workingDays.includes(dayId)) {
      if (workingDays.length > 1) {
        setWorkingDays(workingDays.filter((d) => d !== dayId));
      }
    } else {
      setWorkingDays([...workingDays, dayId]);
    }
  };

  // Add Service Area Tag
  const handleAddArea = (area: string) => {
    const trimmed = area.trim();
    if (!trimmed || serviceAreas.includes(trimmed)) return;
    setServiceAreas([...serviceAreas, trimmed]);
    setCustomAreaInput("");
  };

  const handleRemoveArea = (area: string) => {
    if (serviceAreas.length > 1) {
      setServiceAreas(serviceAreas.filter((a) => a !== area));
    }
  };

  // Step Validation
  const validateStep = (currentStep: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!title.trim() || title.trim().length < 5) {
        newErrors.title = "Service title must be at least 5 characters long.";
      } else if (title.trim().length > 140) {
        newErrors.title = "Service title cannot exceed 140 characters.";
      }

      if (!description.trim() || description.trim().length < 20) {
        newErrors.description =
          "Please provide a comprehensive service scope of at least 20 characters.";
      }
    }

    if (currentStep === 2) {
      if (pricingModel === "FIXED" || pricingModel === "HOURLY") {
        const p = parseFloat(startingPrice);
        if (isNaN(p) || p <= 0) {
          newErrors.startingPrice = "Please enter a valid rate greater than zero.";
        }
      }

      const exp = parseInt(experienceYears, 10);
      if (isNaN(exp) || exp < 0 || exp > 60) {
        newErrors.experienceYears = "Experience must be between 0 and 60 years.";
      }

      if (workingDays.length === 0) {
        newErrors.workingDays = "Please select at least 1 working day.";
      }
    }

    if (currentStep === 3) {
      if (!city.trim()) {
        newErrors.city = "City name is required.";
      }

      if (!locality.trim() || locality.trim().length < 2) {
        newErrors.locality = "Primary locality/neighborhood is required.";
      }

      if (serviceAreas.length === 0) {
        newErrors.serviceAreas = "Please select at least 1 service coverage area.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

  // Submit Handler (Draft or Review)
  const handleSubmit = async (targetStatus: "DRAFT" | "PENDING_REVIEW") => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      setServerError("Please resolve all validation errors before submitting.");
      return;
    }

    setIsSubmitting(true);
    setServerError(null);

    const payload = {
      type: "SERVICE" as const,
      status: targetStatus,
      title: title.trim(),
      description: description.trim(),
      location: {
        city: city.trim(),
        cityCode: (cityCode || defaultCityCode).toUpperCase(),
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
      serviceDetails: {
        category,
        pricingModel,
        startingPrice:
          pricingModel === "QUOTE_BASED"
            ? undefined
            : startingPrice
            ? parseFloat(startingPrice)
            : undefined,
        experienceYears: parseInt(experienceYears, 10) || 0,
        serviceAreas,
        workingDays,
        workingHours: {
          start: workingHoursStart,
          end: workingHoursEnd,
        },
        guarantees: guarantees.trim() || null,
      },
    };

    try {
      const url = isEditing
        ? `/api/v1/listings/${listingId}`
        : "/api/v1/listings";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to save service listing.");
      }

      // Success redirect
      router.push("/dashboard/services?success=true");
      router.refresh();
    } catch (err: unknown) {
      setServerError(
        err instanceof Error ? err.message : "An unexpected server error occurred."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCategory = getServiceCategory(category);

  return (
    <div className="bg-white rounded-2xl border border-border-subtle shadow-xs overflow-hidden">
      {/* Multi-step Stepper Navigation */}
      <div className="border-b border-border-subtle bg-off-white/70 px-4 sm:px-8 py-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {[
            { num: 1, label: "Category & Scope" },
            { num: 2, label: "Pricing & Hours" },
            { num: 3, label: "Coverage Area" },
            { num: 4, label: "Portfolio Photos" },
            { num: 5, label: "Review & Submit" },
          ].map((s, idx) => (
            <React.Fragment key={s.num}>
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (s.num < step || validateStep(step)) {
                      setStep(s.num);
                    }
                  }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === s.num
                      ? "bg-forest-green text-white ring-4 ring-forest-green/10"
                      : step > s.num
                      ? "bg-light-green text-forest-green font-semibold"
                      : "bg-white text-muted-text border border-border-subtle"
                  }`}
                >
                  {step > s.num ? (
                    <CheckCircle2 className="w-4 h-4 text-forest-green" />
                  ) : (
                    s.num
                  )}
                </button>
                <span
                  className={`text-[11px] font-medium hidden sm:block ${
                    step === s.num ? "text-dark-text font-bold" : "text-muted-text"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {idx < 4 && (
                <div
                  className={`flex-1 h-0.5 mx-2 hidden sm:block transition-colors ${
                    step > idx + 1 ? "bg-forest-green" : "bg-gray-200"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="p-6 sm:p-8">
        {serverError && (
          <div className="mb-6 p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {/* STEP 1: Category & Scope */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-dark-text">Choose Service Category</h3>
              <p className="text-xs text-muted-text mt-0.5">
                Select the trade or professional domain that best describes your skills.
              </p>
            </div>

            {/* Category Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {SERVICE_CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`p-4 rounded-xl border text-left transition-all relative ${
                      isSelected
                        ? "border-forest-green bg-light-green/20 ring-1 ring-forest-green shadow-xs"
                        : "border-border-subtle bg-white hover:border-forest-green/40 hover:bg-gray-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-dark-text">{cat.label}</span>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-forest-green shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-text line-clamp-2 leading-relaxed">
                      {cat.description}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="pt-4 border-t border-border-subtle space-y-5">
              <FormField
                label="Service Title / Business Headline"
                required
                error={errors.title}
                helperText="Clear headline specifying your trade and specialty (e.g. 'Master Electrician & Emergency Wiring Specialist')."
              >
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Certified Plumbing & Drain Unclogging Specialist"
                  maxLength={140}
                />
              </FormField>

              <FormField
                label="Service Description & Scope of Work"
                required
                error={errors.description}
                helperText="Describe your services in detail: what you fix, materials or tools you carry, response times, and experience."
              >
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  placeholder="Provide a comprehensive breakdown of your services, diagnostic approach, and workmanship quality..."
                  maxLength={4000}
                />
              </FormField>

              <FormField
                label="Workmanship Guarantees & Warranties"
                helperText="Optional guarantee or rework warranty (e.g. '30-day rework warranty on all plumbing joints')."
              >
                <Input
                  value={guarantees}
                  onChange={(e) => setGuarantees(e.target.value)}
                  placeholder="e.g. 30-day free rework warranty on all installations"
                  maxLength={500}
                />
              </FormField>
            </div>
          </div>
        )}

        {/* STEP 2: Pricing, Experience & Operating Schedule */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-dark-text">Pricing & Working Schedule</h3>
              <p className="text-xs text-muted-text mt-0.5">
                Set how you charge clients and when you are available for work.
              </p>
            </div>

            {/* Pricing Model Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: "FIXED",
                  title: "Fixed Pricing",
                  desc: "Standard flat fee for predefined tasks or inspections.",
                },
                {
                  id: "HOURLY",
                  title: "Hourly Rate",
                  desc: "Hourly fee billed according to on-site work duration.",
                },
                {
                  id: "QUOTE_BASED",
                  title: "Quote Required",
                  desc: "Custom pricing provided upon evaluating client scope.",
                },
              ].map((model) => {
                const isSelected = pricingModel === model.id;
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => setPricingModel(model.id as ServicePricingModel)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-forest-green bg-light-green/20 ring-1 ring-forest-green shadow-xs"
                        : "border-border-subtle bg-white hover:border-forest-green/40 hover:bg-gray-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-dark-text">{model.title}</span>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-forest-green shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-text">{model.desc}</p>
                  </button>
                );
              })}
            </div>

            {/* Price Input (if FIXED or HOURLY) */}
            {pricingModel !== "QUOTE_BASED" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label={
                    pricingModel === "HOURLY"
                      ? "Hourly Rate (in platform currency)"
                      : "Starting / Inspection Fee"
                  }
                  required
                  error={errors.startingPrice}
                >
                  <Input
                    type="number"
                    min="1"
                    value={startingPrice}
                    onChange={(e) => setStartingPrice(e.target.value)}
                    placeholder="e.g. 500"
                  />
                </FormField>

                <FormField
                  label="Years of Professional Experience"
                  required
                  error={errors.experienceYears}
                >
                  <Input
                    type="number"
                    min="0"
                    max="60"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    placeholder="e.g. 5"
                  />
                </FormField>
              </div>
            )}

            {pricingModel === "QUOTE_BASED" && (
              <FormField
                label="Years of Professional Experience"
                required
                error={errors.experienceYears}
              >
                <Input
                  type="number"
                  min="0"
                  max="60"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  placeholder="e.g. 5"
                />
              </FormField>
            )}

            {/* Operating Days */}
            <div className="space-y-2 pt-2 border-t border-border-subtle">
              <label className="text-xs font-bold text-dark-text block">
                Operating Days <span className="text-rose-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_DAYS.map((day) => {
                  const isChecked = workingDays.includes(day.id);
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => toggleDay(day.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        isChecked
                          ? "bg-forest-green text-white shadow-xs"
                          : "bg-off-white text-muted-text border border-border-subtle hover:text-dark-text"
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
              {errors.workingDays && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.workingDays}</p>
              )}
            </div>

            {/* Operating Hours */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Daily Start Time" required>
                <Input
                  type="time"
                  value={workingHoursStart}
                  onChange={(e) => setWorkingHoursStart(e.target.value)}
                />
              </FormField>

              <FormField label="Daily End Time" required>
                <Input
                  type="time"
                  value={workingHoursEnd}
                  onChange={(e) => setWorkingHoursEnd(e.target.value)}
                />
              </FormField>
            </div>
          </div>
        )}

        {/* STEP 3: Coverage Area & Location */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-dark-text">Operating Location & Coverage</h3>
              <p className="text-xs text-muted-text mt-0.5">
                Specify your primary city and the neighborhoods where you can provide on-site service.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="City" required error={errors.city}>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Metropolis"
                />
              </FormField>

              <FormField
                label="Primary Base Neighborhood"
                required
                error={errors.locality}
                helperText="Your primary shop or dispatch location (e.g. Greenwood)."
              >
                <Input
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  placeholder="e.g. Greenwood"
                />
              </FormField>
            </div>

            {/* Service Coverage Areas Tags */}
            <div className="space-y-3 pt-2 border-t border-border-subtle">
              <div>
                <label className="text-xs font-bold text-dark-text block mb-1">
                  Covered Neighborhoods & Localities <span className="text-rose-500">*</span>
                </label>
                <p className="text-[11px] text-muted-text">
                  Add all localities you travel to for client visits.
                </p>
              </div>

              {/* Tag Input */}
              <div className="flex gap-2">
                <Input
                  value={customAreaInput}
                  onChange={(e) => setCustomAreaInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddArea(customAreaInput);
                    }
                  }}
                  placeholder="Type neighborhood name and click Add"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => handleAddArea(customAreaInput)}
                >
                  Add
                </Button>
              </div>

              {/* Quick Suggestions Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-muted-text mr-1">Suggestions:</span>
                {COMMON_LOCALITIES.map((loc) => {
                  const isAdded = serviceAreas.includes(loc);
                  return (
                    <button
                      key={loc}
                      type="button"
                      disabled={isAdded}
                      onClick={() => handleAddArea(loc)}
                      className={`text-[11px] px-2 py-0.5 rounded-full border transition-all ${
                        isAdded
                          ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                          : "bg-white text-dark-text border-border-subtle hover:border-forest-green hover:text-forest-green"
                      }`}
                    >
                      + {loc}
                    </button>
                  );
                })}
              </div>

              {/* Selected Tags List */}
              <div className="flex flex-wrap gap-2 pt-2">
                {serviceAreas.map((area) => (
                  <span
                    key={area}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-light-purple text-purple-900 border border-purple-200"
                  >
                    <MapPin className="w-3 h-3 text-purple-700" />
                    {area}
                    <button
                      type="button"
                      onClick={() => handleRemoveArea(area)}
                      className="ml-1 text-purple-700 hover:text-rose-600 focus:outline-none"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
              {errors.serviceAreas && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.serviceAreas}</p>
              )}
            </div>

            {/* Private Street Address */}
            <div className="pt-2 border-t border-border-subtle">
              <FormField
                label="Workshop / Office Street Address (Private)"
                helperText="Kept strictly confidential; never exposed in public search results or public APIs."
              >
                <div className="relative">
                  <Input
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder="e.g. Shop #14, Industrial Estate Phase 2"
                  />
                  <div className="absolute right-3 top-2.5 text-muted-text">
                    <Lock className="w-4 h-4" />
                  </div>
                </div>
              </FormField>
            </div>
          </div>
        )}

        {/* STEP 4: Portfolio Photos & Work Samples */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-dark-text">Portfolio Photos & Work Samples</h3>
              <p className="text-xs text-muted-text mt-0.5">
                Upload real photos of your past installations, repairs, tools, or mobile workshop. High-quality photos increase client booking requests.
              </p>
            </div>

            <PropertyImageUploader
              photos={photos}
              onChange={setPhotos}
              maxPhotos={12}
            />
          </div>
        )}

        {/* STEP 5: Contact Preferences & Review */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-dark-text">Contact Preferences & Final Review</h3>
              <p className="text-xs text-muted-text mt-0.5">
                Verify how customers reach you and review your listing summary before submitting for moderation.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Direct Phone Number"
                helperText="Active mobile phone number for customer inquiries."
              >
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                />
              </FormField>

              <FormField
                label="WhatsApp Enquiry Number"
                helperText="WhatsApp number for instant customer messaging."
              >
                <Input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                />
              </FormField>
            </div>

            {/* Privacy Toggles */}
            <div className="p-4 rounded-xl border border-border-subtle bg-off-white space-y-3">
              <span className="text-xs font-bold text-dark-text block">
                Public Contact Controls
              </span>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-dark-text select-none">
                  <input
                    type="checkbox"
                    checked={showPhone}
                    onChange={(e) => setShowPhone(e.target.checked)}
                    className="rounded text-forest-green focus:ring-forest-green"
                  />
                  <span>Display &quot;Call Provider&quot; button on public listing</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-dark-text select-none">
                  <input
                    type="checkbox"
                    checked={showWhatsapp}
                    onChange={(e) => setShowWhatsapp(e.target.checked)}
                    className="rounded text-forest-green focus:ring-forest-green"
                  />
                  <span>Display &quot;WhatsApp&quot; chat button</span>
                </label>
              </div>
            </div>

            {/* Summary Preview Card */}
            <div className="rounded-xl border border-border-subtle bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-text">
                  Listing Preview Summary
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-light-purple text-purple-900 border border-purple-200">
                  {activeCategory.label}
                </span>
              </div>

              <h4 className="text-base font-bold text-dark-text">{title || "Untitled Service"}</h4>
              <p className="text-xs text-muted-text line-clamp-2">{description || "No description provided."}</p>

              <div className="pt-3 border-t border-border-subtle grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-muted-text block text-[11px]">Pricing Model</span>
                  <span className="font-semibold text-dark-text">
                    {pricingModel === "QUOTE_BASED"
                      ? "Quote Required"
                      : pricingModel === "HOURLY"
                      ? `${formatCurrency(parseFloat(startingPrice) || 0)}/hr`
                      : `Starts at ${formatCurrency(parseFloat(startingPrice) || 0)}`}
                  </span>
                </div>
                <div>
                  <span className="text-muted-text block text-[11px]">Experience</span>
                  <span className="font-semibold text-dark-text">{experienceYears} Years</span>
                </div>
                <div>
                  <span className="text-muted-text block text-[11px]">Coverage Areas</span>
                  <span className="font-semibold text-dark-text">{serviceAreas.length} Localities</span>
                </div>
                <div>
                  <span className="text-muted-text block text-[11px]">Portfolio Photos</span>
                  <span className="font-semibold text-dark-text">{photos.length} Uploaded</span>
                </div>
              </div>
            </div>

            {/* Moderation Warning Notice */}
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Admin Quality Review Required: </span>
                <span>
                  All new and materially updated service listings undergo administrative quality and safety review prior to public discovery. You can track moderation progress directly from your dashboard.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Stepper Footer Controls */}
        <div className="mt-8 pt-6 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                size="md"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                onClick={handleBack}
                disabled={isSubmitting}
              >
                Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {step < 5 ? (
              <Button
                type="button"
                variant="primary"
                size="md"
                rightIcon={<ArrowRight className="w-4 h-4" />}
                onClick={handleNext}
                className="w-full sm:w-auto"
              >
                Continue to Step {step + 1}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  leftIcon={<Save className="w-4 h-4" />}
                  isLoading={isSubmitting}
                  onClick={() => handleSubmit("DRAFT")}
                  className="w-full sm:w-auto"
                >
                  Save Draft
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  leftIcon={<Send className="w-4 h-4" />}
                  isLoading={isSubmitting}
                  onClick={() => handleSubmit("PENDING_REVIEW")}
                  className="w-full sm:w-auto"
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
