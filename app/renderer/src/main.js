import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createVuetify } from 'vuetify';
import App from './App.vue';
import VueFeather from 'vue-feather';

import 'vuetify/styles';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

const pinia = createPinia();

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light'
  }
});

const app = createApp(App);
app.use(pinia);
app.use(vuetify);
app.component(VueFeather.name, VueFeather);
app.mount('#app');
