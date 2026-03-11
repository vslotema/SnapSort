<template>
  <div>
    <v-navigation-drawer
      :model-value="show"
      @update:model-value="$emit('close')"
      location="right"
      temporary
      width="500"
      class="full-height-drawer h-100"
    >
    <div class="d-flex align-center pa-4 bg-primary">
      <vue-feather type="zap" size="24" class="mr-3" stroke="white"></vue-feather>
      <h2 class="text-h6 text-white">Organization Settings</h2>
      <v-spacer></v-spacer>
      <v-btn icon size="small" variant="text" @click="$emit('close')">
        <vue-feather type="x" size="20" stroke="white"></vue-feather>
      </v-btn>
    </div>

    <v-divider></v-divider>

    <div class="drawer-content pa-4"
         style="height: calc(100vh - 130px); overflow-y: auto;"
    >
      <!-- How it Works -->
      <v-alert type="info" variant="tonal" density="compact" class="mb-4">
        <template v-slot:prepend>
          <vue-feather type="info" size="16"></vue-feather>
        </template>
        <div class="text-caption">
          <strong>How it works:</strong>
          <ol class="mt-2 ml-4">
            <li>Files matching your tags go into those folders</li>
            <li>Remaining files are clustered by AI automatically</li>
            <li>You review everything before applying</li>
          </ol>
        </div>
      </v-alert>

      <!-- Tags Section -->
      <div class="mb-6">
        <div class="d-flex align-center justify-space-between mb-2">
          <h3 class="text-subtitle-1">
            <vue-feather type="tag" size="18" class="mr-2" style="vertical-align: middle;"></vue-feather>
            Priority Tags
            <v-chip size="x-small" class="ml-2" variant="flat" color="primary">Optional</v-chip>
          </h3>
          <v-btn size="small" variant="text" @click="showAddTag = true">
            <vue-feather type="plus" size="16" class="mr-1"></vue-feather>
            Add Tag
          </v-btn>
        </div>

        <p class="text-caption text-grey mb-3">
          Define categories for important files. Everything else will be clustered automatically by AI.
        </p>

        <!-- Active Tags -->
        <div v-if="tags.length > 0" class="mb-3">
          <v-chip
            v-for="(tag, index) in tags"
            :key="index"
            class="mr-2 mb-2"
            closable
            @click:close="removeTag(index)"
          >
            <vue-feather :type="getTagIcon(tag.type)" size="14" class="mr-1"></vue-feather>
            {{ tag.name }}
          </v-chip>
        </div>

        <!-- Quick Tag Suggestions -->
        <div class="quick-tags mb-3">
          <p class="text-caption text-grey mb-2">Quick add:</p>
          <v-chip-group>
            <v-chip
              v-for="suggestion in tagSuggestions"
              :key="suggestion.name"
              size="small"
              variant="outlined"
              @click="addQuickTag(suggestion)"
            >
              <vue-feather :type="suggestion.icon" size="14" class="mr-1"></vue-feather>
              {{ suggestion.name }}
            </v-chip>
          </v-chip-group>
        </div>

        <!-- Add Custom Tag Dialog -->
        <v-expand-transition>
          <v-card v-if="showAddTag" variant="outlined" class="mb-3">
            <v-card-text class="pa-3">
              <v-text-field
                v-model="newTagName"
                label="Tag name"
                variant="outlined"
                density="compact"
                hide-details
                class="mb-2"
                placeholder="e.g., Holiday, Person, Location"
              ></v-text-field>
              <v-select
                v-model="newTagType"
                :items="tagTypes"
                label="Tag type"
                variant="outlined"
                density="compact"
                hide-details
                class="mb-3"
              ></v-select>
              <div class="d-flex gap-2">
                <v-btn size="small" color="primary" @click="addCustomTag" :disabled="!newTagName">
                  Add
                </v-btn>
                <v-btn size="small" variant="text" @click="showAddTag = false">
                  Cancel
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-expand-transition>
      </div>

      <!-- Tag Hierarchy Preview -->
      <div v-if="tags.length > 0" class="mb-6">
        <h3 class="text-subtitle-1 mb-2">
          <vue-feather type="layers" size="18" class="mr-2" style="vertical-align: middle;"></vue-feather>
          Tag Hierarchy
        </h3>

        <!-- Draggable Tag Order -->
        <div class="tag-hierarchy">
          <v-card
            v-for="(tag, index) in tags"
            :key="index"
            variant="outlined"
            class="mb-2 pa-3"
          >
            <div class="d-flex align-center">
              <vue-feather type="menu" size="16" class="mr-2 text-grey cursor-move"></vue-feather>
              <vue-feather :type="getTagIcon(tag.type)" size="16" class="mr-2"></vue-feather>
              <span class="flex-grow-1">{{ tag.name }}</span>
              <v-chip size="x-small" variant="text">Level {{ index + 1 }}</v-chip>
            </div>
          </v-card>

          <v-alert type="info" density="compact" variant="tonal" class="mt-3">
            <template v-slot:prepend>
              <vue-feather type="info" size="16"></vue-feather>
            </template>
            <div class="text-caption">
              <strong>Priority structure:</strong><br>
              <code>{{ getExampleStructure() }}</code><br>
              <strong class="mt-2 d-block">AI clusters:</strong><br>
              <code>AI-Cluster-1/..., AI-Cluster-2/...</code>
            </div>
          </v-alert>
        </div>
      </div>

      <!-- AI Clustering Settings -->
      <div class="mb-6">
        <h3 class="text-subtitle-1 mb-2">
          <vue-feather type="cpu" size="18" class="mr-2" style="vertical-align: middle;"></vue-feather>
          AI Clustering
        </h3>

        <div class="mb-4">
          <div class="d-flex align-center justify-space-between mb-2">
            <label class="text-caption">Tag Match Threshold</label>
            <v-chip size="x-small">{{ (tagThreshold * 100).toFixed(0) }}%</v-chip>
          </div>
          <v-slider
            v-model="tagThreshold"
            :min="0.5"
            :max="1.0"
            :step="0.05"
            thumb-label
            hide-details
          ></v-slider>
          <p class="text-caption text-grey mt-1">
            How similar must files be to match your tags? Higher = stricter.
          </p>
        </div>

        <div class="mb-4">
          <div class="d-flex align-center justify-space-between mb-2">
            <label class="text-caption">AI Cluster Count</label>
            <v-chip size="x-small">{{ clusterCount }} clusters</v-chip>
          </div>
          <v-slider
            v-model="clusterCount"
            :min="3"
            :max="20"
            :step="1"
            thumb-label
            hide-details
          ></v-slider>
          <p class="text-caption text-grey mt-1">
            How many AI-generated folders for untagged files?
          </p>
        </div>
      </div>
    </div>

    <!-- Generate Button (Fixed at bottom) -->
    <div class="drawer-footer" style="position: absolute; bottom: 0; left: 0; right: 0; background: white; border-top: 1px solid rgba(0,0,0,0.12);">
      <div class="pa-4">
        <v-btn
          color="primary"
          size="large"
          block
          @click="generateStructure"
          :disabled="!hasFiles || organizing"
          :loading="organizing"
        >
          <vue-feather type="zap" size="18" class="mr-2"></vue-feather>
          Organize with AI
        </v-btn>
        <p class="text-caption text-grey text-center mt-2">
          {{ tags.length > 0 ? `${tags.length} priority tag(s) + AI clustering` : 'AI clustering only' }}
        </p>
      </div>
    </div>
    </v-navigation-drawer>

    <!-- AI Progress Dialog -->
    <v-dialog v-model="organizing" persistent max-width="500">
      <v-card>
        <v-card-title>
          <vue-feather type="cpu" size="20" class="mr-2" style="vertical-align: middle;"></vue-feather>
          AI Organization in Progress
        </v-card-title>
        <v-card-text>
          <v-progress-linear
            :model-value="aiProgress.progress"
            color="primary"
            height="25"
            striped
          >
            <template v-slot:default="{ value }">
              <strong>{{ Math.ceil(value) }}%</strong>
            </template>
          </v-progress-linear>
          <p class="mt-4 text-center">
            <strong>Step {{ aiProgress.step }}/5:</strong> {{ aiProgress.message }}
          </p>
          <v-alert type="info" density="compact" variant="tonal" class="mt-4">
            <div class="text-caption">
              This may take a few minutes depending on the number of files...
            </div>
          </v-alert>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Preview Dialog -->
    <v-dialog v-model="showPreview" persistent max-width="900" scrollable>
      <v-card>
        <v-card-title class="d-flex align-center">
          <vue-feather type="eye" size="20" class="mr-2"></vue-feather>
          Preview New Structure
          <v-spacer></v-spacer>
          <v-chip color="success" variant="tonal">
            {{ organizationResult?.stats.totalActions }} changes
          </v-chip>
        </v-card-title>

        <v-divider></v-divider>

        <v-card-text style="max-height: 600px;">
          <!-- Summary Stats -->
          <v-alert type="info" variant="tonal" density="compact" class="mb-4">
            <div class="text-caption">
              <strong>Organization Summary:</strong><br>
              <ul class="mt-2 ml-4">
                <li v-if="organizationResult?.stats.taggedFiles > 0">
                  {{ organizationResult.stats.taggedFiles }} files matched to priority tags
                </li>
                <li>{{ organizationResult?.stats.clusteredFiles }} files organized by AI</li>
              </ul>
            </div>
          </v-alert>

          <!-- Preview Tree -->
          <div class="preview-tree">
            <div v-for="(folder, folderName) in previewStructure" :key="folderName" class="folder-preview mb-3">
              <v-card variant="outlined">
                <v-card-title class="text-subtitle-1 py-2">
                  <vue-feather type="folder" size="18" class="mr-2" :stroke="getFolderColor(folder)"></vue-feather>
                  {{ folderName }}
                  <v-chip size="x-small" class="ml-2" variant="text">
                    {{ folder.files?.length || 0 }} files
                  </v-chip>
                  <v-chip
                    v-if="folder.metadata?.reason === 'priority_tag'"
                    size="x-small"
                    color="purple"
                    variant="tonal"
                    class="ml-2"
                  >
                    Priority Tag
                  </v-chip>
                  <v-chip
                    v-if="folder.metadata?.reason === 'ai_cluster'"
                    size="x-small"
                    color="blue"
                    variant="tonal"
                    class="ml-2"
                  >
                    AI Cluster
                  </v-chip>
                </v-card-title>

                <v-divider></v-divider>

                <v-card-text class="pa-2">
                  <div v-if="folder.files && folder.files.length > 0" class="files-list">
                    <div
                      v-for="(file, index) in folder.files.slice(0, 10)"
                      :key="index"
                      class="text-caption text-grey py-1 pl-4"
                    >
                      <vue-feather type="file" size="12" class="mr-1"></vue-feather>
                      {{ file.name }}
                    </div>
                    <div v-if="folder.files.length > 10" class="text-caption text-grey pl-4 mt-1">
                      ... and {{ folder.files.length - 10 }} more files
                    </div>
                  </div>

                  <!-- Sub-folders -->
                  <div v-if="Object.keys(folder.children || {}).length > 0" class="ml-4 mt-2">
                    <div v-for="(subfolder, subName) in folder.children" :key="subName" class="subfolder-preview mb-2">
                      <div class="text-subtitle-2">
                        <vue-feather type="folder" size="14" class="mr-1"></vue-feather>
                        {{ subName }}
                        <v-chip size="x-small" variant="text">
                          {{ subfolder.files?.length || 0 }} files
                        </v-chip>
                      </div>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </div>
          </div>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions class="pa-4">
          <v-btn
            variant="text"
            @click="cancelOrganization"
          >
            <vue-feather type="x" size="18" class="mr-2"></vue-feather>
            Cancel
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn
            color="primary"
            size="large"
            @click="applyOrganization"
          >
            <vue-feather type="check" size="18" class="mr-2"></vue-feather>
            Apply Organization
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAppStore } from '../stores/app';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'organization-applied']);

