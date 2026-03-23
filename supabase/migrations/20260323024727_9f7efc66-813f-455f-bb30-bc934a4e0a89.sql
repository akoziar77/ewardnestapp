
-- Create receipts storage bucket
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- Users can upload their own receipts
create policy "Users can upload receipts"
on storage.objects for insert to authenticated
with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = 'receipts' and (storage.foldername(name))[2] = auth.uid()::text);

-- Users can view their own receipts
create policy "Users can view own receipts"
on storage.objects for select to authenticated
using (bucket_id = 'receipts' and (storage.foldername(name))[2] = auth.uid()::text);

-- Service role can manage all receipts
create policy "Service role manages receipts"
on storage.objects for all to public
using (bucket_id = 'receipts' and auth.role() = 'service_role')
with check (bucket_id = 'receipts' and auth.role() = 'service_role');
