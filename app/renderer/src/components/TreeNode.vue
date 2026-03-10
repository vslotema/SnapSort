<template>
  <div>
    <v-list-item
      :class="{ 'node-selected': selected }"
      @click="handleClick"
      :style="{ paddingLeft: `${level * 16 + 8}px` }"
      density="compact"
    >
      <template v-slot:prepend>
        <!-- Chevron for folders with children -->
        <vue-feather
          v-if="node.type === 'folder' && node.children?.length > 0"
          :type="expanded ? 'chevron-down' : 'chevron-right'"
          size="16"
          class="mr-1 cursor-pointer"
          @click.stop="toggleExpand"
        ></vue-feather>
        <span v-else class="chevron-spacer"></span>

        <!-- Icon based on type -->
        <vue-feather
          :type="getIcon()"
          size="16"
          :stroke="getColor()"
          class="mr-2"
        ></vue-feather>
      </template>

      <v-list-item-title class="text-body-2">
        {{ node.name }}
      </v-list-item-title>

      <template v-slot:append>
        <v-chip
          v-if="node.type === 'folder' && node.children?.length > 0"
          size="x-small"
          variant="text"
          class="text-caption"
        >
          {{ node.children.length }}
        </v-chip>
        <v-chip
          v-else-if="node.size"
          size="x-small"
          variant="text"
          class="text-caption"
        >
          {{ formatSize(node.size) }}
        </v-chip>
      </template>
    </v-list-item>

    <!-- Render children recursively if expanded -->
    <div v-if="expanded && node.children">
      <tree-node
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :level="level + 1"
        @select="$emit('select', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits } from 'vue';

const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  level: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits(['select']);

const expanded = ref(props.level === 0); // Auto-expand root level
const selected = ref(false);

function toggleExpand() {
  expanded.value = !expanded.value;
}

function handleClick() {
  selected.value = true;
  emit('select', props.node);
}

function getIcon() {
  if (props.node.type === 'folder') {
    return 'folder'; // Feather doesn't have folder-open, use folder for both states
  }

  // Determine icon based on MIME type
  const mime = props.node.mimeType || '';

  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'music';
  if (mime.startsWith('text/') || mime.includes('json')) return 'file-text';
  if (mime.includes('pdf')) return 'file';
  if (mime.includes('zip') || mime.includes('archive')) return 'archive';

  return 'file';
}

function getColor() {
  if (props.node.type === 'folder') return '#FFA726';

  const mime = props.node.mimeType || '';
  if (mime.startsWith('image/')) return '#42A5F5';
  if (mime.startsWith('video/')) return '#AB47BC';
  if (mime.startsWith('audio/')) return '#EC407A';
  if (mime.startsWith('text/')) return '#66BB6A';

  return '#78909C';
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 10) / 10 + ' ' + sizes[i];
}
</script>

<style scoped>
.node-selected {
  background-color: rgba(25, 118, 210, 0.08);
}

.chevron-spacer {
  display: inline-block;
  width: 16px;
  margin-right: 4px;
}

.cursor-pointer {
  cursor: pointer;
}
</style>
