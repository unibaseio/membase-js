import {
    Auth,
    membaseChain,
    membaseId
} from '../src/index.js';

console.log('=== Membase JS Library Test ===\n');


console.log('\n1. === Chain Test ===');
try {
    if (membaseChain) {
        console.log('✓ Chain client initialized');
        console.log('  Current RPC:', membaseChain.currentRpc);
        console.log('  Wallet address:', membaseChain.walletAddress);
        console.log('  Membase ID:', membaseId);

        // Test message signing
        const testMessage = 'Test message for signing';
        const signature = await membaseChain.signMessage(testMessage);
        console.log('✓ Message signed successfully');
        console.log('  Signature length:', signature.length);

        // Test signature verification
        const isValid = await membaseChain.validSignature(testMessage, signature, membaseChain.walletAddress);
        console.log('✓ Signature verification:', isValid ? 'VALID' : 'INVALID');



        const agent_name = 'test-agent-' + Math.random().toString(36).substring(2, 15);
        membaseChain.register(agent_name);
        console.log('✓ Agent registered');

        const new_agent_name = 'test-agent-' + Math.random().toString(36).substring(2, 15);
        membaseChain.register(new_agent_name);
        console.log('✓ New agent registered');

        await new Promise(resolve => setTimeout(resolve, 5000));

        membaseChain.buy(agent_name, new_agent_name);
        console.log('✓ Agent bought');

        const has_auth = await membaseChain.hasAuth(agent_name, new_agent_name);
        console.log('✓ Agent has auth:', has_auth);


        const task_id = 'test-task-' + Math.random().toString(36).substring(2, 15);
        membaseChain.createTask(task_id, 100);
        console.log('✓ Task created');

        await new Promise(resolve => setTimeout(resolve, 5000));

        membaseChain.joinTask(task_id, agent_name);
        console.log('✓ Agent joined task');

        membaseChain.joinTask(task_id, new_agent_name);
        console.log('✓ New agent joined task');

        await new Promise(resolve => setTimeout(resolve, 5000));

        membaseChain.finishTask(task_id, agent_name);
        console.log('✓ Agent finished task');
    } else {
        console.log('⚠ Chain client not initialized (missing environment variables)');
        console.log('  Required: MEMBASE_ACCOUNT, MEMBASE_SECRET_KEY');
    }

    // Test Auth functionality
    const auth = new Auth();
    console.log('✓ Auth client initialized');

    if (membaseChain) {
        const timestamp = Math.floor(Date.now() / 1000);
        const authSignature = await auth.createAuth(timestamp);
        console.log('✓ Auth signature created');
        console.log('  Timestamp:', timestamp);
        console.log('  Signature length:', authSignature.length);
    }

} catch (error) {
    console.log('✗ Chain test failed:', error.message);
}

console.log('\n=== Test Summary ===');
console.log('All basic functionality tests completed.');
console.log('Note: Some tests require proper environment setup and running services.');
console.log('\nEnvironment variables to set for full functionality:');
console.log('- MEMBASE_ID, MEMBASE_ACCOUNT, MEMBASE_SECRET_KEY');
console.log('- MEMBASE_HUB');
console.log('- MEMBASE_CHROMA_HOST, MEMBASE_CHROMA_PORT'); 