import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAppStore = defineStore('app', () => {
  const rootFolder = ref(null);
  const rootNode = ref(null);
  const stats = ref({
    totalFiles: 0,
    totalFolders: 0,
    pendingActions: 0
  });
  const previewTree = ref([]);
  const actions = ref([]);

  function setRootFolder(folder) {
    rootFolder.value = folder;
  }

  function setRootNode(node) {
    rootNode.value = node;
  }

  function setStats(newStats) {
    stats.value = newStats;
  }

  function setPreviewTree(tree) {
    previewTree.value = tree;
  }

  function addAction(action) {
    actions.value.push(action);
    stats.value.pendingActions++;
  }

  function removeAction(actionId) {
    const index = actions.value.findIndex(a => a.id === actionId);
    if (index > -1) {
      actions.value.splice(index, 1);
      stats.value.pendingActions--;
    }
  }

  function clearActions() {
    actions.value = [];
    stats.value.pendingActions = 0;
  }

  return {
    rootFolder,
    rootNode,
    stats,
    previewTree,
    actions,
    setRootFolder,
    setRootNode,
    setStats,
    setPreviewTree,
    addAction,
    removeAction,
    clearActions
  };
});
