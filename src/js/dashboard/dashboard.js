import { markRaw } from 'vue'

import process from '@/.env.local'

import axios from 'axios'
import moment from 'moment'
import language from '@/src/mixins/i18n/language.js'

import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import AutoComplete from 'primevue/autocomplete'
import Avatar from 'primevue/avatar'
import AvatarGroup from 'primevue/avatargroup'
import Dialog from 'primevue/dialog'
import Fieldset from 'primevue/fieldset'
import ProgressBar from 'primevue/progressbar'

import Datepicker from '@vuepic/vue-datepicker'

import * as ECharts from 'echarts/core';
import {
  TitleComponent,
  ToolboxComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent
} from 'echarts/components';
import { LineChart } from 'echarts/charts';
import { UniversalTransition } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';

ECharts.use([
	TitleComponent,
	ToolboxComponent,
	TooltipComponent,
	GridComponent,
	LegendComponent,
	DataZoomComponent,
	LineChart,
	CanvasRenderer,
	UniversalTransition
]);

import miners from '@/asset/20220108_miner_locations.json'
import model from '@/asset/model-v-1-0-1.json'

import MapComponent from '@/src/components/common/MapComponent.vue'

const created = function() {
	const that = this;

	// set language
	this.setLanguage(this.$route);
}

const computed = {
	dashboardClass() {
		return this.theme + '-dashboard-' + this.themeVariety;
	},
	locale() {
		return this.$store.getters['dashboard/getLocale'];
	},
	theme() {
		return this.$store.getters['dashboard/getTheme'];
	},
	themeVariety() {
		return this.$store.getters['dashboard/getThemeVariety'];
	},
	locations() {
		return miners.minerLocations;
	},
	markedLocation() {
		return this.$store.getters['dashboard/getMarkedLocation'];
	},
	chartsContainer() {
		return document.getElementById('charts');
	}
}

const watch = {
	selectedMinersForGraphs: {
		// TODO, compare miners graphs
		async handler() {
			if(this.selectedMinersForGraphs.length == 0)
				return;

			const latestSelected = this.selectedMinersForGraphs[this.selectedMinersForGraphs.length-1].id;
			this.loading = true;
			this.loadingProgress = 0;
			let totalEnergyData = [], totalEnergyDataChunk = [], limit = 10000, offset = 0;
			do {
				totalEnergyDataChunk = (await this.getFilecoinEnergyData(latestSelected, 'TotalEnergyModelv_1_0_1', this.dateRange[0].toUTCString(), this.dateRange[1].toUTCString(), limit, offset)).data.data;
				totalEnergyData = totalEnergyData.concat(totalEnergyDataChunk);
				offset += limit;
				this.loadingProgress = Math.round(this.loadingProgress + (100 - this.loadingProgress)/7);
			} while (totalEnergyDataChunk.length);
			this.loadingProgress = 100;
			this.loading = false;

			this.loading = true;
			this.loadingProgress = 0;
			let totalCapacityData = [], totalCapacityDataChunk = [];
			offset = 0;
			do {
				totalCapacityDataChunk = (await this.getFilecoinEnergyData(latestSelected, 'CapacityModel', this.dateRange[0].toUTCString(), this.dateRange[1].toUTCString(), limit, offset)).data.data;
				totalCapacityData = totalCapacityData.concat(totalCapacityDataChunk);
				offset += limit;
				this.loadingProgress = Math.round(this.loadingProgress + (100 - this.loadingProgress)/7);
			} while (totalCapacityDataChunk.length);
			this.loadingProgress = 100;
			this.loading = false;

			const xAxis = totalEnergyData.map((chunk)=>{return moment(chunk.timestamp).format('D/M h:mm')}),
				totalEnergyEstimates = totalEnergyData.map((chunk)=>{return chunk.total_energy_kW_estimate}),
				totalCapacity = totalCapacityData.map((chunk)=>{return chunk.capacity_GiB});

			this.drawCharts(xAxis, totalEnergyEstimates, totalCapacity);
		},
		immediate: true,
		deep: true
	},
	dateRange: {
		async handler() {
			for (let i = 0; i < this.selectedMiners.length; i++) {
				this.$store.dispatch('dashboard/setMarkedLocation', this.selectedMiners[i]);
				await this.updateSelectedMiners(true);
			}
		},
		immediate: true,
		deep: true
	},
	filteredMiner: {
		handler() {
			const uuid = `${this.filteredMiner.miner}-${this.filteredMiner.lat}-${this.filteredMiner.long}`;
			this.$refs.mapComponent.zoomToMarkerById(uuid);
		},
//		immediate: true,
		deep: true
	}
}

