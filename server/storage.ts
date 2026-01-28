// Storage helpers using Cloudinary
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function getStorageConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary credentials missing: set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET"
    );
  }
  
  return { cloudName, apiKey, apiSecret };
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  getStorageConfig();
  
  let base64Data: string;
  if (typeof data === 'string') {
    base64Data = Buffer.from(data).toString('base64');
  } else {
    base64Data = Buffer.from(data).toString('base64');
  }
  
  let resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto';
  if (contentType.startsWith('image/')) {
    resourceType = 'image';
  } else if (contentType.startsWith('video/') || contentType.startsWith('audio/')) {
    resourceType = 'video';
  } else {
    resourceType = 'raw';
  }
  
  const result = await cloudinary.uploader.upload(
    `data:${contentType};base64,${base64Data}`,
    {
      public_id: relKey.replace(/\.[^/.]+$/, ''),
      resource_type: resourceType,
      folder: 'company-wiki',
    }
  );
  
  return { 
    key: result.public_id, 
    url: result.secure_url 
  };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  getStorageConfig();
  
  const url = cloudinary.url(relKey, {
    secure: true,
  });
  
  return { key: relKey, url };
}
