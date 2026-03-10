const { IExtractor } = require('../../../shared/types');

/**
 * Base class for file content extractors
 */
class BaseExtractor extends IExtractor {
  constructor(name) {
    super();
    this.name = name;
  }

  /**
   * Check if this extractor supports the given MIME type
   * @param {string} mimeType
   * @returns {boolean}
   */
  supports(mimeType) {
    throw new Error(`${this.name}: supports() must be implemented`);
  }

  /**
   * Extract content from file
   * @param {string} filePath
   * @param {string} fileId
   * @returns {Promise<ExtractedContent>}
   */
  async extractContent(filePath, fileId) {
    throw new Error(`${this.name}: extractContent() must be implemented`);
  }
}

module.exports = BaseExtractor;
