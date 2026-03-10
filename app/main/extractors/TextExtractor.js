const BaseExtractor = require('./BaseExtractor');
const fs = require('fs').promises;

/**
 * Extractor for text files
 * Extracts raw text content for sentence embedding
 */
class TextExtractor extends BaseExtractor {
  constructor() {
    super('TextExtractor');
    this.supportedMimeTypes = [
      'text/plain',
      'text/markdown',
      'text/html',
      'text/csv',
      'application/json',
      'application/javascript',
      'text/javascript'
    ];
  }

  supports(mimeType) {
    return this.supportedMimeTypes.includes(mimeType) ||
           mimeType.startsWith('text/');
  }

  async extractContent(filePath, fileId) {
    try {
      // Read text file as UTF-8 string
      const text = await fs.readFile(filePath, 'utf-8');

      // For large files, truncate to first 5000 characters
      const content = text.length > 5000 ? text.substring(0, 5000) : text;

      return {
        fileId,
        type: 'text',
        content,
        metadata: {
          size: text.length,
          truncated: text.length > 5000,
          encoding: 'utf-8'
        }
      };
    } catch (error) {
      console.error(`TextExtractor error for ${filePath}:`, error);
      throw error;
    }
  }
}

module.exports = TextExtractor;
