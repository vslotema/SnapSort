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
        <tree-node :node="rootNode" :level="0" @select="handleSelect" />
      </v-list>
      <div v-else class="text-center pa-8">
        <vue-feather type="folder" size="48" stroke="lightgrey"></vue-feather>
        <p class="text-grey text-caption mt-2">No folder scanned</p>
      </div>
    </v-card-text>

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
</script>

<style scoped>
.tree-container {
  height: calc(100vh - 120px);
  overflow-y: auto;
}
</style>
