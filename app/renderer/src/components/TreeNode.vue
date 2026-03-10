<template>
  <div>
    <v-list-item
      :class="{ 'node-selected': selected }"
      @click="handleClick"
      :style="{ paddingLeft: `${level * 16 + 8}px` }"
      density="compact"
    >
      <template v-slot:prepend>
        <!-- Drag handle -->
        <vue-feather
          type="menu"
          size="14"
          class="drag-handle mr-1"
          style="cursor: grab; color: #999;"
        ></vue-feather>

        <!-- Chevron for folders with children -->
        <vue-feather
          v-if="node.type === 'folder' && node.children?.length > 0"
          :type="expanded ? 'chevron-down' : 'chevron-right'"
          size="16"
          class="mr-1 cursor-pointer"
          @click.stop="toggleExpand"
        ></vue-feather>
        <span v-else class="chevron-spacer"></span>

        <!-- Image thumbnail for image files -->
        <v-img
          v-if="isImage() && imageSrc"
          :src="imageSrc"
          class="file-thumbnail mr-2"
          @error="handleImageError"
        />
        <!-- Icon based on type for non-images -->
        <vue-feather
          v-else
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
    <draggable
      v-if="expanded && node.children && node.type === 'folder'"
      v-model="node.children"
      item-key="id"
      group="files"
      @change="handleDragChange"
      ghost-class="ghost"
      handle=".drag-handle"
    >
      <template #item="{ element }">
        <tree-node
          :node="element"
          :level="level + 1"
          @select="$emit('select', $event)"
        />
      </template>
    </draggable>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits } from 'vue';
import draggable from 'vuedraggable';

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
const imageError = ref(false);
const imageSrc = ref(null);

function toggleExpand() {
  expanded.value = !expanded.value;
}

function isImage() {
  const mime = props.node.mimeType || '';
  return mime.startsWith('image/') && !imageError.value;
}

async function loadImageThumbnail() {
  if (!isImage() || !props.node.path) return;

  try {
    const result = await window.snapSortAPI.getImageThumbnail(props.node.path);
    if (result.success) {
      imageSrc.value = result.dataUrl;
    } else {
      imageError.value = true;
    }
  } catch (error) {
    console.error('Error loading thumbnail:', error);
    imageError.value = true;
  }
}

function handleImageError() {
  // Fall back to icon if image fails to load
  imageError.value = true;
}

function handleDragChange(event) {
  console.log('Drag change:', event);
  // The children array is already updated by v-model
  // We could emit an event to save the new order if needed
}

// Drag and drop handlers
function handleDragStart(event) {
  isDragging.value = true;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('application/json', JSON.stringify({
    nodeId: props.node.id,
    nodePath: props.node.path,
    nodeType: props.node.type,
    nodeName: props.node.name
  }));
}

function handleDragEnd() {
  isDragging.value = false;
}

function handleDragOver(event) {
  // Only allow dropping on folders
  if (props.node.type === 'folder') {
    isDragOver.value = true;
    event.dataTransfer.dropEffect = 'move';
  }
}

function handleDragLeave() {
  isDragOver.value = false;
}

async function handleDrop(event) {
  isDragOver.value = false;

  // Only allow dropping on folders
  if (props.node.type !== 'folder') {
    return;
  }

  try {
    const data = JSON.parse(event.dataTransfer.getData('application/json'));

    // Don't allow dropping on itself
    if (data.nodeId === props.node.id) {
      return;
    }

    // Don't allow dropping a folder into its own child
    if (props.node.path.startsWith(data.nodePath + '/')) {
      alert('Cannot move a folder into its own subfolder');
      return;
    }

    // Emit move event to parent
    emit('move-node', {
      sourceId: data.nodeId,
      sourcePath: data.nodePath,
      sourceType: data.nodeType,
      sourceName: data.nodeName,
      targetId: props.node.id,
      targetPath: props.node.path
    });
  } catch (error) {
    console.error('Error handling drop:', error);
  }
}

// Load thumbnail when component mounts if it's an image
if (isImage()) {
  loadImageThumbnail();
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

.file-thumbnail {
  width: 24px;
  height: 24px;
  object-fit: cover;
}

/* Drag and drop styles */
.drag-handle {
  opacity: 0.3;
  transition: opacity 0.2s;
}

.drag-handle:hover {
  opacity: 1;
  cursor: grab;
}

.drag-handle:active {
  cursor: grabbing;
}

.ghost {
  opacity: 0.5;
  background: #f0f0f0;
}
</style>
