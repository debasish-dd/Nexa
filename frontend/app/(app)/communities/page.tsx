import { Suspense } from "react";
import { CommunitiesView } from "@/components/communities/CommunitiesView";

export default function CommunitiesPage() {
  return (
    <Suspense fallback={null}>
      <CommunitiesView />
    </Suspense>
  );
}