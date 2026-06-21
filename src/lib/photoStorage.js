import { supabase } from "./supabase";

const BUCKET = "audit-photos";

// Uploads a single photo file/blob for a given audit+item, returns the new audit_photos row
export async function uploadAuditPhoto(auditId, itemId, file) {
  const ext = file.name?.split(".").pop() || "jpg";
  const path = `${auditId}/${itemId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "image/jpeg",
    cacheControl: "3600",
  });
  if (uploadError) throw uploadError;

  const { data: row, error: dbError } = await supabase.from("audit_photos").insert([{
    audit_id: auditId,
    item_id: itemId,
    storage_path: path,
  }]).select().single();
  if (dbError) throw dbError;

  return { ...row, url: getPhotoUrl(path) };
}

export function getPhotoUrl(storagePath) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function getPhotosForItem(auditId, itemId) {
  const { data } = await supabase.from("audit_photos").select("*").eq("audit_id", auditId).eq("item_id", itemId).order("created_at");
  return (data || []).map((p) => ({ ...p, url: getPhotoUrl(p.storage_path) }));
}

export async function getAllPhotosForAudit(auditId) {
  const { data } = await supabase.from("audit_photos").select("*").eq("audit_id", auditId).order("created_at");
  return (data || []).map((p) => ({ ...p, url: getPhotoUrl(p.storage_path) }));
}

export async function deleteAuditPhoto(photoId, storagePath) {
  await supabase.storage.from(BUCKET).remove([storagePath]);
  await supabase.from("audit_photos").delete().eq("id", photoId);
}
