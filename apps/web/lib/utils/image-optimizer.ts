/**
 * Client-side image optimization utility
 * Resizes, compresses, and converts images to WebP before uploading.
 */

export interface OptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  convertToWebP?: boolean;
}

export async function optimizeImage(
  file: File,
  options: OptimizationOptions = {},
): Promise<File> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.8,
    convertToWebP = true,
  } = options;

  // Skip optimization if not an image or if it's a GIF/SVG (to preserve animations/vectors)
  if (!file.type.startsWith('image/') || file.type.includes('gif') || file.type.includes('svg')) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        // Calculate new dimensions keeping aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        // Draw image on canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file); // Fallback to original
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Determine output mime type
        const outputMime = convertToWebP ? 'image/webp' : file.type;
        const extension = convertToWebP ? 'webp' : file.name.split('.').pop();
        const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        const newFileName = `${baseName}.${extension}`;

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            // Create a new File object from the blob
            const optimizedFile = new File([blob], newFileName, {
              type: outputMime,
              lastModified: Date.now(),
            });
            resolve(optimizedFile);
          },
          outputMime,
          quality,
        );
      };
      img.onerror = () => {
        resolve(file); // Fallback to original if loading fails
      };
    };
    reader.onerror = () => {
      resolve(file); // Fallback to original if reading fails
    };
  });
}
