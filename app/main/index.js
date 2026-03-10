const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const axios = require('axios');

// Import core modules
const FileScanner = require('./scanner/FileScanner');
const OrganizationEngine = require('./engine/OrganizationEngine');
const FileSystemCommitter = require('./apply/FileSystemCommitter');
const extractorRegistry = require('./extractors');

let mainWindow;
const scanner = new FileScanner();
const engine = new OrganizationEngine();
const committer = new FileSystemCommitter();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // In development, load from Vite dev server
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/dist/index.html'));
  }
}

app.whenReady().then(async () => {
  console.log('SnapSort starting...');
  console.log('Registered extractors:', extractorRegistry.getSupportedMimeTypes().length);

  // Install Vue DevTools in development
  if (process.env.NODE_ENV === 'development') {
    try {
      const { default: installExtension, VUEJS_DEVTOOLS } = require('electron-devtools-installer');
      await installExtension(VUEJS_DEVTOOLS);
      console.log('Vue DevTools installed successfully');
    } catch (err) {
      console.error('Failed to install Vue DevTools:', err);
    }
  }

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// ==================== IPC Handlers ====================

/**
 * Select root folder
 */
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

/**
 * Scan folder
 */
ipcMain.handle('scan-folder', async (event, folderPath) => {
  try {
    console.log(`Starting scan of: ${folderPath}`);

    const scanResult = await scanner.scan(folderPath, (current, total) => {
      event.sender.send('scan-progress', { current, total });
    });

    // Initialize organization engine with scan results
    engine.initialize(scanResult.files, scanResult.folders, scanResult.rootNode);

    console.log(`Scan complete: ${scanResult.stats.totalFiles} files, ${scanResult.stats.totalFolders} folders`);

    return {
      success: true,
      stats: scanResult.stats,
      rootNode: scanResult.rootNode
    };
  } catch (error) {
    console.error('Scan error:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

/**
 * Get preview state
 */
ipcMain.handle('get-preview-state', async () => {
  const state = engine.getPreviewState();

  return {
    stats: state.stats,
    actions: state.actions,
    // Convert Maps to arrays for IPC transmission
    previewTree: Array.from(state.previewTree.values())
  };
});

/**
 * Extract content from files
 */
ipcMain.handle('extract-files', async (event, fileIds) => {
  const results = [];

  for (const fileId of fileIds) {
    const fileNode = scanner.getFileById(fileId);
    if (!fileNode) continue;

    try {
      const extracted = await extractorRegistry.extract(
        fileNode.path,
        fileNode.mimeType,
        fileId
      );

      if (extracted) {
        results.push({
          fileId,
          success: true,
          type: extracted.type,
          metadata: extracted.metadata
        });
      }

      event.sender.send('extract-progress', {
        current: results.length,
        total: fileIds.length
      });
    } catch (error) {
      console.error(`Extraction failed for ${fileId}:`, error);
      results.push({
        fileId,
        success: false,
        error: error.message
      });
    }
  }

  return results;
});

/**
 * Add organization action
 */
ipcMain.handle('add-action', async (event, actionData) => {
  try {
    const action = engine.addAction(actionData);
    return {
      success: true,
      action
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

/**
 * Remove action
 */
ipcMain.handle('remove-action', async (event, actionId) => {
  engine.removeAction(actionId);
  return { success: true };
});

/**
 * Reset all actions
 */
ipcMain.handle('reset-actions', async () => {
  engine.reset();
  committer.clearHistory();
  return { success: true };
});

/**
 * Apply changes to filesystem
 */
ipcMain.handle('apply-changes', async (event) => {
  try {
    const state = engine.getPreviewState();
    const pendingActions = state.actions.filter(a => !a.applied);

    if (pendingActions.length === 0) {
      return {
        success: true,
        applied: 0,
        message: 'No pending actions to apply'
      };
    }

    // Apply actions to filesystem
    const result = await committer.applyActions(pendingActions);

    event.sender.send('apply-progress', result);

    return result;
  } catch (error) {
    console.error('Apply changes error:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

/**
 * Rollback changes
 */
ipcMain.handle('rollback-changes', async (event, count) => {
  try {
    const result = await committer.rollback(count);
    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

/**
 * Call AI service for embeddings
 */
ipcMain.handle('ai:embed', async (event, { fileId, content, type }) => {
  try {
    // TODO: Call Python AI service via HTTP
    // For now, return mock embedding
    const mockEmbedding = new Array(512).fill(0).map(() => Math.random());

    engine.storeEmbedding(fileId, mockEmbedding, 'mock');

    return {
      success: true,
      fileId,
      embedding: mockEmbedding
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

/**
 * AI Organization - Main workflow
 */
ipcMain.handle('ai:organize', async (event, { tags, tagThreshold, clusterCount }) => {
  try {
    console.log('🚀 Starting AI Organization');
    console.log('Priority tags:', tags);
    console.log('Tag threshold:', tagThreshold);
    console.log('Cluster count:', clusterCount);

    const state = engine.getPreviewState();
    const allFiles = Array.from(state.originalTree.values()).filter(n => n.type === 'file');

    if (allFiles.length === 0) {
      return {
        success: false,
        error: 'No files to organize'
      };
    }

    // Step 1: Generate embeddings for all files
    console.log(`Step 1: Generating embeddings for ${allFiles.length} files...`);
    event.sender.send('ai-progress', { step: 1, message: 'Generating embeddings...', progress: 0 });

    const embeddings = await generateEmbeddings(allFiles, event);

    // Step 2: Match files to priority tags (if any)
    const taggedFiles = new Set();
    const tagActions = [];

    if (tags && tags.length > 0) {
      console.log(`Step 2: Matching files to ${tags.length} priority tags...`);
      event.sender.send('ai-progress', { step: 2, message: 'Matching priority tags...', progress: 30 });

      const tagResults = await matchFilesToTags(allFiles, tags, embeddings, tagThreshold, event);
      tagResults.matched.forEach(fileId => taggedFiles.add(fileId));
      tagActions.push(...tagResults.actions);
    }

    // Step 3: Cluster remaining files
    const untaggedFiles = allFiles.filter(f => !taggedFiles.has(f.id));
    console.log(`Step 3: Clustering ${untaggedFiles.length} untagged files into ${clusterCount} clusters...`);
    event.sender.send('ai-progress', { step: 3, message: 'Clustering files...', progress: 60 });

    const clusterActions = await clusterFiles(untaggedFiles, embeddings, clusterCount, event);

    // Step 4: Generate folder names for clusters
    console.log('Step 4: Generating AI folder names...');
    event.sender.send('ai-progress', { step: 4, message: 'Naming clusters...', progress: 85 });

    const namedActions = await generateClusterNames(clusterActions, event);

    // Combine all actions
    const allActions = [...tagActions, ...namedActions];

    console.log(`✅ Organization complete: ${allActions.length} actions generated`);
    event.sender.send('ai-progress', { step: 5, message: 'Complete!', progress: 100 });

    return {
      success: true,
      actions: allActions,
      stats: {
        totalFiles: allFiles.length,
        taggedFiles: taggedFiles.size,
        clusteredFiles: untaggedFiles.length,
        totalActions: allActions.length
      }
    };
  } catch (error) {
    console.error('AI Organization error:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

/**
 * Helper: Generate embeddings for files
 */
async function generateEmbeddings(files, event) {
  const axios = require('axios');
  const embeddings = new Map();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const progress = Math.floor((i / files.length) * 30);
    event.sender.send('ai-progress', { step: 1, message: `Processing ${i + 1}/${files.length} files...`, progress });

    try {
      // Extract content
      const extracted = await extractorRegistry.extract(file.path, file.mimeType, file.id);

      if (!extracted) {
        console.warn(`Could not extract content from ${file.name}`);
        continue;
      }

      // Call AI service based on content type
      let embedding;
      if (extracted.type === 'image') {
        const response = await axios.post('http://localhost:8000/embed/image', {
          image_path: file.path
        }, { timeout: 5000 });
        embedding = response.data.embedding;
      } else if (extracted.type === 'text') {
        const response = await axios.post('http://localhost:8000/embed/text', {
          text: extracted.content.substring(0, 1000) // Limit text length
        }, { timeout: 5000 });
        embedding = response.data.embedding;
      } else {
        console.warn(`Unsupported content type: ${extracted.type}`);
        continue;
      }

      embeddings.set(file.id, embedding);
      engine.storeEmbedding(file.id, embedding, extracted.type === 'image' ? 'clip' : 'sentence-transformers');
    } catch (error) {
      console.error(`Error embedding ${file.name}:`, error.message);
    }
  }

  console.log(`Generated ${embeddings.size} embeddings`);
  return embeddings;
}

/**
 * Helper: Match files to priority tags
 */
async function matchFilesToTags(files, tags, embeddings, threshold, event) {
  const axios = require('axios');
  const matched = new Set();
  const actions = [];

  // Generate embeddings for tag names
  const tagEmbeddings = new Map();
  for (const tag of tags) {
    try {
      const response = await axios.post('http://localhost:8000/embed/text', {
        text: tag.name
      }, { timeout: 5000 });
      tagEmbeddings.set(tag.name, response.data.embedding);
    } catch (error) {
      console.error(`Error embedding tag "${tag.name}":`, error.message);
    }
  }

  // Match each file to best tag
  for (const file of files) {
    const fileEmbedding = embeddings.get(file.id);
    if (!fileEmbedding) continue;

    let bestTag = null;
    let bestSimilarity = 0;

    for (const tag of tags) {
      const tagEmbedding = tagEmbeddings.get(tag.name);
      if (!tagEmbedding) continue;

      const similarity = cosineSimilarity(fileEmbedding, tagEmbedding);
      if (similarity > bestSimilarity && similarity >= threshold) {
        bestSimilarity = similarity;
        bestTag = tag;
      }
    }

    if (bestTag) {
      matched.add(file.id);

      // Create folder structure for tag hierarchy
      const folderPath = tags.slice(0, tags.indexOf(bestTag) + 1).map(t => t.name).join('/');

      actions.push({
        type: 'move',
        fileId: file.id,
        params: {
          oldPath: file.path,
          newPath: path.join(scanner.getRootPath(), folderPath, file.name)
        },
        metadata: {
          reason: 'priority_tag',
          tag: bestTag.name,
          similarity: bestSimilarity
        }
      });
    }
  }

  console.log(`Matched ${matched.size} files to priority tags`);
  return { matched, actions };
}

/**
 * Helper: Cluster untagged files
 */
async function clusterFiles(files, embeddings, clusterCount, event) {
  // Get embeddings for untagged files
  const fileEmbeddings = files
    .map(f => ({ file: f, embedding: embeddings.get(f.id) }))
    .filter(item => item.embedding);

  if (fileEmbeddings.length === 0) {
    return [];
  }

  // Simple K-Means clustering
  const clusters = kMeansClustering(fileEmbeddings, Math.min(clusterCount, fileEmbeddings.length));

  // Create move actions for each cluster
  const actions = [];
  clusters.forEach((clusterFiles, clusterIndex) => {
    clusterFiles.forEach(item => {
      actions.push({
        type: 'move',
        fileId: item.file.id,
        params: {
          oldPath: item.file.path,
          newPath: path.join(scanner.getRootPath(), `AI-Cluster-${clusterIndex + 1}`, item.file.name)
        },
        metadata: {
          reason: 'ai_cluster',
          clusterId: clusterIndex
        }
      });
    });
  });

  console.log(`Clustered ${fileEmbeddings.length} files into ${clusters.length} clusters`);
  return actions;
}

/**
 * Helper: Generate descriptive names for AI clusters
 */
async function generateClusterNames(clusterActions, event) {
  const axios = require('axios');
  const clusterGroups = new Map();

  // Group actions by cluster
  clusterActions.forEach(action => {
    const clusterId = action.metadata.clusterId;
    if (!clusterGroups.has(clusterId)) {
      clusterGroups.set(clusterId, []);
    }
    clusterGroups.get(clusterId).push(action);
  });

  // Generate names for each cluster
  for (const [clusterId, actions] of clusterGroups.entries()) {
    // Get sample file names from cluster
    const sampleNames = actions.slice(0, 10).map(a => {
      const fileNode = scanner.getFileById(a.fileId);
      return fileNode ? fileNode.name : '';
    }).filter(n => n);

    try {
      // Call AI to generate descriptive name
      const response = await axios.post('http://localhost:8000/generate-cluster-name', {
        file_names: sampleNames
      }, { timeout: 5000 });

      const aiName = response.data.cluster_name || `AI-Cluster-${clusterId + 1}`;

      // Update all actions in this cluster with new folder name
      actions.forEach(action => {
        action.params.newPath = action.params.newPath.replace(
          `AI-Cluster-${clusterId + 1}`,
          aiName
        );
      });
    } catch (error) {
      console.error(`Error generating name for cluster ${clusterId}:`, error.message);
      // Keep default name
    }
  }

  return clusterActions;
}

/**
 * Helper: Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Helper: Simple K-Means clustering
 */
function kMeansClustering(items, k, maxIterations = 10) {
  if (items.length === 0) return [];
  if (k >= items.length) return items.map(item => [item]);

  const dim = items[0].embedding.length;

  // Initialize centroids randomly
  let centroids = [];
  const usedIndices = new Set();
  while (centroids.length < k) {
    const idx = Math.floor(Math.random() * items.length);
    if (!usedIndices.has(idx)) {
      centroids.push([...items[idx].embedding]);
      usedIndices.add(idx);
    }
  }

  let clusters = [];

  for (let iter = 0; iter < maxIterations; iter++) {
    // Assign items to nearest centroid
    clusters = Array(k).fill(null).map(() => []);

    items.forEach(item => {
      let bestCluster = 0;
      let bestDist = Infinity;

      for (let c = 0; c < k; c++) {
        const dist = euclideanDistance(item.embedding, centroids[c]);
        if (dist < bestDist) {
          bestDist = dist;
          bestCluster = c;
        }
      }

      clusters[bestCluster].push(item);
    });

    // Update centroids
    const newCentroids = clusters.map(cluster => {
      if (cluster.length === 0) return centroids[0]; // Avoid empty clusters

      const sum = new Array(dim).fill(0);
      cluster.forEach(item => {
        item.embedding.forEach((val, i) => sum[i] += val);
      });
      return sum.map(val => val / cluster.length);
    });

    centroids = newCentroids;
  }

  return clusters.filter(c => c.length > 0);
}

/**
 * Helper: Calculate Euclidean distance
 */
function euclideanDistance(vecA, vecB) {
  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    const diff = vecA[i] - vecB[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

console.log('SnapSort IPC handlers registered');
