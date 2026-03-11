<template>
  <div>
    <v-list-item
      :class="{
        'node-selected': isSelected
      }"
      :data-node-id="node.id"
      @click="handleClick($event)"
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
      v-if="expanded && node.children"
      v-model="node.children"
      group="tree-nodes"
      item-key="id"
      handle=".drag-handle"
      ghost-class="ghost"
      drag-class="dragging"
      multi-drag
      :animation="200"
      @change="handleDragChange"
      @start="handleDragStart"
      @end="handleDragEnd"
    >
      <template #item="{ element }">
        <tree-node
          :node="element"
          :level="level + 1"
          @select="$emit('select', $event)"
          @move-node="$emit('move-node', $event)"
        />
      </template>
    </draggable>
  </div>
</template>

<script setup>
import { ref, computed, inject } from 'vue';
import draggable from 'vuedraggable';

// Inject selection state from parent
const selectedNodes = inject('selectedNodes', ref(new Set()));
const draggedItems = inject('draggedItems', ref([]));
const getRootNode = inject('rootNodeRef', () => null);
const toggleSelection = inject('toggleSelection', () => {});
const clearSelection = inject('clearSelection', () => {});

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

const emit = defineEmits(['select', 'move-node']);

const expanded = ref(props.level === 0); // Auto-expand root level
const imageError = ref(false);
const imageSrc = ref(null);

const isSelected = computed(() => selectedNodes.value.has(props.node.id));

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

// Track items being dragged
function handleDragStart(event) {
  const draggedIndex = event.oldIndex;
  const draggedNode = props.node.children[draggedIndex];

  if (!draggedNode) {
    console.error('Could not find dragged node');
    return;
  }

  const draggedItemId = draggedNode.id;
  const selectedIds = Array.from(selectedNodes.value);

  // If the dragged item is selected and there are multiple selections
  if (selectedIds.includes(draggedItemId) && selectedIds.length > 1) {
    // Store all selected items for later
    const rootNode = getRootNode();
    draggedItems.value = selectedIds.map(id => {
      const node = findNodeInTree(rootNode, id);
      return node;
    }).filter(Boolean);
  } else {
    // Single item drag
    draggedItems.value = [draggedNode];
  }
}

function handleDragEnd(event) {
  // Clear dragged items after drop
  draggedItems.value = [];
}

// Drag and drop handler for vuedraggable
function handleDragChange(event) {
  if (event.added) {
    const movedItem = event.added.element;

    // Check if we have multiple items to drag (from handleDragStart)
    if (draggedItems.value.length > 1) {
      // Remove all selected items from their parent folders (except the one vuedraggable already moved)
      const rootNode = getRootNode();
      draggedItems.value.forEach((draggedNode, index) => {
        if (index > 0) {
          // Find and remove from parent
          removeNodeFromTree(rootNode, draggedNode.id);
          // Add to target folder
          if (!props.node.children.find(child => child.id === draggedNode.id)) {
            props.node.children.splice(event.added.newIndex + index, 0, draggedNode);
          }
        }

        // Emit move event for all items
        emit('move-node', {
          sourceId: draggedNode.id,
          sourcePath: draggedNode.path,
          sourceType: draggedNode.type,
          sourceName: draggedNode.name,
          targetId: props.node.id,
          targetPath: props.node.path,
          newIndex: event.added.newIndex
        });
      });
      // Clear selection after moving
      clearSelection();
    } else {
      // Single item move
      emit('move-node', {
        sourceId: movedItem.id,
        sourcePath: movedItem.path,
        sourceType: movedItem.type,
        sourceName: movedItem.name,
        targetId: props.node.id,
        targetPath: props.node.path,
        newIndex: event.added.newIndex
      });
    }
  }
}

// Helper function to find a node by ID in a tree
function findNodeById(nodes, id) {
  if (!nodes) return null;
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

function findNodeInTree(rootNode, id) {
  if (!rootNode) return null;
  if (rootNode.id === id) return rootNode;
  return findNodeById(rootNode.children, id);
}

function removeNodeFromTree(rootNode, nodeId) {
  if (!rootNode || !rootNode.children) return false;

  // Try to remove from this node's children
  const index = rootNode.children.findIndex(child => child.id === nodeId);
  if (index !== -1) {
    rootNode.children.splice(index, 1);
    return true;
  }

  // Recursively try to remove from child folders
  for (const child of rootNode.children) {
    if (child.type === 'folder' && removeNodeFromTree(child, nodeId)) {
      return true;
    }
  }

  return false;
}

// Load thumbnail when component mounts if it's an image
if (isImage()) {
  loadImageThumbnail();
}

function handleClick(event) {
  // Support Shift + Click for multi-select
  const shiftKey = event.shiftKey;
  toggleSelection(props.node.id, shiftKey);
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
  background-color: rgba(25, 118, 210, 0.15);
  border-left: 3px solid #1976d2;
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

/* vuedraggable classes */
:deep(.sortable-chosen) {
  opacity: 0.6 !important;
  background: rgba(25, 118, 210, 0.15) !important;
  cursor: grabbing !important;
}

:deep(.sortable-ghost) {
  opacity: 0.3 !important;
  background: rgba(25, 118, 210, 0.1) !important;
}

.ghost {
  opacity: 0.4 !important;
  background: rgba(25, 118, 210, 0.15) !important;
}

.dragging {
  cursor: grabbing !important;
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}
</style>
