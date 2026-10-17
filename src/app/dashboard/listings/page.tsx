import { redirect } from "next/navigation";

export default function ListingsRedirectPage() {
  redirect("/dashboard/properties");
}
