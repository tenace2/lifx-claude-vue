#!/usr/bin/env node

// Test script to verify conversation context fixes
async function testClaudeConversation() {
	console.log('Testing Claude conversation context...');

	// Simulate a conversation: red -> blue -> green
	const tests = [
		{ message: 'Turn lights red', context: [] },
		{
			message: 'Turn lights blue',
			context: [
				{ role: 'user', content: 'Turn lights red' },
				{ role: 'assistant', content: "I've turned your lights red!" },
			],
		},
		{
			message: 'Turn lights green',
			context: [
				{ role: 'user', content: 'Turn lights red' },
				{ role: 'assistant', content: "I've turned your lights red!" },
				{ role: 'user', content: 'Turn lights blue' },
				{ role: 'assistant', content: "I've turned your lights blue!" },
			],
		},
	];

	for (let i = 0; i < tests.length; i++) {
		const test = tests[i];
		console.log(`\n--- Test ${i + 1}: "${test.message}" ---`);
		console.log('Context:', test.context.length, 'messages');

		try {
			const response = await fetch('http://localhost:3001/api/claude', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					message: test.message,
					conversationHistory: test.context,
					apiKey: 'sk-test', // Replace with real key for actual testing
				}),
			});

			const data = await response.json();
			if (response.ok) {
				console.log('✅ Response:', data.response);
				if (data.toolResults && data.toolResults.length > 0) {
					console.log('🔧 Tool used:', data.toolResults[0].details);
				}
			} else {
				console.log('❌ Error:', data.error);
			}
		} catch (error) {
			console.log('❌ Request failed:', error.message);
		}

		// Wait a bit between requests
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}
}

// Only run if called directly
if (require.main === module) {
	testClaudeConversation();
}
