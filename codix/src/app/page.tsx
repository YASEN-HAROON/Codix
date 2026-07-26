import { redirect } from "next/navigation";

// Root is rewritten to index.html via next.config, but keep a fallback
export default function Home() {
  redirect("/index.html");
}
