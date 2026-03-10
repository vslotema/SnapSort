const crypto = require('crypto');

/**
 * Organization Engine
 * Manages preview state and organization actions
 * All changes are kept in memory until user confirms
 */
class OrganizationEngine {
  constructor() {
    this.originalTree = new Map();
    this.previewTree = new Map();
    this.actions = [];
    this.embeddings = new Map();
  }

  /**
   * Initialize with scanned file tree
   * @param {Map} files - Scanned files map
   * @param {Map} folders - Scanned folders map
   * @param {FileNode} rootNode - Root folder node
   */
  initialize(files, folders, rootNode) {
    // Deep clone original tree
    this.originalTree = new Map([
      ...Array.from(files.entries()),
      ...Array.from(folders.entries())
    ]);

    // Create preview tree (initially same as original)
    this.previewTree = new Map(this.originalTree);

    this.rootNode = rootNode;
    this.actions = [];

    console.log(`Initialized with ${files.size} files and ${folders.size} folders`);
  }

  /**
   * Get preview state
   * @returns {PreviewState}
   */
  getPreviewState() {
    return {
      originalTree: this.originalTree,
      previewTree: this.previewTree,
      actions: this.actions,
      embeddings: this.embeddings,
      stats: {
        totalFiles: Array.from(this.originalTree.values()).filter(n => n.type === 'file').length,
        totalFolders: Array.from(this.originalTree.values()).filter(n => n.type === 'folder').length,
        pendingActions: this.actions.filter(a => !a.applied).length
      }
    };
  }

  /**
   * Add organization action to preview
   * @param {OrganizationAction} action
   */
  addAction(action) {
    action.id = this._generateActionId();
    action.applied = false;
    action.createdAt = new Date();

    this.actions.push(action);
    this._applyToPreview(action);

    console.log(`Added action: ${action.type} for ${action.fileId}`);
    return action;
  }

  /**
   * Apply action to preview tree (not filesystem)
   * @private
   */
  _applyToPreview(action) {
    const node = this.previewTree.get(action.fileId);
    if (!node) {
      console.error(`Node not found: ${action.fileId}`);
      return;
    }

    switch (action.type) {
      case 'move':
        this._previewMove(node, action.params.newPath);
        break;

      case 'rename':
        this._previewRename(node, action.params.newName);
        break;

      case 'delete':
        this._previewDelete(node);
        break;

      case 'create_folder':
        this._previewCreateFolder(action.params.path, action.params.name);
        break;

      case 'merge':
        this._previewMerge(node, action.params.mergeWith);
        break;

      default:
        console.warn(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Preview move operation
   * @private
   */
  _previewMove(node, newPath) {
    const updatedNode = { ...node, path: newPath };
    this.previewTree.set(node.id, updatedNode);
  }

  /**
   * Preview rename operation
   * @private
   */
  _previewRename(node, newName) {
    const updatedNode = { ...node, name: newName };
    this.previewTree.set(node.id, updatedNode);
  }

  /**
   * Preview delete operation
   * @private
   */
  _previewDelete(node) {
    const updatedNode = { ...node, deleted: true };
    this.previewTree.set(node.id, updatedNode);
  }

  /**
   * Preview create folder operation
   * @private
   */
  _previewCreateFolder(parentPath, folderName) {
    const newPath = require('path').join(parentPath, folderName);
    const newId = this._generateId(newPath);

    const newFolder = {
      id: newId,
      path: newPath,
      name: folderName,
      type: 'folder',
      children: [],
      isNew: true
    };

    this.previewTree.set(newId, newFolder);
  }

  /**
   * Preview merge operation
   * @private
   */
  _previewMerge(node, mergeWithIds) {
    // Mark other nodes as merged into this one
    mergeWithIds.forEach(id => {
      const targetNode = this.previewTree.get(id);
      if (targetNode) {
        const updatedNode = { ...targetNode, mergedInto: node.id };
        this.previewTree.set(id, updatedNode);
      }
    });
  }

  /**
   * Remove action from preview
   * @param {string} actionId
   */
  removeAction(actionId) {
    const index = this.actions.findIndex(a => a.id === actionId);
    if (index > -1) {
      this.actions.splice(index, 1);
      this._rebuildPreview();
    }
  }

  /**
   * Rebuild preview tree from scratch
   * @private
   */
  _rebuildPreview() {
    // Reset preview to original
    this.previewTree = new Map(this.originalTree);

    // Reapply all actions
    this.actions.forEach(action => this._applyToPreview(action));
  }

  /**
   * Clear all actions and reset preview
   */
  reset() {
    this.actions = [];
    this.previewTree = new Map(this.originalTree);
  }

  /**
   * Store file embedding
   * @param {string} fileId
   * @param {number[]} vector
   * @param {string} model
   */
  storeEmbedding(fileId, vector, model) {
    this.embeddings.set(fileId, {
      fileId,
      vector,
      model,
      createdAt: new Date()
    });
  }

  /**
   * Get embedding for file
   * @param {string} fileId
   * @returns {FileEmbedding|null}
   */
  getEmbedding(fileId) {
    return this.embeddings.get(fileId) || null;
  }

  /**
   * Generate unique action ID
   * @private
   */
  _generateActionId() {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique ID
   * @private
   */
  _generateId(str) {
    return crypto.createHash('sha256').update(str).digest('hex').substring(0, 16);
  }
}

module.exports = OrganizationEngine;
