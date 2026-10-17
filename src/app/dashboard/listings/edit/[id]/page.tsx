import { redirect, notFound } from "next/navigation";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Listing } from "@/models/Listing";

export default async function EditListingRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!mongoose.isValidObjectId(id)) {
    notFound();
  }

  await connectToDatabase();
  const listing = await Listing.findById(id).select("type").lean();

  if (!listing) {
    notFound();
  }

  if (listing.type === "SERVICE") {
    redirect(`/dashboard/services/${id}/edit`);
  }

  redirect(`/dashboard/properties/${id}/edit`);
}

