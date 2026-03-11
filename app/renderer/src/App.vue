<template>
  <v-app>
    <v-app-bar color="primary" dark class="app-header">
      <vue-feather type="star" size="24" class="ml-4"></vue-feather>
      <v-toolbar-title class="ml-3">SnapSort</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-chip v-if="stats.totalFiles > 0" class="mr-2">
        {{ stats.totalFiles }} files
      </v-chip>
      <v-chip v-if="stats.pendingActions > 0" color="warning" class="mr-4">
        {{ stats.pendingActions }} pending changes
      </v-chip>
    </v-app-bar>

    <v-main>
      <v-container v-if="!rootFolder" fluid class="fill-height d-flex align-center justify-center">
        <div class="text-center">
          <vue-feather type="folder" size="120" stroke="lightgrey" class="mb-6"></vue-feather>
          <h1 class="text-h4 mt-6 mb-2">Welcome to SnapSort</h1>
          <p class="text-subtitle-1 text-grey mb-6">
            AI-powered file organization with non-destructive preview
          </p>
          <v-btn
            color="primary"
            size="x-large"
            @click="selectFolder"
            :loading="loading"
            prepend-icon="folder"
          >
            <vue-feather type="folder" size="18" class="mr-2"></vue-feather>
            Select Folder to Organize
          </v-btn>
        </div>
      </v-container>

      <v-container v-else fluid class="pa-0 fill-height">
        <FolderTreeView :rootNode="appStore.rootNode" />
      </v-container>
    </v-main>

    <!-- Scan Progress Dialog -->
    <v-dialog v-model="scanning" persistent max-width="500">
      <v-card>
        <v-card-title>Scanning Folder...</v-card-title>
        <v-card-text>
          <v-progress-linear
            :model-value="scanProgress"
            color="primary"
            height="25"
            striped
          >
            <template v-slot:default="{ value }">
              <strong>{{ Math.ceil(value) }}%</strong>
            </template>
          </v-progress-linear>
          <p class="mt-4 text-center">{{ scanStatus }}</p>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import FolderTreeView from './components/FolderTreeView.vue';
import { useAppStore } from './stores/app';

const appStore = useAppStore();
const rootFolder = ref(null);
const loading = ref(false);
const scanning = ref(false);
const scanProgress = ref(0);
const scanStatus = ref('');
const stats = ref({
  totalFiles: 0,
  totalFolders: 0,
  pendingActions: 0
});

onMounted(() => {
  // Listen to scan progress
  window.snapSortAPI.onScanProgress((data) => {
    scanStatus.value = `Scanned ${data.current} files...`;
    scanProgress.value = data.total > 0 ? (data.current / data.total) * 100 : 0;
  });
});

async function selectFolder() {
  loading.value = true;

  try {
    const folder = await window.snapSortAPI.selectFolder();

    if (folder) {
      rootFolder.value = folder;
      await scanFolder(folder);
    }
  } catch (error) {
    console.error('Error selecting folder:', error);
  } finally {
    loading.value = false;
  }
}

async function scanFolder(folderPath) {
  scanning.value = true;
  scanProgress.value = 0;

  try {
    const result = await window.snapSortAPI.scanFolder(folderPath);

    if (result.success) {
      stats.value = result.stats;
      appStore.setRootNode(result.rootNode);
      appStore.setRootFolder(folderPath);
      appStore.setStats(result.stats);
    }
  } catch (error) {
    console.error('Scan error:', error);
  } finally {
    scanning.value = false;
  }
}
</script>

<style>
.app-header {
  z-index: 0 !important;
}
.border-right {
  border-right: 1px solid #e0e0e0;
}

.border-left {
  border-left: 1px solid #e0e0e0;
}

.fill-height {
  height: 100%;
}
</style>
