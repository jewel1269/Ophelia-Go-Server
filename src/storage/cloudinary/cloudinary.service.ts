import { Injectable } from '@nestjs/common';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';
import toStream from 'buffer-to-stream';

@Injectable()
export class CloudinaryService {
  async uploadFile(file: Express.Multer.File): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder: 'profile',
          transformation: [{ width: 500, height: 500, crop: 'fill' }],
        },
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined,
        ) => {
          if (error)
            return reject(
              new Error(error.message || 'Cloudinary upload failed'),
            );
          if (!result)
            return reject(
              new Error('Cloudinary upload failed: No result found'),
            );
          resolve(result);
        },
      );

      if (file.buffer) {
        toStream(file.buffer).pipe(upload);
      } else {
        reject(new Error('File buffer is empty'));
      }
    });
  }

  async deleteFile(publicId: string): Promise<any> {
    try {
      return await cloudinary.uploader.destroy(publicId);
    } catch (_error) {
      throw new Error(`Failed to delete file: ${publicId}`);
    }
  }
}
