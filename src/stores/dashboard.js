export default {
	namespaced: true,
	state: {
		theme: 'common',
		themeVariety: 'light',
		locale: 'en_GB',
		markedLocation: {}
	},
	mutations: {
		SET_THEME(state, theme) {
			state.theme = theme;
		},
		SET_THEME_VARIETY(state, themeVariety) {
			state.themeVariety = themeVariety;
		},
		SET_LOCALE(state, locale) {
			state.locale = locale;
		},
		SET_MARKED_LOCATION(state, markedLocation) {
			state.markedLocation = markedLocation;
		}
	},
	actions: {
		setTheme(context, theme) {
			context.commit('SET_THEME', theme);
		},
		setThemeVariety(context, themeVariety) {
			context.commit('SET_THEME_VARIETY', themeVariety);
		},
		setLocale(context, locale) {
			context.commit('SET_LOCALE', locale);
		},
		setMarkedLocation(context, markedLocation) {
			context.commit('SET_MARKED_LOCATION', markedLocation);
		}
	},
	getters: {
		getTheme(state) {
			return state.theme;
		},
		getThemeVariety(state) {
			return state.themeVariety;
		},
		getLocale(state) {
			return state.locale;
		},
		getMarkedLocation(state) {
			return state.markedLocation;
		}
	}
}