const appStore = useAppStore();

// Tags (optional priority folders)
const tags = ref([]);
const showAddTag = ref(false);
const newTagName = ref('');
const newTagType = ref('category');

// AI Progress
const organizing = ref(false);
const aiProgress = ref({
  step: 0,
  message: '',
  progress: 0
});

// Preview
const showPreview = ref(false);
const previewStructure = ref(null);
const organizationResult = ref(null);

const tagTypes = [
  { title: 'Category', value: 'category' },
  { title: 'Date/Time', value: 'date' },
  { title: 'Person', value: 'person' },
  { title: 'Location', value: 'location' },
  { title: 'Event', value: 'event' },
  { title: 'Custom', value: 'custom' }
];

const tagSuggestions = [
  { name: 'Year', type: 'date', icon: 'calendar' },
  { name: 'Month', type: 'date', icon: 'calendar' },
  { name: 'Holiday', type: 'event', icon: 'gift' },
  { name: 'Person', type: 'person', icon: 'user' },
  { name: 'Location', type: 'location', icon: 'map-pin' },
  { name: 'Event Type', type: 'event', icon: 'star' }
];

// AI Clustering Settings
const tagThreshold = ref(0.75); // How similar must files be to match tags
const clusterCount = ref(5); // How many AI clusters to generate

