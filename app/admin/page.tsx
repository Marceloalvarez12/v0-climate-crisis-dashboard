import { redirect } from "next/navigation"

/** This demo has no user administration; old links return to the dashboard. */
export default function AdminPage() {
  redirect("/")
}
