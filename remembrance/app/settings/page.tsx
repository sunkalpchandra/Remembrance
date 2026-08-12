import { redirect } from "next/navigation";

// Settings live in the in-app modal (SettingsModal, opened from the
// sidebar footer). This route only exists so old /settings links land
// somewhere sensible instead of a 404.
export default function SettingsPage() {
  redirect("/");
}
