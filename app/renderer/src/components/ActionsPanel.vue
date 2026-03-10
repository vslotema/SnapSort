<template>
  <v-card flat height="100%">
    <v-card-title>
      Preview Actions
      <v-spacer></v-spacer>
      <v-chip small>{{ actions.length }}</v-chip>
    </v-card-title>
    <v-divider></v-divider>

    <v-card-text v-if="actions.length === 0" class="text-center pa-16">
      <vue-feather type="play-circle" size="64" stroke="lightgrey"></vue-feather>
      <p class="text-grey mt-4">No pending actions</p>
      <p class="text-caption">Changes will appear here before being applied</p>
    </v-card-text>

    <v-list v-else density="compact" class="actions-list">
      <v-list-item
        v-for="action in actions"
        :key="action.id"
        class="action-item"
      >
        <template v-slot:prepend>
          <vue-feather
            :type="getActionIcon(action.type)"
            size="18"
            :stroke="getActionColor(action)"
            class="mr-2"
          ></vue-feather>
        </template>

        <v-list-item-title class="text-caption">
          <div class="action-title">{{ getActionDescription(action) }}</div>
          <div class="text-grey text-caption mt-1">
            {{ getActionDetails(action) }}
          </div>
        </v-list-item-title>

        <template v-slot:append>
          <v-btn icon="mdi-close" size="x-small" variant="text" @click="removeAction(action.id)">
            <vue-feather type="x" size="14"></vue-feather>
          </v-btn>
        </template>
      </v-list-item>
    </v-list>

    <template v-slot:actions>
      <v-divider></v-divider>
      <v-card-actions>
        <v-btn block color="primary" @click="applyChanges" :disabled="actions.length === 0">
          <vue-feather type="check" size="18" class="mr-2"></vue-feather>
          Apply Changes
        </v-btn>
      </v-card-actions>
    </template>
  </v-card>
</template>

<script setup>
import { computed } from 'vue';
import { useAppStore } from '../stores/app';

const appStore = useAppStore();
const actions = computed(() => appStore.actions);

function getActionIcon(type) {
  const icons = {
    move: 'move',
    rename: 'edit-2',
    delete: 'trash-2',
    merge: 'git-merge',
    create_folder: 'folder-plus'
  };
  return icons[type] || 'settings';
}

function getActionColor(action) {
  if (action.metadata?.reason === 'priority_tag') {
    return '#9C27B0'; // Purple for priority tags
  } else if (action.metadata?.reason === 'ai_cluster') {
    return '#2196F3'; // Blue for AI clusters
  }
  return '#78909C'; // Default grey
}

function getActionDescription(action) {
  if (action.type === 'move') {
    const fileName = action.params.newPath.split('/').pop();
    return fileName;
  }
  return action.type;
}

function getActionDetails(action) {
  if (action.type === 'move') {
    if (action.metadata?.reason === 'priority_tag') {
      const tag = action.metadata.tag;
      const similarity = (action.metadata.similarity * 100).toFixed(0);
      return `→ ${tag} (${similarity}% match)`;
    } else if (action.metadata?.reason === 'ai_cluster') {
      const folder = action.params.newPath.split('/').slice(-2, -1)[0];
      return `→ ${folder}`;
    }
  }
  return '';
}

async function removeAction(actionId) {
  await window.snapSortAPI.removeAction(actionId);
  appStore.removeAction(actionId);
}

async function applyChanges() {
  try {
    const result = await window.snapSortAPI.applyChanges();
    if (result.success) {
      appStore.clearActions();
      alert(`Applied ${result.applied} changes successfully!`);
    }
  } catch (error) {
    console.error('Apply error:', error);
  }
}
</script>

<style scoped>
.actions-list {
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}

.action-item {
  border-bottom: 1px solid #f0f0f0;
}

.action-item:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.action-title {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
