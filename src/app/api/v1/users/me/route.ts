import { NextRequest } from "next/server";
import { apiSuccess, handleRouteError } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-guards";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { updateProfileSchema } from "@/lib/validations/user";
import { NotFoundError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await requireAuth();
    await connectToDatabase();

    const user = await User.findById(session.user.id).select(
      "name email image role status phone whatsapp contactPreferences createdAt updatedAt"
    );

    if (!user) {
      throw new NotFoundError("User account not found");
    }

    return apiSuccess({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      status: user.status,
      phone: user.phone,
      whatsapp: user.whatsapp,
      contactPreferences: user.contactPreferences,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    // Validate payload against schema (strips unknown fields like role, email, etc.)
    const validatedData = updateProfileSchema.parse(body);

    await connectToDatabase();
    const user = await User.findById(session.user.id);

    if (!user) {
      throw new NotFoundError("User account not found");
    }

    // Apply only permitted fields
    if (validatedData.name !== undefined) {
      user.name = validatedData.name;
    }
    if (validatedData.phone !== undefined) {
      user.phone = validatedData.phone || null;
    }
    if (validatedData.whatsapp !== undefined) {
      user.whatsapp = validatedData.whatsapp || null;
    }
    if (validatedData.contactPreferences !== undefined) {
      user.contactPreferences = validatedData.contactPreferences;
    }

    await user.save();

    return apiSuccess({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      status: user.status,
      phone: user.phone,
      whatsapp: user.whatsapp,
      contactPreferences: user.contactPreferences,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
