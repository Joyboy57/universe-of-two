import { getSpace } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";
import { PushSetup } from "@/components/PushSetup";
import { SettingsForm } from "@/components/SettingsForm";
import { AppearanceToggles } from "@/components/AppearanceToggles";
import { DEFAULT_PREFS, type Prefs } from "@/lib/notify";

export default async function SettingsPage() {
  const { me, user } = await getSpace();
  if (!me) return null;

  const supabase = await supabaseServer();
  const { data: member } = await supabase
    .from("members").select("display_name, timezone, quiet_start, quiet_end").eq("user_id", user.id).single();
  const { data: prefs } = await supabase.from("notification_prefs").select("*").eq("user_id", user.id).maybeSingle();

  return (
    <main className="space-y-8">
      <h1 className="font-display text-3xl font-semibold">Settings</h1>

      <section className="card space-y-3" aria-labelledby="dev-h">
        <h2 id="dev-h" className="font-display text-xl font-semibold">Notifications on this device</h2>
        <PushSetup />
      </section>

      <section className="space-y-3" aria-labelledby="look-h">
        <h2 id="look-h" className="font-display text-xl font-semibold">Appearance</h2>
        <AppearanceToggles />
      </section>

      <section className="space-y-3" aria-labelledby="pref-h">
        <h2 id="pref-h" className="font-display text-xl font-semibold">Preferences</h2>
        <SettingsForm
          displayName={member?.display_name ?? me.display_name}
          timezone={member?.timezone ?? "UTC"}
          quietStart={(member?.quiet_start ?? "").slice(0, 5)}
          quietEnd={(member?.quiet_end ?? "").slice(0, 5)}
          prefs={{ ...DEFAULT_PREFS, ...(prefs ?? {}) } as Prefs}
        />
      </section>
    </main>
  );
}
