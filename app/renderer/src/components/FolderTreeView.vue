<template>
  <v-card flat height="100%" class="d-flex flex-column flex-fill">
    <v-card-title class="d-flex align-center justify-space-between">
      <span>Preview Folder Structure</span>
      <v-btn
        color="primary"
        variant="flat"
        @click="openOrganizeDialog"
        :disabled="!rootNode"
      >
        <vue-feather type="zap" size="18" class="mr-2"></vue-feather>
        Organize With AI
      </v-btn>
    </v-card-title>
    <v-divider></v-divider>
    <v-card-text class="pa-0 tree-container">
      <v-list v-if="rootNode" density="compact" class="pa-0">
        <tree-node 
          :key="(isPreviewMode ? previewTree : rootNode)?.id"
          :node="isPreviewMode ? previewTree : rootNode"
          :level="0" 
          @move-node="handleMoveNode" 
          @drag-start="isDragging = true"
          @drag-end="isDragging = false"
        />
      </v-list>
      <div v-else class="text-center pa-8">
        <vue-feather type="folder" size="48" stroke="lightgrey"></vue-feather>
        <p class="text-grey text-caption mt-2">No folder scanned</p>
      </div>
    </v-card-text>

    <!-- Fixed Apply Changes Button -->
    <v-btn
      v-if="rootNode"
      color="success"
      size="large"
      class="apply-changes-btn"
      @click="applyAllChanges"
      rounded="pill"
      elevation="4"
    >
      <vue-feather type="check" size="20" class="mr-2"></vue-feather>
      Apply Changes
    </v-btn>

    <!-- Organization Settings Dialog -->
    <OrganizationSettings
      :show="showOrganizeDialog"
      @close="showOrganizeDialog = false"
      @create-preview="handleCreatePreview"
    />
  </v-card>
</template>

<script setup>
import { ref, provide, watch} from 'vue';
import TreeNode from './TreeNode.vue';
import OrganizationSettings from './OrganizationSettings.vue';
import { useAppStore } from '../stores/app';

// Multi-select state - provide to all child TreeNodes
const selectedNodes = ref(new Set());
const draggedItems = ref([]); // Shared across all TreeNode instances
const isDragging = ref(false);
const isPreviewMode = ref(false);
const previewTree = ref([]);
const organizationResult = ref(null);

provide('selectedNodes', selectedNodes);
provide('draggedItems', draggedItems);
provide('rootNodeRef', () => props.rootNode);
provide('toggleSelection', (nodeId, ctrlKey) => {
  if (ctrlKey) {
    if (selectedNodes.value.has(nodeId)) {
      selectedNodes.value.delete(nodeId);
    } else {
      selectedNodes.value.add(nodeId);
    }
  } else {
    selectedNodes.value.clear();
    selectedNodes.value.add(nodeId);
  }
  // Trigger reactivity
  selectedNodes.value = new Set(selectedNodes.value);
});
provide('clearSelection', () => {
  selectedNodes.value.clear();
  selectedNodes.value = new Set(selectedNodes.value);
});

const props = defineProps({
  rootNode: {
    type: Object,
    default: null
  }
});

const appStore = useAppStore();
const showOrganizeDialog = ref(false);

watch(
  () => props.rootNode,
  (newVal) => {
    console.log('rootNode changed:', newVal);
    // Don't set draggedItems here — it's only for drag tracking
    // draggedItems is used internally in TreeNode for multi-select drag state
  },
  { immediate: true }
)

function openOrganizeDialog() {
  showOrganizeDialog.value = true;
}
async function handleCreatePreview(result) {
  console.log('Received organization result:', result);
  // Store result for preview
  organizationResult.value = result;
  previewTree.value = buildPreviewTree(result.actions);
  console.log('Preview tree built:', previewTree.value);
  isPreviewMode.value = true;
  // Add all actions to the engine
  for (const action of result.actions) {
    await window.snapSortAPI.addAction(action);
  }

}

async function handleOrganizationApplied() {
  // Refresh the folder structure after organization is applied
  showOrganizeDialog.value = false;

  // Rescan the folder to show the new structure
  const rootFolder = appStore.rootFolder;
  if (rootFolder) {
    try {
      const result = await window.snapSortAPI.scanFolder(rootFolder);
      if (result.success) {
        // Update the store with the new folder structure
        appStore.setRootNode(result.rootNode);
        appStore.setStats(result.stats);
      }
    } catch (error) {
      console.error('Error rescanning folder:', error);
    }
  }
}

