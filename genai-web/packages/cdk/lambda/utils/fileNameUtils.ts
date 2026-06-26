import crypto from 'node:crypto';

const SAFE_DOC_NAME_PATTERN = /[^a-zA-Z0-9 \-()[\]]/g;
const HASH_LENGTH = 8;

export const toSafeDocumentName = (filename: string): string => {
  const lastDotIndex = filename.lastIndexOf('.');
  const nameWithoutExt = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;

  const safeName = nameWithoutExt.replace(SAFE_DOC_NAME_PATTERN, '_');

  if (safeName !== nameWithoutExt) {
    const hash = crypto.createHash('md5').update(filename).digest('hex').substring(0, HASH_LENGTH);
    return `${safeName}_${hash}`;
  }

  return safeName;
};
