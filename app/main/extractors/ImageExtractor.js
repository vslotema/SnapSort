const BaseExtractor = require('./BaseExtractor');
const fs = require('fs').promises;

/**
 * Extractor for image files
 * Extracts image buffer for CLIP embedding
 */
class ImageExtractor extends BaseExtractor {
  constructor() {
    super('ImageExtractor');
    this.supportedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/heic',
      'image/heif'
    ];
  }

  supports(mimeType) {
    return this.supportedMimeTypes.includes(mimeType);
  }

  async extractContent(filePath, fileId) {
    try {
      // Read image as buffer for CLIP processing
      const buffer = await fs.readFile(filePath);

      return {
        fileId,
        type: 'image',
        content: buffer,
        metadata: {
          size: buffer.length,
          mimeType: this._getMimeType(filePath)
        }
      };
    } catch (error) {
      console.error(`ImageExtractor error for ${filePath}:`, error);
      throw error;
    }
  }

  _getMimeType(filePath) {
    const ext = filePath.split('.').pop().toLowerCase();
    const mimeMap = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'heic': 'image/heic',
      'heif': 'image/heif'
    };
    return mimeMap[ext] || 'image/jpeg';
  }
}

module.exports = ImageExtractor;
