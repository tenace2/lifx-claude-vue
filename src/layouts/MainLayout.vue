<template>
	<q-layout view="lHh Lpr lFf">
		<q-header elevated>
			<q-toolbar>
				<q-btn
					flat
					dense
					round
					icon="menu"
					aria-label="Menu"
					@click="toggleLeftDrawer"
				/>

				<q-toolbar-title> LIFX Claude Demo </q-toolbar-title>

				<!-- Backend Status Indicator -->
				<div class="row items-center q-mr-md">
					<q-icon
						:name="'circle'"
						:color="backendReachable ? 'green' : 'red'"
						size="sm"
						class="q-mr-xs"
					/>
					<span
						class="text-caption"
						:class="backendReachable ? 'text-green' : 'text-red'"
					>
						{{
							backendReachable
								? 'Backend Server Running'
								: 'Backend Server Down'
						}}
					</span>

					<!-- Status tooltip with detailed info -->
					<q-tooltip
						class="text-body2"
						:class="
							backendReachable
								? 'bg-positive text-white'
								: 'bg-negative text-white'
						"
						anchor="bottom middle"
						self="top middle"
						:offset="[0, 10]"
						max-width="500px"
					>
						<div class="q-pa-sm">
							<div v-if="backendReachable">
								<div class="text-weight-bold row items-center q-mb-xs">
									<q-icon name="check_circle" class="q-mr-xs" />
									Backend Server (mcp-server-manager.js) Running
								</div>
								<div class="text-caption">
									✓ HTTP API server active on port
									{{ backendConnection.port || '(discovering...)' }}<br />
									✓ Ready to manage LIFX MCP server process<br />
									✓ Protocol bridge: HTTP ↔ JSON-RPC<br />
									<span v-if="backendConnection.port" class="text-blue-3">
										🔍 Auto-discovered on {{ backendConnection.baseUrl }}
									</span>
								</div>
							</div>
							<div v-else>
								<div class="text-weight-bold row items-center q-mb-xs">
									<q-icon name="warning" class="q-mr-xs" />
									Backend Server Not Running
								</div>
								<div class="text-caption">
									The backend server (mcp-server-manager.js) manages the LIFX
									MCP server process and provides the HTTP API for this Vue
									frontend.<br /><br />
									<strong>Start with:</strong><br />
									<code class="bg-white text-dark q-pa-xs rounded"
										>cd server && node mcp-server-manager.js</code
									>
								</div>
							</div>
						</div>
					</q-tooltip>
				</div>

				<div class="text-caption">v{{ $q.version }}</div>
			</q-toolbar>
		</q-header>

		<q-drawer v-model="leftDrawerOpen" show-if-above bordered>
			<q-list>
				<q-item-label header> Essential Links </q-item-label>

				<EssentialLink
					v-for="link in linksList"
					:key="link.title"
					v-bind="link"
				/>
			</q-list>
		</q-drawer>

		<q-page-container>
			<router-view />
		</q-page-container>
	</q-layout>
</template>

<script setup>
	import { ref } from 'vue';
	import EssentialLink from 'components/EssentialLink.vue';
	import { useBackendStatus } from '../composables/useBackendStatus.js';

	defineOptions({
		name: 'MainLayout',
	});

	// Use the shared backend status
	const { backendReachable, backendConnection } = useBackendStatus();

	const linksList = [
		{
			title: 'Docs',
			caption: 'quasar.dev',
			icon: 'school',
			link: 'https://quasar.dev',
		},
		{
			title: 'Github',
			caption: 'github.com/quasarframework',
			icon: 'code',
			link: 'https://github.com/quasarframework',
		},
		{
			title: 'Discord Chat Channel',
			caption: 'chat.quasar.dev',
			icon: 'chat',
			link: 'https://chat.quasar.dev',
		},
		{
			title: 'Forum',
			caption: 'forum.quasar.dev',
			icon: 'record_voice_over',
			link: 'https://forum.quasar.dev',
		},
		{
			title: 'Twitter',
			caption: '@quasarframework',
			icon: 'rss_feed',
			link: 'https://twitter.quasar.dev',
		},
		{
			title: 'Facebook',
			caption: '@QuasarFramework',
			icon: 'public',
			link: 'https://facebook.quasar.dev',
		},
		{
			title: 'Quasar Awesome',
			caption: 'Community Quasar projects',
			icon: 'favorite',
			link: 'https://awesome.quasar.dev',
		},
	];

	const leftDrawerOpen = ref(false);

	function toggleLeftDrawer() {
		leftDrawerOpen.value = !leftDrawerOpen.value;
	}
</script>
