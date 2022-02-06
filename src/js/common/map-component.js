import L from 'leaflet'
require('leaflet.markercluster');
// import geocoder
import LCGEO from 'leaflet-control-geocoder'

// delete default icon url
delete L.Icon.Default.prototype._getIconUrl;
// import icons from node_modules
import LICONURL from '@/node_modules/leaflet/dist/images/marker-icon.png'
import LICONURL2X from '@/node_modules/leaflet/dist/images/marker-icon-2x.png'
import LMARKERSHADOW from '@/node_modules/leaflet/dist/images/marker-shadow.png'
import LLAYERS2x from '@/node_modules/leaflet/dist/images/layers-2x.png'
import LLAYERS from '@/node_modules/leaflet/dist/images/layers.png'

// set new icons' paths
L.Icon.Default.mergeOptions({
	iconRetinaUrl: LICONURL2X,
	iconUrl: LICONURL,
	shadowUrl: LMARKERSHADOW,
	layersRetinaUrl: LLAYERS2x,
	layersUrl: LLAYERS
});

const computed = {
	theme() {
		return this.$store.getters['dashboard/getTheme'];
	},
	themeVariety() {
		return this.$store.getters['dashboard/getThemeVariety'];
	},
	mapComponentClass() {
		return this.theme + '-map-component-' + this.themeVariety;
	},
	container() {
		return document.getElementById(this.id);
	}
}

const created = function(){
	const that = this;
}

const mounted = function(){
	const that = this;

	// define menu resize observers
	new ResizeObserver(this.resized).observe(this.container);

	// emit map-component ready event to parent
	this.$emit('map-component-ready', true);

	// destroy map
	if(this.map != null){
		this.map.remove();
		this.map = null;
	}

	// init map
	if(this.map == null)
		this.initMap();

	this.$nextTick(async ()=>{
		that.visibleLocations(that.map.getBounds());
		that.render();
	});
}

const updated = function() {
	const that = this;
	if(this.map == null){
		this.initMap();
	}
	else {
		this.$nextTick(async ()=>{
			that.visibleLocations(that.map.getBounds());
			that.render();
		});
	}
}

const watch = {
	locations() {
		this.removeAllMarkers();
		this.setMarkers(false);
	}
}

const methods = {
	render(){
		// handle map resize
		this.map.invalidateSize(true);

		// set markers
		this.setMarkers(false);
	},
	initMap(){
		const that = this;

		// create map and set initial view
		this.map = L.map(this.id, {'zoomControl': true}).setView(this.defaultHomeLocation, this.defaultHomeZoom);
		// set zoom controls position to top right
		this.map.zoomControl.setPosition('topright');

		// handle map resize
		this.map.invalidateSize(true);

		L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
			maxZoom: 19,
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
		}).addTo(this.map);
