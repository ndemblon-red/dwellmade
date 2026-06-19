
CREATE POLICY "studio_syn_own_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'studio-syn' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "studio_syn_own_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'studio-syn' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "studio_syn_own_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'studio-syn' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'studio-syn' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "studio_syn_own_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'studio-syn' AND auth.uid()::text = (storage.foldername(name))[1]);
