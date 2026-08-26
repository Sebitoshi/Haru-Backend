import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'boti/avatars',
  ): Promise<{ url: string; publicId: string }> {
    console.log(`[CloudinaryService] Upload: ${file.originalname} to ${folder}`);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error || !result) {
            console.error(`[CloudinaryService] Upload ERROR:`, error?.message || 'No result');
            reject(error || new Error('Upload failed'));
          } else {
            console.log(`[CloudinaryService] Upload OK: ${result.public_id}`);
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
            });
          }
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    console.log(`[CloudinaryService] Delete: ${publicId}`);

    try {
      await cloudinary.uploader.destroy(publicId);
      console.log(`[CloudinaryService] Delete OK: ${publicId}`);
    } catch (error: any) {
      console.error(`[CloudinaryService] Delete ERROR: ${error.message}`);
    }
  }
}
