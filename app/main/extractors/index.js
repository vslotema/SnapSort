const ImageExtractor = require('./ImageExtractor');
const TextExtractor = require('./TextExtractor');

/**
 * Extractor Registry
 * Manages all file content extractors
 */
class ExtractorRegistry {
  constructor() {
    this.extractors = [];
    this._registerDefaultExtractors();
  }

  _registerDefaultExtractors() {
    this.register(new ImageExtractor());
    this.register(new TextExtractor());
  }

  /**
   * Register a new extractor
   * @param {BaseExtractor} extractor
   */
  register(extractor) {
    this.extractors.push(extractor);
    console.log(`Registered extractor: ${extractor.name}`);
  }

  /**
   * Find extractor for given MIME type
   * @param {string} mimeType
   * @returns {BaseExtractor|null}
   */
  getExtractor(mimeType) {
    return this.extractors.find(ext => ext.supports(mimeType)) || null;
  }

  /**
   * Extract content from file
   * @param {string} filePath
   * @param {string} mimeType
   * @param {string} fileId
   * @returns {Promise<ExtractedContent|null>}
   */
  async extract(filePath, mimeType, fileId) {
    const extractor = this.getExtractor(mimeType);

    if (!extractor) {
      console.log(`No extractor found for MIME type: ${mimeType}`);
      return null;
    }

    try {
      return await extractor.extractContent(filePath, fileId);
    } catch (error) {
      console.error(`Extraction failed for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Check if we can extract content from this MIME type
   * @param {string} mimeType
   * @returns {boolean}
   */
  canExtract(mimeType) {
    return this.getExtractor(mimeType) !== null;
  }

  /**
   * Get list of all supported MIME types
   * @returns {string[]}
   */
  getSupportedMimeTypes() {
    const types = new Set();
    this.extractors.forEach(ext => {
      if (ext.supportedMimeTypes) {
        ext.supportedMimeTypes.forEach(type => types.add(type));
      }
    });
    return Array.from(types);
  }
}

module.exports = new ExtractorRegistry();