const mounted = function() {
	// define resize observers
	new ResizeObserver(this.resized).observe(this.chartsContainer);

	const endDate = new Date(),
		startDate = new Date(new Date().setDate(endDate.getDate() - 180));
	this.dateRange = [startDate, endDate];
}

const methods = {
	getFilecoinEnergyData(miner, dataType, start, end, limit, offset) {
		const self = this,
			getUri = 'https://api.filecoin.energy:443/models/export?code_name=' +
				((dataType != undefined) ? dataType : 'TotalEnergyModelv_1_0_1') +	// in case of parameter missing -> total energy
				'&miner=' + miner +
				'&start=' + start +
				'&end=' + end +
				'&limit=' + ((limit != undefined) ? limit : 1000) +
				'&offset=' + ((offset != undefined) ? offset : 0);
		return axios(getUri, {
			method: 'get'
		});
	},
	getEnergyWebZeroTransactionsData(miner) {
		const self = this,
			getUri = `https://proofs-api.zerolabs.green/api/partners/filecoin/nodes/${miner}/transactions`;
		return axios(getUri, {
			method: 'get'
		});
	},
	getEnergyWebZeroPurchasesData(transaction) {
		const self = this,
			getUri = `https://proofs-api.zerolabs.green/api/partners/filecoin/purchases/${transaction}`;
		return axios(getUri, {
			method: 'get',
			headers: {
				'X-API-key': `${process.env.zerolabs.key}`
			}
		});
	},
	selectMiner(markedLocation) {
		// update marked location
		this.$store.dispatch('dashboard/setMarkedLocation', markedLocation);

		// update selected miners list
		this.updateSelectedMiners();
	},
	async updateSelectedMiners(updateExisting) {
		if(this.markedLocation == null)
			return;

		const uniqueids = this.selectedMiners.map((miner)=>{return `${miner.id}-${miner.latitude}-${miner.longitude}`}),
			uniqueid = `${this.markedLocation.id}-${this.markedLocation.latitude}-${this.markedLocation.longitude}`;
		let index = uniqueids.indexOf(uniqueid);

		if(index == -1 || updateExisting) {
			// add to selected miners
			const uuid = `${this.markedLocation.id}-${this.markedLocation.latitude}-${this.markedLocation.longitude}`;
			this.markedLocation.uuid = uuid;
			if(!updateExisting)
				this.selectedMiners.push(this.markedLocation);

			// get miner's capacity
			this.loading = true;
			this.loadingProgress = 0;
			let capacityData, capacityRecords = 0, sumCapacity = 0, avgCapacity = 0, limit = 10000, offset = 0;
			do {
				capacityData = (await this.getFilecoinEnergyData(this.markedLocation.id, 'CapacityModel', this.dateRange[0].toUTCString(), this.dateRange[1].toUTCString(), limit, offset)).data.data;
				capacityRecords += capacityData.length
				sumCapacity += capacityData.reduce((prev, elem) => prev + parseFloat(elem.capacity_GiB), 0);
				offset += limit;
				this.loadingProgress = Math.round(this.loadingProgress + (100 - this.loadingProgress)/7);
			} while (capacityData.length);
			avgCapacity = (capacityRecords > 0) ? sumCapacity / capacityRecords : sumCapacity;
			this.loadingProgress = 100;
			this.loading = false;

			// get miner's sealing records
			this.loading = true;
			this.loadingProgress = 0;
			const days = moment(this.dateRange[1]).diff(moment(this.dateRange[0]), 'days');
			let sealingData, sumSealed = 0, sealedPerDay = 0;
			offset = 0;
			do {
				sealingData = (await this.getFilecoinEnergyData(this.markedLocation.id, 'SealedModel', this.dateRange[0].toUTCString(), this.dateRange[1].toUTCString(), limit, offset)).data.data;
				sumSealed = sealingData.reduce((prev, elem) => prev + parseFloat(elem.sealed_GiB), 0);
				offset += limit;
				this.loadingProgress = Math.round(this.loadingProgress + (100 - this.loadingProgress)/7);
			} while (capacityData.length);
			sealedPerDay = (days > 0) ? sumSealed / days : sumSealed;
			this.loadingProgress = 100;
			this.loading = false;

			// calculate power per model (v1.0.1)
			const storagePower = avgCapacity * Math.pow(1024, 3) * model.storage.estimate,
				sealingPower = sealedPerDay * Math.pow(1024, 3) * model.sealing.estimate;

			// get energy web zero transactions data
			let recs = 0,
				recsData = null;
			try {
				const transactionsData = await this.getEnergyWebZeroTransactionsData(this.markedLocation.id);
				if(transactionsData.status == 200) {
					recsData = transactionsData.data;
					recs = recsData.recsTotal;
				}
				} catch (error) {
			}

			// update table
			this.updateData(this.markedLocation.id, storagePower, sealingPower, avgCapacity, sealedPerDay, recs, recsData);
		}
		else {
			// remove from selected miners
			this.selectedMiners.splice(index, 1);
		}
	},
	updateData(miner, storagePower, sealingPower, avgCapacity, sealedPerDay, recs, recsData) {
		const indexes = this.selectedMiners
			.map((mn, ind)=>{return [mn.id, ind]})
			.filter((mnind)=>{return mnind[0] == miner});
		for(let i=0; i<indexes.length; i++) {
			this.selectedMiners[indexes[i][1]].totalPower = (storagePower + sealingPower).toFixed(2);
			this.selectedMiners[indexes[i][1]].storagePower = storagePower.toFixed(2);
			this.selectedMiners[indexes[i][1]].sealingPower = sealingPower.toFixed(2);
			this.selectedMiners[indexes[i][1]].capacity = avgCapacity.toFixed(2);
			this.selectedMiners[indexes[i][1]].sealed = sealedPerDay.toFixed(2);
			this.selectedMiners[indexes[i][1]].recs = recs;
			this.selectedMiners[indexes[i][1]].recsData = recsData;
		}
	},
	clearselectedMiners() {
		this.selectedMiners.length = 0;

		if(this.charts != null) {
			this.charts.dispose();
			this.charts = null;
		}
	},
	searchMiners(event) {
		this.minersSuggestions = this.locations.filter((location)=>{
			return location.miner.indexOf(event.query) > -1;
		});	
	},
	async transactions(minerData) {
		if(!minerData.recs)
			return;
		
		this.transactionsData = minerData;
		this.transactionsVisibility = true;
		this.transactionsDocuments.length = 0;

		const transactions = minerData.recsData.transactions;
		for (let i = 0; i < transactions.length; i++) {
			const transaction = transactions[i],
				purchaseData = await this.getEnergyWebZeroPurchasesData(transaction.id);
			if(purchaseData.status == 200)
				this.transactionsDocuments = this.transactionsDocuments.concat(purchaseData.data.files);
		}
	},
	openLink(link) {
		window.open(link, "_blank");
	},
	async openDocument(link, type) {
		const self = this,
			getUri = `${link}`;
		let response = await axios(getUri, {
			method: 'get',
			headers: {
				'X-API-key': `${process.env.zerolabs.key}`
			},
			responseType: 'blob'
		});
		if(response.status == 200) {
			let content = [];
			content.push(response.data);
			window.open(
				URL.createObjectURL(new Blob(content, {type: type})),
				"_blank");
		}
	},
	drawCharts(timeData, series1Data, series2Data) {
		let option = {
			title: {
				text: 'Power vs Capacity',
				left: 'center'
			},
			tooltip: {
				trigger: 'axis',
				axisPointer: {
					animation: false
				}
			},
			legend: {
				data: ['Capacity', 'Power'],
				left: 10
			},
			toolbox: {
				feature: {
					dataZoom: {
						yAxisIndex: 'none'
					},
					restore: {},
					saveAsImage: {}
				}
			},
			axisPointer: {
				link: [
					{
					xAxisIndex: 'all'
					}
				]
			},
			dataZoom: [
				{
					show: true,
					realtime: true,
					start: 30,
					end: 70,
					xAxisIndex: [0, 1]
				},
				{
					type: 'inside',
					realtime: true,
					start: 30,
					end: 70,
					xAxisIndex: [0, 1]
				}
			],
			grid: [
				{
					left: 60,
					right: 50,
					height: '35%'
				},
				{
					left: 60,
					right: 50,
					top: '55%',
					height: '35%'
				}
			],
			xAxis: [
				{
					type: 'category',
					boundaryGap: false,
					axisLine: { onZero: true },
					data: timeData
				},
				{
					gridIndex: 1,
					type: 'category',
					boundaryGap: false,
					axisLine: { onZero: true },
					data: timeData,
					position: 'top'
				}
			],
			yAxis: [
				{
					name: 'Capacity(GiB)',
					type: 'value'
				},
				{
					gridIndex: 1,
					name: 'Power(kW)',
					type: 'value',
					inverse: true
				}
			],
			series: [
				{
					name: 'Capacity',
					type: 'line',
					symbolSize: 8,
					data: series2Data
				},
				{
					name: 'Power',
					type: 'line',
					xAxisIndex: 1,
					yAxisIndex: 1,
					symbolSize: 8,
					data: series1Data
				}
			]
		};

		if(this.charts != null) {
			this.charts.dispose();
			this.charts = null;
		}
		/*
		You can choose to exit the default depth response / read-only conversion mode, and embed the original, unpredictable objects into the state diagram. They can be flexible according to the situation:
		Some values ​​should not be responsive, such as complex third-party class instances or VUE component objects.
		Skip Proxy conversions can improve performance when rendering large numbers with non-variable data sources.
		(https://programmerall.com/article/20052264316/)
		*/
		this.charts = markRaw(ECharts.init(document.getElementById('charts'), null, {width: 'auto', height: 'auto'}));
		this.charts.setOption(option, true);
	},
	resized(ev) {
		// handle resize
		if(this.charts != undefined)
			this.charts.resize();
	}
}

const destroyed = function() {
}

export default {
	mixins: [
		language
	],
	components: {
		Splitter,
		SplitterPanel,
		DataTable,
		Column,
		Button,
		AutoComplete,
		Avatar,
		AvatarGroup,
		Dialog,
		Fieldset,
		ProgressBar,
		Datepicker,
		MapComponent
	},
	directives: {
	},
	name: 'Dashboard',
	data () {
		return {
			moment: moment,
			mapId: 'mainMap',
			selectedMiners: [],
			selectedMinersForGraphs: [],
			dateRange: [],
			data: {},
			filteredMiner: null,
			minersSuggestions: [],
			transactionsVisibility: false,
			transactionsData: {},
			transactionsDocuments: [],
			charts: null,
			loading: false,
			loadingProgress: 0
		}
	},
	created: created,
	computed: computed,
	watch: watch,
	mounted: mounted,
	methods: methods,
	destroyed: destroyed
}