function buildPreviewTree(actions) {
  console.log('Building preview tree with actions:', actions);
  const normalize = p => p.replace(/\\/g, '/').replace(/\/+$/, '');
  const base = normalize(appStore.rootFolder);

  // Deep clone the original root to preserve all metadata
  const root = JSON.parse(JSON.stringify(props.rootNode));

  // Build a map of all original files by id for quick lookup
  const filesById = new Map();
  const collectFiles = (node) => {
    if (node.type === 'file') filesById.set(node.id, node);
    if (node.children) node.children.forEach(collectFiles);
  };
  collectFiles(root);

  // Clear children — we'll rebuild from actions
  root.children = [];

  // Helper: find or create a folder by path
  const getOrCreateFolder = (folderPath, parentNode) => {
    const parts = normalize(folderPath).replace(base + '/', '').split('/').filter(Boolean);
    let currentNode = parentNode;
    let currentPath = base;

    for (const folderName of parts) {
      currentPath = `${currentPath}/${folderName}`;
      let child = currentNode.children.find(c => c.name === folderName && c.type === 'folder');
      if (!child) {
        child = {
          id: `folder-${currentPath.replace(/\//g, '-')}`,
          path: currentPath,
          name: folderName,
          type: 'folder',
          children: [],
          parentId: currentNode.id,
          created: new Date().toISOString(),
          modified: new Date().toISOString()
        };
        currentNode.children.push(child);
      }
      currentNode = child;
    }
    return currentNode;
  };

  // Apply each action
  for (const action of actions) {
    if (action.type !== 'move') continue;

    const fileNode = filesById.get(action.fileId);
    if (!fileNode) {
      console.warn(`File not found for action:`, action);
      continue;
    }

    // Parse new path
    let newPath = normalize(action.params.newPath);
    if (!newPath.startsWith(base + '/')) {
      console.warn(`newPath not under rootPath:`, newPath);
      continue;
    }

    const relPath = newPath.slice(base.length + 1);
    const parts = relPath.split('/').filter(Boolean);
    const fileName = parts.pop();

    // Get or create target folder
    const targetFolder = parts.length > 0
      ? getOrCreateFolder(parts.join('/'), root)
      : root;

    // Add file to target folder with updated path/parentId
    targetFolder.children.push({
      ...fileNode,
      path: newPath,
      oldPath: fileNode.path,
      parentId: targetFolder.id
    });
  }

  return root;
}



async function handleMoveNode(moveData) {
  // Construct the new path by joining target folder path with the source name
  const newPath = `${moveData.targetPath}/${moveData.sourceName}`;

  try {
    // Queue the move action (don't apply yet)
    await window.snapSortAPI.addAction({
      type: 'move',
      fileId: moveData.sourceId,
      params: {
        oldPath: moveData.sourcePath,
        newPath: newPath
      },
      metadata: {
        reason: 'manual_drag_drop',
        newIndex: moveData.newIndex
      }
    });

  } catch (error) {
    console.error('Error queuing move action:', error);
    alert(`Error: ${error.message}`);
  }
}

async function applyAllChanges() {
  try {
    // Apply all queued changes to the file system
    const result = await window.snapSortAPI.applyChanges();

    if (result.success) {
      // Rescan to refresh the tree with actual file system state
      const rootFolder = appStore.rootFolder;
      if (rootFolder) {
        const scanResult = await window.snapSortAPI.scanFolder(rootFolder);
        if (scanResult.success) {
          appStore.setRootNode(scanResult.rootNode);
          appStore.setStats(scanResult.stats);
        }
      }
    } else {
      alert(`Error applying changes: ${result.error}`);
    }
  } catch (error) {
    console.error('Error applying changes:', error);
    alert(`Error: ${error.message}`);
  }
}
</script>

<style scoped>
.tree-container {
  height: calc(100vh - 120px);
  overflow-y: auto;
}

.apply-changes-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 100;
  padding: 12px 32px !important;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0.5px;
}
</style>