// Computed
const hasFiles = computed(() => appStore.stats.totalFiles > 0);

// Methods
function addQuickTag(suggestion) {
  tags.value.push({
    name: suggestion.name,
    type: suggestion.type
  });
}

function addCustomTag() {
  if (!newTagName.value) return;

  tags.value.push({
    name: newTagName.value,
    type: newTagType.value
  });

  newTagName.value = '';
  newTagType.value = 'category';
  showAddTag.value = false;
}

function removeTag(index) {
  tags.value.splice(index, 1);
}

function getTagIcon(type) {
  const icons = {
    category: 'folder',
    date: 'calendar',
    person: 'user',
    location: 'map-pin',
    event: 'star',
    custom: 'tag'
  };
  return icons[type] || 'tag';
}

function getExampleStructure() {
  if (tags.value.length === 0) return '';

  const example = tags.value.map(tag => {
    switch (tag.name.toLowerCase()) {
      case 'year': return '2024';
      case 'month': return 'January';
      case 'holiday': return 'Christmas';
      case 'person': return 'John';
      case 'location': return 'Paris';
      default: return tag.name;
    }
  }).join(' / ');

  return example + ' / photo.jpg';
}

onMounted(() => {
  // Listen to AI progress
  window.snapSortAPI.onAIProgress((data) => {
    aiProgress.value = data;
  });
});

