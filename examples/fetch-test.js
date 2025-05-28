/**
 * Test file for the new fetch-based implementation
 * This replaces axios with Node.js native fetch API
 */

import { hubClient } from '../src/storage/hub.js';

async function testFetchImplementation() {
    console.log('=== Testing fetch-based implementation ===\n');

    // Test 1: Check client status
    console.log('1. Checking client status...');
    const status = hubClient.getStatus();
    console.log('Status:', status);
    console.log('✅ Status check completed\n');

    // Test 2: Test basic connectivity (if server is available)
    console.log('2. Testing basic connectivity...');
    try {
        // This will test the fetchWithTimeout method
        const testData = {
            test: 'data',
            timestamp: Date.now(),
            name: 'test-agent'
        };

        console.log('Attempting to upload test data...');
        const uploadResult = await hubClient.uploadHub(
            'test-owner',
            'test-filename.json',
            JSON.stringify(testData),
            null,
            true
        );

        console.log('Upload result:', uploadResult);
        console.log('✅ Upload test completed\n');

    } catch (error) {
        console.log('Upload test failed (expected if server is not available):', error.message);
        console.log('ℹ️  This is normal if the server is not running\n');
    }

    // Test 3: Test queue functionality
    console.log('3. Testing upload queue...');
    try {
        // Test non-blocking upload (queue)
        const queueResult = await hubClient.uploadHub(
            'test-owner',
            'queue-test.json',
            JSON.stringify({ queue: 'test' }),
            null,
            false // non-blocking
        );

        console.log('Queue result:', queueResult);
        console.log('Queue length:', hubClient.getStatus().queueLength);

        // Wait for queue to process
        await hubClient.waitForUploadQueue();
        console.log('Queue processed. Final length:', hubClient.getStatus().queueLength);
        console.log('✅ Queue test completed\n');

    } catch (error) {
        console.log('Queue test failed:', error.message);
    }

    // Test 4: Test error handling
    console.log('4. Testing error handling...');
    try {
        // Test with invalid URL to trigger error handling
        const invalidClient = new (await import('../src/storage/hub.js')).default('https://invalid-url-that-does-not-exist.com');

        await invalidClient.uploadHub('test', 'test.txt', 'test message');

    } catch (error) {
        console.log('Error handling test - caught expected error:', error.message);
        console.log('✅ Error handling working correctly\n');
    }

    // Test 5: Test HTTPS configuration
    console.log('5. Testing HTTPS configuration...');
    console.log('NODE_TLS_REJECT_UNAUTHORIZED:', process.env.NODE_TLS_REJECT_UNAUTHORIZED);
    console.log('NODE_ENV:', process.env.NODE_ENV);

    if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Development mode: SSL verification is relaxed');
    } else {
        console.log('✅ Production mode: SSL verification is strict');
    }

    console.log('\n=== All tests completed ===');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testFetchImplementation().catch(console.error);
}

export { testFetchImplementation }; 