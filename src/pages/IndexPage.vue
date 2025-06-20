<template>
	<q-page class="q-pa-md">
		<div class="row q-gutter-md">
			<!-- MCP Server Control Panel -->
			<div class="col-12 col-md-4">
				<TokenManager @server-status-change="onServerStatusChange" />
			</div>

			<!-- Light Controls Panel -->
			<div class="col-12 col-md-4">
				<LightControls :mcp-server-connected="serverConnected" />
			</div>

			<!-- Claude Chat Panel -->
			<div class="col-12 col-md-4">
				<ClaudeChat />
			</div>
		</div>
	</q-page>
</template>

<script setup>
	import { ref } from 'vue';
	import TokenManager from 'components/TokenManager.vue';
	import LightControls from 'components/LightControls.vue';
	import ClaudeChat from 'components/ClaudeChat.vue';

	// Reactive state
	const serverConnected = ref(false);

	// Methods
	const onServerStatusChange = (status) => {
		serverConnected.value = status.connected;
	};

	defineOptions({
		name: 'IndexPage',
	});
</script>