/*
		L.tileLayer('https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}{r}.png', {
			attribution: '<a href="https://wikimediafoundation.org/wiki/Maps_Terms_of_Use">Wikimedia</a>'
		}).addTo(this.map);
*/
		// add custom add custom controls
		this.addMapControls();

		// get bonds on pan and zoom
		this.map.on('moveend', () => { 
			that.visibleLocations(that.map.getBounds());
		});
	},
	addMapControls(){
		let that = this;
		// add custom controls
		L.Control.zoomHome = L.Control.extend({
			options: {
				position: 'topright',
				zoomHomeText: '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" viewBox="0 0 27.02 27.02">\
					<g fill="currentColor">\
						<path d="M3.674,24.876c0,0-0.024,0.604,0.566,0.604c0.734,0,6.811-0.008,6.811-0.008l0.01-5.581\
							c0,0-0.096-0.92,0.797-0.92h2.826c1.056,0,0.991,0.92,0.991,0.92l-0.012,5.563c0,0,5.762,0,6.667,0\
							c0.749,0,0.715-0.752,0.715-0.752V14.413l-9.396-8.358l-9.975,8.358C3.674,14.413,3.674,24.876,3.674,24.876z"/>\
						<path d="M0,13.635c0,0,0.847,1.561,2.694,0l11.038-9.338l10.349,9.28c2.138,1.542,2.939,0,2.939,0\
							L13.732,1.54L0,13.635z"/>\
						<polygon points="23.83,4.275 21.168,4.275 21.179,7.503 23.83,9.752 	"/>\
					</g>\
				</svg>',
				zoomHomeTitle: 'Zoom home'
			},

			onAdd: function (map) {
				var controlName = 'leaflet-control-custom-zoom',
					container = L.DomUtil.create('div', controlName + ' leaflet-bar'),
					options = this.options;

				this._zoomHomeButton = this._createButton(options.zoomHomeText, options.zoomHomeTitle,
					controlName + '-home', container, this._zoomHome);

				return container;
			},

			_zoomHome: function (e) {
				that.zoomHome();
			},

			_createButton: function (html, title, className, container, fn) {
				var link = L.DomUtil.create('a', className, container);
				link.innerHTML = html;
				link.href = '#';
				link.title = title;

				L.DomEvent.on(link, 'mousedown dblclick', L.DomEvent.stopPropagation)
					.on(link, 'click', L.DomEvent.stop)
					.on(link, 'click', fn, this)
					.on(link, 'click', this._refocusOnMap, this);

				return link;
			},
		});
		// add zoom home new control to the map
		let zoomHome = new L.Control.zoomHome();
		zoomHome.addTo(this.map);
	},
	visibleLocations(bounds) {
		this.locations = this.miners
			.filter((miner)=>{return miner != null &&
				!isNaN(miner.lat) &&
				!isNaN(miner.long) &&
				miner.lat <= bounds._northEast.lat &&
				miner.long <= bounds._northEast.lng &&
				miner.lat >= bounds._southWest.lat &&
				miner.long >= bounds._southWest.lng
			})
			.map((miner)=>({
					'id': miner.miner,
					'city': miner.city,
					'region': miner.region,
					'country': miner.country,
					'number-of-locations': miner.numLocations,
					'latitude': miner.lat,
					'longitude': miner.long
		}));
	},
	removeMarker(marker){
		try {
			// remove marker and its associated layers
			this.map.removeLayer(this.markers[marker]);
			for(let i=0; i<this.markers[marker].options.associatedLayers.length; i++){
				this.map.removeLayer(this.markers[marker].options.associatedLayers[i]);
			}
		} catch (e) {
			//console.log(e);
		}
		this.markers[marker] = null;
		delete this.markers[marker];
	},
	removeAllMarkers(){
		if(this.markersCluster != null)
			this.markersCluster.clearLayers();
	},
	setMarkers(autozoom){
		if(this.markersCluster == null)
			this.markersCluster = L.markerClusterGroup();
		this.markersCluster.clearLayers();

		for(let i=0; i<this.locations.length; i++){
			let marker = this.setMarker(this.locations[i], false);
			this.markers[`${this.locations[i].id}-${this.locations[i].latitude}-${this.locations[i].longitude}`] = marker;

			this.markersCluster.addLayer(marker);
		}

		this.map.addLayer(this.markersCluster);

		if(autozoom == true)
			this.zoomHome();
	},
	setMarker(markerData, openPopup){
		const that = this;
		let popup = document.createElement('div'),
			popupTemplate = '<div class="popup-container" style="cursor: pointer;"><strong>' + markerData.id + '</strong><br />'
				+ markerData['number-of-locations'] + ' '
				+ ((markerData['number-of-locations'] > 1) ? 'locations' : 'location') + '<br />'
				+ ((markerData.city != null) ? markerData.city : '')
				+ ((markerData.region != null) ? ', ' + markerData.region : '')
				+ ((markerData.country != null) ? ', ' + markerData.country : '')
				+ '</div>',
			popupOptions = {
				autoClose: false
			};

		popup.innerHTML = popupTemplate;

		let markerWithData = L.Marker.extend({
			'options': {
				'data': null,
				'associatedLayers': []
			}
		});

		let marker = new markerWithData([markerData.latitude, markerData.longitude], {
				'data': markerData
			})
			.bindPopup(popup, popupOptions)
			.on('click', that.markerClick);

		if(openPopup)
			marker.openPopup();
		return marker;
	},
	markerClick(ev){
		let locationId = (ev.target != undefined) ?
			`${ev.target.options.data.id}-${ev.target.options.data.latitude}-${ev.target.options.data.longitude}`
			: ev;

		// find marked location
		let markedLocation = this.locations.filter((location)=>{
			return `${location.id}-${location.latitude}-${location.longitude}` == locationId
		})[0];

		// emit map-component-selected-marker event to parent
		this.$emit('map-component-selected-marker', markedLocation);

		// zoom to marker
//		this.zoomToMarker(this.markers[locationId]);
	},
	zoomToMarker(marker, fly){
		if(marker == undefined)
			return;
		let latLngs = [ marker.getLatLng() ],
			markerBounds = L.latLngBounds(latLngs);
		if(fly == true){
			this.map
				.flyTo(latLngs[0], this.zoomToMarkerZoomLevel, {
					'animate': true,
					'duration': .5
				});
		}
		else {
			this.map
				.fitBounds(markerBounds)
				.setZoom(this.zoomToMarkerZoomLevel);
		}
	},
	zoomToMarkerById(uuid, fly){
		if(uuid == undefined)
			return;
		let marker = this.markers[uuid];

		if(marker == undefined) {
			let searchedMiner = this.miners
				.filter((miner)=>{return `${miner.miner}-${miner.lat}-${miner.long}` == uuid})[0];
			
			if(searchedMiner != undefined)
				marker = this.setMarker({
						'id': searchedMiner.miner,
						'city': searchedMiner.city,
						'region': searchedMiner.region,
						'country': searchedMiner.country,
						'number-of-locations': searchedMiner.numLocations,
						'latitude': searchedMiner.lat,
						'longitude': searchedMiner.long
				});
		}
		
		this.zoomToMarker(marker, fly);
	},
	zoomHome(){
		try {
			if(Object.keys(this.markers).length == 0){
				this.map
					.flyTo(this.defaultHomeLocation, this.defaultHomeZoom, {
						'animate': true,
						'duration': .5
					});
			}
			else if (Object.keys(this.markers).length == 1) {
				this.zoomToMarker(this.markers[Object.keys(this.markers)[0]], false);
			}
			else {
				let group = new L.featureGroup(Object.keys(this.markers).map(key=>this.markers[key]));
				this.map
					.fitBounds(group
						.getBounds()
						.pad(this.boundPad))
					.padding([0, 150]);
			}
		} catch (e) {
//			console.log(e);
		}
	},
	resized(ev) {
		// handle map resize
		this.map.invalidateSize(true);
	}
}

const beforeDestroy = function() {
	// destroy map
	if(this.map != null){
		this.map.remove();
		this.map = null;
	}
}

const destroyed = function() {
}

export default {
	name: 'MapComponent',
	props: ['id', 'view', 'miners'],
	mixins: [
	],
	data () {
		return {
			map: null,
			defaultHomeLocation: [38.0000, -97.0000],
			defaultHomeZoom: 3,
			markers: {},
			markersCluster: null,
			zoomToMarkerZoomLevel: 12,
			boundPad: 0.35,
			notification: null,
			locations: []
		}
	},
	computed: computed,
	created: created,
	mounted: mounted,
	updated: updated,
	watch: watch,
	methods: methods,
	beforeDestroy: beforeDestroy,
	destroyed: destroyed,
}
