import { redirect } from "next/navigation";

export default function NewCustomOrderRedirectPage() {
  redirect("/seller/commissions");
}
