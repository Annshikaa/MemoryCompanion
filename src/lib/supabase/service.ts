/**
 * Service-role Supabase client — bypasses RLS.
 *
 * RULES:
 *  - NEVER import this file in 'use client' components or expose to the browser.
 *  - ONLY use for the public emergency-card scan page where:
 *      1. The user is unauthenticated (anon), so the normal auth client can't read data.
 *      2. We manually whitelist every field returned based on caregiver-approved flags.
 *  - Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 *    (Supabase Dashboard → Settings → API → service_role key).
 *
 * Uses @supabase/ssr (same as all other server clients in this app) to avoid
 * the webpack bundling issues that occur with a direct @supabase/supabase-js import.
 */

import { createServerClient } from '@supabase/ssr';
import type { Database } from './database.types';

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'Add SUPABASE_SERVICE_ROLE_KEY to .env.local (Supabase Dashboard → Settings → API).',
    );
  }

  // Service-role key bypasses RLS entirely — no session or cookies needed.
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() { return []; },
      setAll() {},
    },
  });
}
