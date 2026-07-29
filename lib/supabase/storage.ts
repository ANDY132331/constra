import { getClient } from "./client";

function dataUrlToBlob(dataUrl: string): { blob: Blob; mime: string } {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "application/octet-stream";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { blob: new Blob([bytes], { type: mime }), mime };
}

// Upload a base64 dataUrl to Supabase Storage and return the public URL.
// Path format: {companyId}/{filename}  — RLS policies scope by first folder segment.
export async function uploadPhoto(
  dataUrl: string,
  bucket: "clock-photos" | "project-photos",
  companyId: string,
  filename: string,
): Promise<string | null> {
  try {
    const supabase = getClient();
    const { blob, mime } = dataUrlToBlob(dataUrl);
    const path = `${companyId}/${filename}`;
    const { error } = await supabase.storage.from(bucket).upload(path, blob, {
      contentType: mime,
      upsert: true,
    });
    if (error) { console.error("[uploadPhoto]", error.message); return null; }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.error("[uploadPhoto] unexpected error", err);
    return null;
  }
}

// Upload any file to the "documents" bucket and return the public URL.
export async function uploadDocument(
  dataUrl: string,
  companyId: string,
  filename: string,
): Promise<string | null> {
  try {
    const supabase = getClient();
    const { blob, mime } = dataUrlToBlob(dataUrl);
    const safeName = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const path = `${companyId}/${safeName}`;
    const { error } = await supabase.storage.from("documents").upload(path, blob, {
      contentType: mime,
      upsert: false,
    });
    if (error) { console.error("[uploadDocument]", error.message); return null; }
    const { data } = supabase.storage.from("documents").getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.error("[uploadDocument] unexpected error", err);
    return null;
  }
}
