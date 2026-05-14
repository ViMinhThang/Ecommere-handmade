import { BadRequestException } from '@nestjs/common';
import {
  createImageFileName,
  isAllowedImageMimeType,
  validateImageFile,
} from './image-upload';

function imageFile(
  mimetype: string,
  bytes: number[],
  originalname = 'upload.png',
) {
  return {
    mimetype,
    originalname,
    buffer: Buffer.from(bytes),
  } as Express.Multer.File;
}

describe('image-upload utils', () => {
  it('allows only image MIME types', () => {
    expect(isAllowedImageMimeType('image/png')).toBe(true);
    expect(isAllowedImageMimeType('text/plain')).toBe(false);
  });

  it('rejects a declared image whose magic bytes do not match', () => {
    expect(() =>
      validateImageFile(imageFile('image/png', [0x25, 0x50, 0x44, 0x46])),
    ).toThrow(BadRequestException);
  });

  it('uses a random server-side filename with the MIME-derived extension', () => {
    const file = imageFile('image/png', [0x89, 0x50, 0x4e, 0x47]);

    validateImageFile(file);
    const fileName = createImageFileName(file);

    expect(fileName).toMatch(/\.png$/);
    expect(fileName).not.toContain(file.originalname);
  });
});
