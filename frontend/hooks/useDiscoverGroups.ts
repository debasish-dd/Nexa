import { useInfiniteQuery } from "@tanstack/react-query";
import { getDiscoverableGroups } from "@/libs/groups/api";

export function useDiscoverGroups() {
  return useInfiniteQuery({
    queryKey: ["groups", "discoverable"],
    queryFn: ({ pageParam }) => getDiscoverableGroups(pageParam),
    initialPageParam: 0,
    // Returning undefined tells React Query "there is no next page".
    getNextPageParam: (lastPage) => lastPage.pagination.nextOffset ?? undefined,
  });
}