import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Change this to the table that holds your member profiles.
const PROFILE_TABLE = "profiles";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const providerError = url.searchParams.get("error");

  if (providerError || !code) {
    return NextResponse.redirect(new URL("/login?error=oauth_callback", url.origin));
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(list) {
          list.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(new URL("/login?error=oauth_callback", url.origin));
  }

  // A brand-new Google user has no profile yet, so send them to onboarding.
  // If the profile lookup itself fails (wrong table name, RLS), go to /home
  // rather than trapping existing members in onboarding.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from(PROFILE_TABLE)
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profileError && !profile) {
      return NextResponse.redirect(new URL("/onboarding", url.origin));
    }
  }

  return NextResponse.redirect(new URL("/home", url.origin));
}