function buildPreviewTree(actions) {
  // Build a hierarchical tree structure from the move actions
  const tree = {};

  actions.forEach(action => {
    if (action.type === 'move') {
      const newPath = action.params.newPath;
      const pathParts = newPath.split('/');
      const fileName = pathParts.pop();

      // Build folder hierarchy
      let currentLevel = tree;
      pathParts.forEach((folder, index) => {
        // Skip root path parts, only show relative structure
        if (index < pathParts.length - 3) return; // Skip base path, keep last 2-3 levels

        if (!currentLevel[folder]) {
          currentLevel[folder] = {
            name: folder,
            type: 'folder',
            children: {},
            files: [],
            metadata: action.metadata
          };
        }
        currentLevel = currentLevel[folder].children;
      });

      // Add file to the last folder
      const lastFolder = pathParts[pathParts.length - 1];
      if (tree[lastFolder]) {
        tree[lastFolder].files.push({
          name: fileName,
          metadata: action.metadata
        });
      }
    }
  });

  return tree;
}

async function applyOrganization() {
  try {
    const result = await window.snapSortAPI.applyChanges();
    if (result.success) {
      showPreview.value = false;
      alert(`✅ Applied ${result.applied} changes successfully!\n\nYour files have been organized.`);

      // Clear data
      organizationResult.value = null;
      previewStructure.value = null;

      // Emit event to parent to refresh folder structure
      emit('organization-applied');
      emit('close');
    }
  } catch (error) {
    console.error('Apply error:', error);
    alert(`❌ Error applying changes:\n\n${error.message}`);
  }
}

function cancelOrganization() {
  // Reset actions
  window.snapSortAPI.resetActions();
  showPreview.value = false;
  organizationResult.value = null;
  previewStructure.value = null;
}

function getFolderColor(folder) {
  if (folder.metadata?.reason === 'priority_tag') {
    return '#9C27B0'; // Purple
  } else if (folder.metadata?.reason === 'ai_cluster') {
    return '#2196F3'; // Blue
  }
  return '#FFA726'; // Orange (default folder color)
}

async function generateStructure() {
  organizing.value = true;
  aiProgress.value = { step: 0, message: 'Starting...', progress: 0 };

  try {
    // Call AI organization API
    const result = await window.snapSortAPI.organizeWithAI(
      tags.value,
      tagThreshold.value,
      clusterCount.value
    );

    if (result.success) {

      // Store result for preview
      organizationResult.value = result;

      // Build preview structure tree from actions
      previewStructure.value = buildPreviewTree(result.actions);

      // Add all actions to the engine
      for (const action of result.actions) {
        await window.snapSortAPI.addAction(action);
      }

      // Show preview dialog
      showPreview.value = true;
    } else {
      console.error('Organization failed:', result.error);
      alert(`❌ Organization failed:\n\n${result.error}`);
    }
  } catch (error) {
    console.error('Organization error:', error);
    alert(`❌ Error during organization:\n\n${error.message}`);
  } finally {
    organizing.value = false;
  }
}
</script>

<style scoped>
/* Make the drawer full height and above the app bar */
.full-height-drawer :deep(.v-navigation-drawer__content) {
  height: 100vh;
}

:deep(.v-navigation-drawer) {
  position: fixed;
  top: 0 !important;
  height: 100vh;
  z-index: 1500;
}

/* Ensure the overlay/scrim is also above the app bar but below the drawer */
:deep(.v-overlay__scrim) {
  z-index: 1400;
}

.cursor-move {
  cursor: move;
}

.quick-tags {
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
  padding: 12px;
}

.tag-hierarchy {
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
  padding: 12px;
}

code {
  background: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.85em;
}

.preview-tree {
  padding: 8px;
}

.folder-preview {
  transition: transform 0.2s;
}

.folder-preview:hover {
  transform: translateX(4px);
}

.files-list {
  max-height: 200px;
  overflow-y: auto;
}

.subfolder-preview {
  padding: 8px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 4px;
  border-left: 3px solid #2196F3;
}
</style>
