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
      <div class="d-flex align-center pa-4">
        <vue-feather type="zap" size="24" class="mr-3" stroke="#1867c0"></vue-feather>
        <h2 class="text-h6 text-primary">Organization Settings</h2>
        <v-spacer></v-spacer>
        <v-btn icon size="small" variant="text" @click="$emit('close')">
          <vue-feather type="x" size="20" stroke="#1867c0"></vue-feather>
        </v-btn>
      </div>

      <v-divider></v-divider>

      <div class="drawer-content pa-4"
          style="height: calc(100vh - 150px); overflow-y: auto;"
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
                <v-chip size="x-small" variant="text">Level 1</v-chip>
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
            :disabled="!hasFiles || appStore.aiProgress"
            :loading="appStore.aiProgress"
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, toRaw } from 'vue';
import { useAppStore } from '../stores/app';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'create-preview']);

const appStore = useAppStore();

// Tags (optional priority folders)
const tags = ref([]);
const showAddTag = ref(false);
const newTagName = ref('');
const newTagType = ref('category');

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

async function generateStructure() {
  appStore.setAIProgress(true);
  emit('close');
  const cleanTags = structuredClone(toRaw(tags.value))
  try {
    // Call AI organization API
    const result = await window.snapSortAPI.organizeWithAI(
      cleanTags,
      tagThreshold.value,
      clusterCount.value
    );

    if (result.success) {
      emit('create-preview', result);
      appStore.setAIProgress(false);
    } else {
      appStore.setAIProgress(false);
      console.error('Organization failed:', result.error);
      alert(`❌ Organization failed:\n\n${result.error}`);
    }
  } catch (error) {
    console.error('Organization error:', error);
    alert(`❌ Error during organization:\n\n${error.message}`);
    appStore.setAIProgress(false);
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

:deep(.v-slide-group__next),
:deep(.v-slide-group__prev) {
  display: none !important;
}
</style>
