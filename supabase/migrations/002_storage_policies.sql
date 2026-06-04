-- =============================================================
-- Memory Companion — Storage RLS policies
-- =============================================================
-- PREREQUISITE: The 'family-media' bucket must already exist.
--   Create it in the Supabase dashboard:
--     Storage → New bucket → Name: family-media → Public: ON
--
-- Folder layout inside the bucket:
--   {family_id}/patient/{filename}    ← patient profile photos
--   {family_id}/people/{filename}     ← loved-one photos
--   {family_id}/voices/{filename}     ← voice notes
--
-- Policy: a user may only read/write objects whose first path
-- segment matches their own family_id.
-- =============================================================

-- ── SELECT ───────────────────────────────────────────────────
CREATE POLICY "Family members can read own media"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'family-media'
  AND (storage.foldername(name))[1] = (
    SELECT family_id::text
    FROM public.profiles
    WHERE id = auth.uid()
  )
);

-- ── INSERT ───────────────────────────────────────────────────
-- This is the policy that fixes the upload error.
CREATE POLICY "Family members can upload own media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'family-media'
  AND (storage.foldername(name))[1] = (
    SELECT family_id::text
    FROM public.profiles
    WHERE id = auth.uid()
  )
);

-- ── UPDATE ───────────────────────────────────────────────────
CREATE POLICY "Family members can update own media"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'family-media'
  AND (storage.foldername(name))[1] = (
    SELECT family_id::text
    FROM public.profiles
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'family-media'
  AND (storage.foldername(name))[1] = (
    SELECT family_id::text
    FROM public.profiles
    WHERE id = auth.uid()
  )
);

-- ── DELETE ───────────────────────────────────────────────────
CREATE POLICY "Family members can delete own media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'family-media'
  AND (storage.foldername(name))[1] = (
    SELECT family_id::text
    FROM public.profiles
    WHERE id = auth.uid()
  )
);
