import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as path from 'path';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
]);

const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/jpg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
};

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

export function isAllowedImageMimeType(mimetype?: string) {
  return Boolean(mimetype && ALLOWED_IMAGE_TYPES.has(mimetype));
}

export function validateImageFile(file?: Express.Multer.File) {
  if (!file) {
    throw new BadRequestException('Image file is required');
  }

  if (!isAllowedImageMimeType(file.mimetype)) {
    throw new BadRequestException(
      'Only JPEG, PNG, GIF, and WebP images are allowed',
    );
  }

  const signatures = MAGIC_BYTES[file.mimetype] ?? [];
  const hasValidSignature = signatures.some((signature) =>
    signature.every((byte, index) => file.buffer[index] === byte),
  );

  if (!hasValidSignature) {
    throw new BadRequestException('File content does not match declared type');
  }
}

export function createImageFileName(file: Express.Multer.File) {
  const extension =
    EXTENSION_BY_MIME[file.mimetype] ||
    path.extname(file.originalname).toLowerCase() ||
    '.img';

  return `${Date.now()}-${randomUUID()}${extension}`;
}
