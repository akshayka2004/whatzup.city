/** Readable reason for a failed direct-to-storage upload (signed URL PUT/POST). */
export async function storageUploadError(res: Response): Promise<string> {
  let detail = '';
  try {
    const b = await res.json();
    detail = String(b?.message || b?.error || '');
  } catch {
    // body was not JSON
  }

  let base: string;
  switch (res.status) {
    case 400:
      base = 'The storage service rejected the file. It may be an unsupported type or too large.';
      break;
    case 401:
    case 403:
      base = 'The upload link expired or is not allowed. Try uploading again.';
      break;
    case 404:
      base = 'The upload destination was not found. Please contact support.';
      break;
    case 413:
      base = 'The file is too large to upload.';
      break;
    case 415:
      base = 'That file type is not accepted. Use a JPG, PNG or WebP image.';
      break;
    default:
      base =
        res.status >= 500
          ? 'The storage service is having problems. Try again shortly.'
          : `The upload failed (error ${res.status}).`;
  }

  const generic = /^(bad request|unauthorized|forbidden|not found|invalid_request)$/i;
  return detail && !generic.test(detail.trim()) ? `${base} (${detail})` : base;
}
