import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyProfile } from "./profile.functions";

export function useMyProfile() {
  const fn = useServerFn(getMyProfile);
  return useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fn(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
