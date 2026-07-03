import { useEffect } from "react";
import { toast } from "sonner";
import { useMyProfile } from "@/lib/use-my-profile";

const KEY_PREFIX = "atc365:login-shown:";

export function LoginStreakPopup() {
  const { data } = useMyProfile();
  useEffect(() => {
    if (!data) return;
    if (data.loginAward <= 0) return;
    const today = new Date().toISOString().slice(0, 10);
    const key = `${KEY_PREFIX}${data.discordId}`;
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(key) === today) return;
    window.localStorage.setItem(key, today);
    toast.success(`🔥 ${data.loginStreak}-day streak! +${data.loginAward} tokens`, {
      description: `You now have ${data.tokens} tokens. Come back tomorrow for +${data.nextLoginBonus}!`,
      duration: 6000,
    });
  }, [data]);
  return null;
}
