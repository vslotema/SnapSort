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
  const selectedNodes = ref(new Set());

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

  function toggleNodeSelection(nodeId, ctrlKey = false) {
    if (ctrlKey) {
      // Toggle selection with Ctrl/Cmd
      if (selectedNodes.value.has(nodeId)) {
        selectedNodes.value.delete(nodeId);
      } else {
        selectedNodes.value.add(nodeId);
      }
    } else {
      // Single selection without Ctrl/Cmd - clear others
      selectedNodes.value.clear();
      selectedNodes.value.add(nodeId);
    }
    // Trigger reactivity
    selectedNodes.value = new Set(selectedNodes.value);
  }

  function clearSelection() {
    selectedNodes.value.clear();
    selectedNodes.value = new Set(selectedNodes.value);
  }

  function isNodeSelected(nodeId) {
    return selectedNodes.value.has(nodeId);
  }

  return {
    rootFolder,
    rootNode,
    stats,
    previewTree,
    actions,
    selectedNodes,
    setRootFolder,
    setRootNode,
    setStats,
    setPreviewTree,
    addAction,
    removeAction,
    clearActions,
    toggleNodeSelection,
    clearSelection,
    isNodeSelected
  };
});
