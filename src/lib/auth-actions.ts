import { supabase } from "@/integrations/supabase/client";

/** Sign in with email + password. Throws the Supabase error on failure. */
export async function signInWithEmail(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
}

/** Clear the current session. Throws the Supabase error on failure. */
export async function signOutSession(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
