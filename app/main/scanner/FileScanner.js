const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const mime = require('mime-types');

/**
 * File Scanner - Recursively scans folders and builds file tree
 */
class FileScanner {
  constructor() {
    this.scannedFiles = new Map();
    this.scannedFolders = new Map();
    this.rootPath = null;
  }

  /**
   * Scan root folder and build file tree
   * @param {string} rootPath - Root folder path
   * @param {Function} onProgress - Progress callback (current, total)
   * @returns {Promise<{files: Map, folders: Map, rootNode: FileNode}>}
   */
  async scan(rootPath, onProgress = null) {
    this.scannedFiles.clear();
    this.scannedFolders.clear();
    this.rootPath = rootPath;

    const rootNode = await this._scanDirectory(rootPath, null, onProgress);

    return {
      files: this.scannedFiles,
      folders: this.scannedFolders,
      rootNode,
      stats: {
        totalFiles: this.scannedFiles.size,
        totalFolders: this.scannedFolders.size
      }
    };
  }

  /**
   * Recursively scan directory
   * @private
   */
  async _scanDirectory(dirPath, parentId, onProgress) {
    try {
      const stats = await fs.stat(dirPath);
      const id = this._generateId(dirPath);

      const folderNode = {
        id,
        path: dirPath,
        name: path.basename(dirPath),
        type: 'folder',
        children: [],
        parentId,
        created: stats.birthtime,
        modified: stats.mtime
      };

      this.scannedFolders.set(id, folderNode);

      // Read directory contents
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        // Skip hidden files/folders
        if (entry.name.startsWith('.')) {
          continue;
        }

        if (entry.isDirectory()) {
          // Recursively scan subdirectory
          const childNode = await this._scanDirectory(fullPath, id, onProgress);
          folderNode.children.push(childNode);
        } else if (entry.isFile()) {
          // Process file
          const fileNode = await this._processFile(fullPath, id);
          if (fileNode) {
            folderNode.children.push(fileNode);

            if (onProgress) {
              onProgress(this.scannedFiles.size, -1); // -1 means total unknown yet
            }
          }
        }
      }

      return folderNode;
    } catch (error) {
      console.error(`Error scanning ${dirPath}:`, error);
      return null;
    }
  }

  /**
   * Process individual file
   * @private
   */
  async _processFile(filePath, parentId) {
    try {
      const stats = await fs.stat(filePath);
      const mimeType = mime.lookup(filePath) || 'application/octet-stream';
      const id = this._generateId(filePath);

      const fileNode = {
        id,
        path: filePath,
        name: path.basename(filePath),
        type: 'file',
        mimeType,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        parentId
      };

      this.scannedFiles.set(id, fileNode);
      return fileNode;
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Generate unique ID for file/folder
   * @private
   */
  _generateId(filePath) {
    return crypto.createHash('sha256').update(filePath).digest('hex').substring(0, 16);
  }

  /**
   * Get file node by ID
   * @param {string} id
   * @returns {FileNode|null}
   */
  getFileById(id) {
    return this.scannedFiles.get(id) || this.scannedFolders.get(id) || null;
  }

  /**
   * Get all files with a specific MIME type
   * @param {string} mimeType
   * @returns {FileNode[]}
   */
  getFilesByMimeType(mimeType) {
    return Array.from(this.scannedFiles.values())
      .filter(file => file.mimeType && file.mimeType.startsWith(mimeType));
  }

  /**
   * Get root path of last scan
   * @returns {string|null}
   */
  getRootPath() {
    return this.rootPath;
  }
}

module.exports = FileScanner;
