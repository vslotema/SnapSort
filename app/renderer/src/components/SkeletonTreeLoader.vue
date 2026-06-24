<template>
  <div class="px-4 w-100 d-flex flex-column align-end">
     <!-- Root Level -->
  <v-skeleton-loader type="list-item-avatar" class="mb-1 w-100"></v-skeleton-loader>
  <v-skeleton-loader type="list-item-avatar" class="mb-1 pl-6 w-100"></v-skeleton-loader>
  <v-skeleton-loader v-for="i in 10" type="list-item-avatar" class="mb-1 pl-12 w-100"></v-skeleton-loader>
  <v-skeleton-loader v-for="i in 3" type="list-item-avatar" class="mb-1 w-100"></v-skeleton-loader>
  </div>
</template>

<style scoped>
/* Custom width utilities if you want more variety than standard Vuetify classes */

/* Optional: Make the skeleton bars look slightly more like 'folder lines' 
   by adjusting the height */
:deep(.v-skeleton-loader__text) {
  height: 16px;
  margin: 10px 0;
  border-radius: 4px;
}

:deep(.v-skeleton-loader__avatar) {
    border-radius: 4px;
    flex: 0 1 auto;
    margin: 0px 8px 0 0;
    max-height: 48px;
    min-height: 16px;
    height: 16px;
    max-width: 48px;
    min-width: 16px;
    width: 16px;
}
</style>
