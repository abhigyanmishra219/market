import { redirect } from "next/navigation";

export default function CreatePropertyRedirectPage() {
  redirect("/dashboard/properties/new");
}
