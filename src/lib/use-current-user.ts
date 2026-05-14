import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCurrentUser } from "./auth.functions";

export function useCurrentUser() {
  const fn = useServerFn(getCurrentUser);
  return useQuery({
    queryKey: ["current-user"],
    queryFn: () => fn(),
    staleTime: 60_000,
  });
}
