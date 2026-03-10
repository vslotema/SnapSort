const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload script - Secure bridge between main and renderer
 */
contextBridge.exposeInMainWorld('snapSortAPI', {
  // Folder operations
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  scanFolder: (folderPath) => ipcRenderer.invoke('scan-folder', folderPath),

  // Preview state
  getPreviewState: () => ipcRenderer.invoke('get-preview-state'),

  // Image thumbnails
  getImageThumbnail: (filePath) => ipcRenderer.invoke('get-image-thumbnail', filePath),

  // File extraction
  extractFiles: (fileIds) => ipcRenderer.invoke('extract-files', fileIds),

  // Organization actions
  addAction: (action) => ipcRenderer.invoke('add-action', action),
  removeAction: (actionId) => ipcRenderer.invoke('remove-action', actionId),
  resetActions: () => ipcRenderer.invoke('reset-actions'),

  // Apply/Rollback
  applyChanges: () => ipcRenderer.invoke('apply-changes'),
  rollbackChanges: (count) => ipcRenderer.invoke('rollback-changes', count),

  // AI operations
  embedFile: (fileId, content, type) =>
    ipcRenderer.invoke('ai:embed', { fileId, content, type }),
  organizeWithAI: (tags, tagThreshold, clusterCount) =>
    ipcRenderer.invoke('ai:organize', { tags, tagThreshold, clusterCount }),

  // Event listeners
  onScanProgress: (callback) => {
    ipcRenderer.on('scan-progress', (event, data) => callback(data));
  },

  onExtractProgress: (callback) => {
    ipcRenderer.on('extract-progress', (event, data) => callback(data));
  },

  onApplyProgress: (callback) => {
    ipcRenderer.on('apply-progress', (event, data) => callback(data));
  },

  onAIProgress: (callback) => {
    ipcRenderer.on('ai-progress', (event, data) => callback(data));
  }
});
