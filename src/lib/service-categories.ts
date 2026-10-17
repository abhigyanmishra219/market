import { ServiceCategory } from "@/types/listing";

export interface ServiceCategoryConfig {
  id: ServiceCategory;
  label: string;
  description: string;
  badgeColor: string;
  suggestedTags: string[];
}

export const SERVICE_CATEGORIES: ServiceCategoryConfig[] = [
  {
    id: "PLUMBING",
    label: "Plumbing",
    description: "Pipe fittings, tap repairs, drainage unclogging, water heaters, and sanitary installations.",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    suggestedTags: ["Leak Repair", "Drain Unclogging", "Tap & Shower", "Water Tank", "Pipe Replacement", "Bathroom Fittings"],
  },
  {
    id: "ELECTRICAL",
    label: "Electrical",
    description: "Wiring, switchboard repairs, breaker triage, lighting setups, and appliance connections.",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    suggestedTags: ["Short Circuit Fix", "MCB & Fuse", "Ceiling Fan", "Switchboard Wiring", "LED Lighting", "Inverter Setup"],
  },
  {
    id: "CARPENTRY",
    label: "Carpentry",
    description: "Furniture repair, modular woodwork, door lock installations, hinges, and bespoke fittings.",
    badgeColor: "bg-orange-50 text-orange-700 border-orange-200",
    suggestedTags: ["Furniture Assembly", "Door & Lock Repair", "Modular Kitchen", "Cupboard Hinges", "Wooden Partitions"],
  },
  {
    id: "CLEANING",
    label: "Deep Cleaning",
    description: "Full-home intensive sanitization, kitchen degreasing, bathroom scrubbing, and upholstery cleaning.",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    suggestedTags: ["Full Home Cleaning", "Kitchen Deep Clean", "Bathroom Scrubbing", "Sofa & Carpet", "Balcony Wash"],
  },
  {
    id: "PAINTING",
    label: "Painting",
    description: "Interior wall finishes, waterproof exterior coating, ceiling touch-ups, and texture artistry.",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    suggestedTags: ["Interior Wall Paint", "Exterior Waterproofing", "Repaint & Touchup", "Texture & Stencil", "Wood Polish"],
  },
  {
    id: "APPLIANCE_REPAIR",
    label: "Appliance Repair",
    description: "Refrigerators, washing machines, microwaves, air conditioners, and kitchen appliances.",
    badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
    suggestedTags: ["AC Servicing & Gas", "Refrigerator Repair", "Washing Machine", "Microwave Oven", "Chimney Cleaning"],
  },
  {
    id: "PEST_CONTROL",
    label: "Pest Control",
    description: "Eco-friendly termite extermination, cockroach gel treatments, rodent elimination, and bed bug control.",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
    suggestedTags: ["Cockroach Gel", "Termite Treatment", "Bed Bug Control", "Rodent Removal", "Ant Elimination"],
  },
  {
    id: "MOVERS_PACKERS",
    label: "Movers & Packers",
    description: "Safe household shifting, office relocation, delicate item packing, and intercity transit.",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    suggestedTags: ["House Shifting", "Office Relocation", "Packing & Unpacking", "Vehicle Transit", "Fragile Cargo"],
  },
  {
    id: "OTHER",
    label: "Other Specialists",
    description: "General handyman tasks, locksmiths, welders, masons, and custom technical assistance.",
    badgeColor: "bg-gray-50 text-gray-700 border-gray-200",
    suggestedTags: ["Handyman Work", "Welding & Grills", "Masonry Repair", "Locksmith", "Glass Work"],
  },
];

export function getServiceCategory(id?: string | null): ServiceCategoryConfig {
  return (
    SERVICE_CATEGORIES.find((cat) => cat.id === id) || {
      id: "OTHER",
      label: "Specialist",
      description: "Skilled local professional services.",
      badgeColor: "bg-gray-50 text-gray-700 border-gray-200",
      suggestedTags: [],
    }
  );
}

export function isValidServiceCategory(category: string): category is ServiceCategory {
  return SERVICE_CATEGORIES.some((cat) => cat.id === category);
}
