import { redirect } from "next/navigation";

export default function CreateServiceRedirectPage() {
  redirect("/dashboard/services/new");
}
