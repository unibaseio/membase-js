import {
    Message,
    BufferedMemory,
    MultiMemory,
} from '../src/index.js';

console.log('=== Membase JS Library Test ===\n');

console.log('\n1. === Memory Test ===');
const test_owner = process.env.MEMBASE_ACCOUNT || 'test-owner-' + Math.random().toString(36).substring(2, 15);
const test_conversation = 'test-conversation-' + Math.random().toString(36).substring(2, 15);
const test_agent = 'test-agent-' + Math.random().toString(36).substring(2, 15);
try {
    const memory = new BufferedMemory(test_conversation, test_owner, true);
    console.log('✓ BufferedMemory initialized');
    console.log('  Conversation ID:', memory.conversationId);
    console.log('  Account:', memory.membaseAccount);

    // Add some test messages
    const message1 = new Message(test_agent, 'Hello, this is a test message', 'user');
    const message2 = new Message(test_agent, 'Hello! I received your test message.', 'assistant');

    memory.add(message1);
    memory.add(message2);

    console.log('✓ Added messages to memory');
    console.log('  Memory size:', memory.size());
    console.log('  Recent messages count:', memory.get(2).length);

    // Test serialization
    const messages = memory.get();
    console.log('  First message content:', messages[0]?.content);
    console.log('  Message IDs exist:', messages.every(m => m.id));

} catch (error) {
    console.log('✗ Memory test failed:', error.message);
}

console.log('\n2. === Multi-Memory Test ===');
try {
    const multiMemory = new MultiMemory(test_owner, true, null, false);
    console.log('✓ MultiMemory initialized');
    console.log('  Default conversation ID:', multiMemory.defaultConversationId);

    // Add messages to different conversations
    multiMemory.add(new Message(test_agent, 'First conversation message', 'user'), 'conv1');
    multiMemory.add(new Message(test_agent, 'Second conversation message', 'user'), 'conv2');
    multiMemory.add(new Message(test_agent, 'Response to first', 'assistant'), 'conv1');

    console.log('✓ Added messages to multiple conversations');
    console.log('  All conversations:', multiMemory.getAllConversations());
    console.log('  Conv1 size:', multiMemory.size('conv1'));
    console.log('  Conv2 size:', multiMemory.size('conv2'));
    console.log('  Total size:', multiMemory.size());

} catch (error) {
    console.log('✗ Multi-Memory test failed:', error.message);
}

console.log('\n=== Test Summary ===');
console.log('All basic functionality tests completed.');
console.log('Note: Some tests require proper environment setup and running services.');
console.log('\nEnvironment variables to set for full functionality:');
console.log('- MEMBASE_ID, MEMBASE_ACCOUNT, MEMBASE_SECRET_KEY');
console.log('- MEMBASE_HUB');
console.log('- MEMBASE_CHROMA_HOST, MEMBASE_CHROMA_PORT'); 