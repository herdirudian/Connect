import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/serverAuth";

export default async function Home() {
  const auth = await getAuthUser();

  if (auth?.userId) {
    const adminRoles = new Set(['ADMIN', 'STAFF', 'VERIFICATOR']);
    if (adminRoles.has(auth.role)) {
      redirect("/admin");
    } else {
      redirect("/dashboard");
    }
  } else {
    redirect("/login");
  }
}
