import { createApp } from 'vue/dist/vue.esm-bundler'
import { createWebHistory, createRouter } from 'vue-router'
import { createI18n } from 'vue-i18n/index'
import { createStore  } from 'vuex'

import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'

import Locale_en_GB from '@/src/locales/en_GB.js'
import DashboardStore from '@/src/stores/dashboard.js'

const store = createStore({
	modules: {
		dashboard: DashboardStore
	}
});

const messages = {
	'en_GB': Locale_en_GB
}

const i18n = createI18n({
	locale: 'en_GB',
	fallbackLocale: 'en_GB',
	messages
})

const Dashboard = () => import('@/src/components/dashboard/Dashboard.vue')

const routes = [
	{
		path: '/',
		name: 'dashboard',
		title: 'Dashboard',
		component: Dashboard,
		children: [
			{
				path: ':lang',
				component: Dashboard
			}
		]
	}
];

const router = createRouter({
	history: createWebHistory(),
	routes
})

const primevue = PrimeVue;

const routerApp = createApp(router);
routerApp.use(router);
routerApp.use(i18n);
routerApp.use(store);
routerApp.use(primevue, {ripple: true});
routerApp.use(ToastService);
routerApp.mount('#router_app');
