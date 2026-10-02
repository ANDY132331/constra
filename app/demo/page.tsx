import { redirect } from "next/navigation";

// The old demo was retired; keep the URL working for anyone with an old link.
export default function DemoPage() {
  redirect("/onboarding");
}
