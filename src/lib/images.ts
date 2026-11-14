const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface CompressImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: 'image/jpeg' | 'image/webp';
  maxBytes?: number;
}

export interface CompressedImage {
  file: File;
  width: number;
  height: number;
}

export function isSupportedImage(file: File) {
  return ALLOWED_IMAGE_TYPES.includes(file.type);
}

function extensionFor(mimeType: string) {
  return mimeType === 'image/webp' ? 'webp' : 'jpg';
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Gambar gagal diproses. Coba pilih foto lain.'));
      },
      mimeType,
      quality,
    );
  });
}

async function loadBitmap(file: File) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // Safari lama bisa gagal untuk sebagian file; fallback ke <img>.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () =>
        reject(new Error('Foto tidak bisa dibaca. Coba pilih foto lain.'));
      element.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function bitmapSize(source: ImageBitmap | HTMLImageElement) {
  if (source instanceof HTMLImageElement) {
    return { width: source.naturalWidth, height: source.naturalHeight };
  }
  return { width: source.width, height: source.height };
}

function drawSource(
  source: ImageBitmap | HTMLImageElement,
  width: number,
  height: number,
  mimeType: string,
) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Perangkat tidak mendukung pemrosesan gambar.');
  }

  // JPEG tidak mendukung transparansi; isi putih agar hasil tidak hitam.
  if (mimeType === 'image/jpeg') {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, 0, 0, width, height);

  return canvas;
}

/**
 * Kompres foto di sisi klien sebelum diunggah. Tujuan utamanya menekan
 * penggunaan kuota data pengguna HP dan mempercepat unggahan di jaringan
 * lambat, sekaligus menjaga ukuran file tetap di bawah batas storage.
 */
export async function compressImage(
  file: File,
  options: CompressImageOptions = {},
): Promise<CompressedImage> {
  if (!isSupportedImage(file)) {
    throw new Error('Gunakan foto JPG, PNG, atau WebP.');
  }

  const maxWidth = options.maxWidth ?? 1600;
  const maxHeight = options.maxHeight ?? 1600;
  const mimeType = options.mimeType ?? 'image/jpeg';
  const maxBytes = options.maxBytes ?? 1.5 * 1024 * 1024;
  let quality = options.quality ?? 0.82;

  const source = await loadBitmap(file);

  try {
    const original = bitmapSize(source);
    const scale = Math.min(
      1,
      maxWidth / Math.max(original.width, 1),
      maxHeight / Math.max(original.height, 1),
    );
    let width = Math.max(1, Math.round(original.width * scale));
    let height = Math.max(1, Math.round(original.height * scale));

    let blob = await canvasToBlob(
      drawSource(source, width, height, mimeType),
      mimeType,
      quality,
    );

    // Jika masih terlalu besar, turunkan kualitas lalu dimensi secara bertahap.
    for (let attempt = 0; blob.size > maxBytes && attempt < 5; attempt += 1) {
      if (quality > 0.5) {
        quality = Math.max(0.5, quality - 0.1);
      } else {
        width = Math.max(320, Math.round(width * 0.82));
        height = Math.max(320, Math.round(height * 0.82));
      }
      blob = await canvasToBlob(
        drawSource(source, width, height, mimeType),
        mimeType,
        quality,
      );
    }

    const extension = extensionFor(mimeType);
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'foto';
    const compressed = new File([blob], `${baseName}.${extension}`, {
      type: mimeType,
      lastModified: Date.now(),
    });

    return { file: compressed, width, height };
  } finally {
    if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) {
      source.close();
    }
  }
}

export async function compressImageToDataUrl(
  file: File,
  options: CompressImageOptions = {},
) {
  const { file: compressed } = await compressImage(file, {
    maxWidth: 1280,
    maxHeight: 1280,
    quality: 0.72,
    maxBytes: 450 * 1024,
    ...options,
  });

  return fileToDataUrl(compressed);
}

export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(new Error('Foto gagal disiapkan untuk disimpan offline.'));
    reader.readAsDataURL(file);
  });
}

export function dataUrlToFile(
  dataUrl: string,
  fileName: string,
  mimeType = 'image/jpeg',
) {
  const [, encoded = ''] = dataUrl.split(',');
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new File([bytes], fileName, { type: mimeType });
}
