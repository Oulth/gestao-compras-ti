import { supabase } from './supabase';

const BUCKET_NAME = 'comprovantes-nf';

/**
 * Realiza upload de arquivo de nota fiscal / comprovante para o Supabase Storage.
 * Gera nome de arquivo higienizado com timestamp para evitar colisões.
 */
export async function uploadComprovanteNf(
  file: File
): Promise<{ url: string; nome: string }> {
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${Date.now()}-${sanitizedName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('[storageService] Erro no upload do comprovante:', uploadError);
    throw new Error(`Falha no upload do anexo: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return {
    url: publicUrlData.publicUrl,
    nome: file.name,
  };
}

/**
 * Remove um arquivo de comprovante do bucket no Supabase Storage.
 * Aceita tanto o caminho relativo quanto a URL pública completa.
 */
export async function deleteComprovanteNf(pathOrUrl: string): Promise<void> {
  if (!pathOrUrl) return;

  let filePath = pathOrUrl;

  // Se for URL completa, extrai o caminho relativo após o nome do bucket
  if (pathOrUrl.includes(`/${BUCKET_NAME}/`)) {
    const parts = pathOrUrl.split(`/${BUCKET_NAME}/`);
    if (parts.length > 1) {
      filePath = parts[1].split('?')[0]; // remove query params se houver
    }
  }

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);

  if (error) {
    console.warn(`[storageService] Falha ao excluir arquivo (${filePath}):`, error.message);
    // Não lança exceção impeditiva caso o arquivo já tenha sido removido
  }
}
