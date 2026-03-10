<template>
  <v-card flat height="100%" class="d-flex flex-column flex-fill">
    <v-card-title class="d-flex align-center justify-space-between">
      <span>Folder Structure</span>
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
        <tree-node :node="rootNode" :level="0" @select="handleSelect" @move-node="handleMoveNode" />
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
      @organization-applied="handleOrganizationApplied"
    />
  </v-card>
</template>

<script setup>
import { ref } from 'vue';
import TreeNode from './TreeNode.vue';
import OrganizationSettings from './OrganizationSettings.vue';
import { useAppStore } from '../stores/app';

const props = defineProps({
  rootNode: {
    type: Object,
    default: null
  }
});

const appStore = useAppStore();
const showOrganizeDialog = ref(false);

function handleSelect(node) {
  console.log('Selected node:', node);
  // Emit to parent or handle selection
}

function openOrganizeDialog() {
  showOrganizeDialog.value = true;
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
        console.log('Folder structure refreshed after organization');
      }
    } catch (error) {
      console.error('Error rescanning folder:', error);
    }
  }
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
        originalPath: moveData.sourcePath,
        newPath: newPath
      },
      metadata: {
        reason: 'manual_drag_drop',
        newIndex: moveData.newIndex
      }
    });

    console.log(`Queued move: ${moveData.sourceName} -> ${moveData.targetPath}`);
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
          console.log('All changes applied successfully');
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
