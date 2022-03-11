<template>
	<section :class="dashboardClass">
		<Splitter style="width: 100vw" layout="horizontal">
			<SplitterPanel>
				<map-component mode="view" ref="mapComponent" :id="mapId"
					:miners="locations"
					@map-component-selected-marker="(marker) => selectMiner(marker)">
				</map-component>
				<div class="search-miners">
					<AutoComplete v-model="filteredMiner"
						:suggestions="minersSuggestions" @complete="searchMiners($event)"
						field="miner" placeholder="Miner Id (e.g. f01234)" />
				</div>
			</SplitterPanel>
			<SplitterPanel>
				<div class="data-container">
					<div class="table-container">
						<DataTable :value="selectedMiners" ref="dt"
							:scrollable="true" scrollHeight="calc(50vh - 74px)"
							:reorderableColumns="true"
							v-model:selection="selectedMinersForGraphs" selectionMode="multiple" dataKey="uuid"
							sortMode="multiple">
							<template #header>
								<div class="table-header-container">
									<div class="table-header-buttons">
										<span>
											<Button icon="pi pi-external-link" label="Export" @click="$refs.dt.exportCSV($event)" />
										</span>
										<span style="margin-left:.5em">
											<Button icon="pi pi-trash" class="p-button-danger" label="Clear" @click="clearselectedMiners" />
										</span>
									</div>
									<div class="table-header-datepicker">
										<Datepicker v-model="dateRange" range
											position="right" />
									</div>
								</div>
							</template>
							<Column field="id" header="Miner" :sortable="true"></Column>
							<Column field="city" header="City" :sortable="true"></Column>
							<Column field="region" header="Region" :sortable="true"></Column>
							<Column field="country" header="Country" :sortable="true"></Column>
							<Column field="totalPower" header="Total [W]" :sortable="true"></Column>
							<Column field="storagePower" header="Storage [W]" :sortable="true"></Column>
							<Column field="sealingPower" header="Sealing [W]" :sortable="true"></Column>
							<Column field="capacity" header="Capacity [GiB]" :sortable="true"></Column>
							<Column field="sealed" header="Sealed [GiB]" :sortable="true"></Column>
							<Column field="recs" header="RECs" :sortable="true">
								<template #body="slotProps">
									<div>
										<Avatar :label="(slotProps.data.recs != undefined) ? `${(slotProps.data.recs > 1000000) ? slotProps.data.recs/1000000 : slotProps.data.recs}` : ''" shape="circle"
											@click.stop="transactions(slotProps.data)"
											:style="(slotProps.data.recs > 0) ? 'background-color:#2196F3; color: #ffffff' : 'background-color:#D32F2F; color: #ffffff'">
										</Avatar>
									</div>
								</template>
							</Column>
						</DataTable>
					</div>
					<div id="charts" class="graphs-container">
					</div>
				</div>
			</SplitterPanel>
		</Splitter>
		<Dialog v-model:visible="transactionsVisibility" :modal="true"
			:maximizable="true"
			:breakpoints="{'960px': '100vw'}">
			<div class="dialog-content-holder">
				<Fieldset legend="Transactions" :toggleable="true" :collapsed="false" style="max-width:100%">
					<div class="dialog-block-content-holder">
						<div class="row">
							<div class="row-header">Total RECs:</div>
							<div class="row-content">{{ transactionsData.recs }}</div>
						</div>
						<div class="row">
							<div class="row-header">Page URL:</div>
							<div class="row-content clickable"
								@click="openLink(transactionsData.recsData.pageUrl)">{{ transactionsData.recsData.pageUrl }}</div>
						</div>
						<div class="row">
							<div class="row-header">Buyer ID:</div>
							<div class="row-content">{{ transactionsData.recsData.buyerId }}</div>
						</div>
						<div class="row">
							<div class="row-header">Transactions:</div>
							<div class="row-content">{{ transactionsData.recsData.transactions.length }}</div>
						</div>
					</div>
				</Fieldset>
				<br /><br />
				<Fieldset legend="Generation" :toggleable="true" :collapsed="false" style="max-width:100%">
					<div v-for="transaction in transactionsData.recsData.transactions" class="dialog-block-content-holder" :key="transaction.id">
						<div class="row">
							<div class="row-header">RECs:</div>
							<div class="row-content">{{ transaction.recsSold }}</div>
						</div>
						<div class="row">
							<div class="row-header">Period:</div>
							<div class="row-content">{{ moment(transaction.generation.reportingStart).format('MM/DD/YYYY') }} -
								{{ moment(transaction.generation.reportingEnd).format('MM/DD/YYYY') }}</div>
						</div>
						<div class="row">
							<div class="row-header">Source:</div>
							<div class="row-content">{{ transaction.generation.energySource }}</div>
						</div>
						<div class="row">
							<div class="row-header">Country:</div>
							<div class="row-content">{{ transaction.generation.country }}</div>
						</div>
						<div class="row">
							<div class="row-header">Page URL:</div>
							<div class="row-content clickable"
								@click="openLink(transaction.pageUrl)">{{ transaction.pageUrl }}</div>
						</div>
					</div>
				</Fieldset>
				<br /><br />
				<Fieldset legend="Documents" :toggleable="true" :collapsed="false" style="max-width:100%">
					<div v-for="document in transactionsDocuments" class="dialog-block-content-holder" :key="document.id">
						<div class="row">
							<div class="row-header">{{ document.fileName }}</div>
							<div class="row-content clickable"
								@click="openDocument(document.url, 'application/pdf')"><i class="pi pi-file-pdf"></i></div>
						</div>
					</div>
				</Fieldset>
			</div>
			<template #footer>
				<Button label="OK" icon="pi pi-check" autofocus
					@click="transactionsVisibility = false" />
			</template>
		</Dialog>
		<div class="loader-container" v-if="loading">
			<div class="loader">
				<ProgressBar :value="loadingProgress">
					{{loadingProgress}}%
				</ProgressBar>
			</div>
		</div>
	</section>
</template>

<script src="@/src/js/dashboard/dashboard.js" scoped></script>
<style src="@/src/scss/dashboard/dashboard.scss" lang="scss" scoped></style>
