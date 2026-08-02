DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'photos_insert') THEN
    EXECUTE $p$ CREATE POLICY "photos_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'photos' AND auth.role() = 'authenticated' AND split_part(name, '/', 1) = (public.my_company_id())::text) $p$;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'photos_select') THEN
    EXECUTE $p$ CREATE POLICY "photos_select" ON storage.objects FOR SELECT USING (bucket_id = 'photos' AND auth.role() = 'authenticated' AND split_part(name, '/', 1) = (public.my_company_id())::text) $p$;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'photos_delete') THEN
    EXECUTE $p$ CREATE POLICY "photos_delete" ON storage.objects FOR DELETE USING (bucket_id = 'photos' AND auth.role() = 'authenticated' AND split_part(name, '/', 1) = (public.my_company_id())::text) $p$;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'documents_insert') THEN
    EXECUTE $p$ CREATE POLICY "documents_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated' AND split_part(name, '/', 1) = (public.my_company_id())::text) $p$;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'documents_select') THEN
    EXECUTE $p$ CREATE POLICY "documents_select" ON storage.objects FOR SELECT USING (bucket_id = 'documents' AND auth.role() = 'authenticated' AND split_part(name, '/', 1) = (public.my_company_id())::text) $p$;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'documents_delete') THEN
    EXECUTE $p$ CREATE POLICY "documents_delete" ON storage.objects FOR DELETE USING (bucket_id = 'documents' AND auth.role() = 'authenticated' AND split_part(name, '/', 1) = (public.my_company_id())::text) $p$;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'clock_photos_insert') THEN
    EXECUTE $p$ CREATE POLICY "clock_photos_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'clock-photos' AND auth.role() = 'authenticated' AND split_part(name, '/', 1) = (public.my_company_id())::text) $p$;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'clock_photos_select') THEN
    EXECUTE $p$ CREATE POLICY "clock_photos_select" ON storage.objects FOR SELECT USING (bucket_id = 'clock-photos' AND auth.role() = 'authenticated' AND split_part(name, '/', 1) = (public.my_company_id())::text) $p$;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'project_photos_insert') THEN
    EXECUTE $p$ CREATE POLICY "project_photos_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'project-photos' AND auth.role() = 'authenticated' AND split_part(name, '/', 1) = (public.my_company_id())::text) $p$;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'project_photos_select') THEN
    EXECUTE $p$ CREATE POLICY "project_photos_select" ON storage.objects FOR SELECT USING (bucket_id = 'project-photos' AND auth.role() = 'authenticated' AND split_part(name, '/', 1) = (public.my_company_id())::text) $p$;
  END IF;
END $$;
