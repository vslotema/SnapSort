/**
 * SnapSort Type Definitions
 * Shared types across Electron main, renderer, and AI service
 */

/**
 * @typedef {Object} FileNode
 * @property {string} id - Unique identifier (hash of path)
 * @property {string} path - Absolute file path
 * @property {string} name - File/folder name
 * @property {string} type - 'file' | 'folder'
 * @property {string} [mimeType] - MIME type for files
 * @property {number} [size] - File size in bytes
 * @property {Date} [modified] - Last modified date
 * @property {Date} [created] - Creation date
 * @property {FileNode[]} [children] - Child nodes for folders
 * @property {string} [parentId] - Parent folder ID
 */

/**
 * @typedef {Object} ExtractedContent
 * @property {string} fileId - Reference to FileNode
 * @property {string} type - 'image' | 'text' | 'pdf' | 'csv' | 'other'
 * @property {Buffer|string} content - Extracted content
 * @property {Object} [metadata] - Additional metadata
 */

/**
 * @typedef {Object} FileEmbedding
 * @property {string} fileId
 * @property {number[]} vector - Embedding vector
 * @property {string} model - Model used (e.g., 'CLIP', 'SentenceTransformer')
 * @property {Date} createdAt
 */

/**
 * @typedef {Object} OrganizationAction
 * @property {string} id - Unique action ID
 * @property {string} type - 'move' | 'rename' | 'delete' | 'merge' | 'create_folder'
 * @property {string} fileId - Target file/folder ID
 * @property {Object} params - Action-specific parameters
 * @property {string} params.newPath - For move/rename
 * @property {string} params.newName - For rename
 * @property {string[]} params.mergeWith - For merge (array of file IDs)
 * @property {boolean} applied - Whether action has been committed to filesystem
 * @property {Date} createdAt
 */

/**
 * @typedef {Object} PreviewState
 * @property {Map<string, FileNode>} originalTree - Original filesystem structure
 * @property {Map<string, FileNode>} previewTree - Preview with suggested changes
 * @property {OrganizationAction[]} actions - Pending actions
 * @property {Map<string, FileEmbedding>} embeddings - File embeddings
 * @property {Object} stats
 * @property {number} stats.totalFiles
 * @property {number} stats.totalFolders
 * @property {number} stats.pendingActions
 */

/**
 * Extractor Plugin Interface
 * @interface IExtractor
 */
class IExtractor {
  /**
   * Check if this extractor supports the given MIME type
   * @param {string} mimeType
   * @returns {boolean}
   */
  supports(mimeType) {
    throw new Error('Not implemented');
  }

  /**
   * Extract content from file
   * @param {string} filePath
   * @returns {Promise<ExtractedContent>}
   */
  async extractContent(filePath) {
    throw new Error('Not implemented');
  }
}

module.exports = {
  IExtractor
};
