import { toast } from "sonner";

export const inviteLink = (code: string) => `${window.location.origin}/login?join=${code}`;

/** Opens the phone's share sheet with the join link and code, or copies them where there isn't one. */
export async function shareInvite(code: string, companyName: string): Promise<void> {
  const url = inviteLink(code);
  const text = `Join ${companyName || "our company"} on Constra so you can clock in from your phone. Your invite code is ${code}.`;
  try {
    if (navigator.share) {
      await navigator.share({ title: "Join us on Constra", text, url });
      return;
    }
    await navigator.clipboard.writeText(`${text} ${url}`);
    toast.success("Invite copied. Paste it into a text to your crew.");
  } catch (err) {
    // They closed the share sheet, which is a choice and not a failure
    if ((err as Error).name !== "AbortError") toast.error(`Couldn't share it. Send your crew this code: ${code}`);
  }
}
