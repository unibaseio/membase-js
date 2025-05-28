import {
    Storage,
} from '../src/index.js';

console.log('=== Membase JS Library Test ===\n');

// Test 1: Hub Storage
console.log('1. === Hub Storage Test ===');
try {
    const test_owner = process.env.MEMBASE_ACCOUNT || 'test-owner-' + Math.random().toString(36).substring(2, 15);
    const hubUrl = process.env.MEMBASE_HUB || 'https://testnet.hub.membase.io';
    const storage = new Storage(hubUrl);
    console.log('✓ Storage client initialized');
    console.log('  Base URL:', storage.baseUrl);
    console.log('  Membase ID:', storage.membaseId);

    // Test upload with wait (blocking)
    const filename = 'test-file-' + Math.random().toString(36).substring(2, 15);
    console.log('  Testing upload with wait (blocking)...');
    const testData1 = {
        test: 'data1',
        timestamp: Date.now(),
        name: 'test-agent-' + Math.random().toString(36).substring(2, 15)
    };
    try {
        const uploadResult = await storage.uploadHub(test_owner, filename + '_0', JSON.stringify(testData1), null, true);
        console.log('✓ Upload completed successfully');
        console.log('  Upload result:', uploadResult);
    } catch (uploadError) {
        console.log('⚠ Upload failed (expected if hub is not available):', uploadError.message);
    }

    // Test upload queue functionality (non-blocking)
    console.log('  Testing upload queue (non-blocking)...');
    const testData2 = {
        test: 'data2',
        timestamp: Date.now()
    };
    const queueResult = await storage.uploadHub(test_owner, filename + '_1', JSON.stringify(testData2), null, false);
    console.log('✓ Upload queued successfully');
    console.log('  Queue result:', queueResult);

    // Wait for upload queue to complete
    console.log('  Waiting for upload queue to complete...');
    await storage.waitForUploadQueue();
    console.log('✓ Upload queue completed');

    // Test download functionality
    console.log('  Testing download...');
    try {
        const downloadResult = await storage.downloadHub(test_owner, filename + '_0');
        console.log('✓ Download completed successfully');
        console.log('  Downloaded data size:', downloadResult ? downloadResult.byteLength || downloadResult.length : 0);

        // Compare with testData1
        if (downloadResult) {
            try {
                // Convert ArrayBuffer to string if needed
                let downloadedString;
                if (downloadResult instanceof ArrayBuffer) {
                    downloadedString = new TextDecoder().decode(downloadResult);
                } else {
                    downloadedString = downloadResult.toString();
                }

                const downloadedData = JSON.parse(downloadedString);
                const originalData = testData1;

                console.log('  Comparing downloaded data with original testData1...');
                console.log('  Original data:', originalData);
                console.log('  Downloaded data:', downloadedData);

                // Compare key fields
                const isTestMatch = downloadedData.test === originalData.test;
                const isTimestampMatch = downloadedData.timestamp === originalData.timestamp;
                const isNameMatch = downloadedData.name === originalData.name;

                console.log('✓ Data comparison results:');
                console.log('  Test field match:', isTestMatch);
                console.log('  Timestamp match:', isTimestampMatch);
                console.log('  Name field match:', isNameMatch);
                console.log('  Overall match:', isTestMatch && isTimestampMatch && isNameMatch);

            } catch (parseError) {
                console.log('⚠ Failed to parse downloaded data for comparison:', parseError.message);
            }
        } else {
            console.log('⚠ No data downloaded to compare');
        }
    } catch (downloadError) {
        console.log('⚠ Download failed (expected if hub is not available):', downloadError.message);
    }

    // Test list conversations
    console.log('  Testing list conversations...');
    try {
        const conversations = await storage.listConversations(test_owner);
        console.log('✓ List conversations completed');
        console.log('  Conversations count:', Array.isArray(conversations) ? conversations.length : 'N/A');

        // Check if our uploaded files are in the conversations list
        if (Array.isArray(conversations)) {
            console.log('  Conversations list:', conversations);

            // Check for our uploaded filenames
            const containsFilename = conversations.includes(filename);

            console.log('  Contains uploaded conversation (' + filename + '):', containsFilename);

            if (containsFilename) {
                console.log('✓ Uploaded file found in conversations');
            } else {
                console.log('⚠ Uploaded files not found in conversations list');
            }
        }
    } catch (listError) {
        console.log('⚠ List conversations failed (expected if hub is not available):', listError.message);
    }

    // wait for 10 seconds
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Test get specific conversation
    console.log('  Testing get conversation...');
    try {
        const conversation = await storage.getConversation(test_owner, filename);
        console.log('✓ Get conversation completed');
        console.log('  Conversation data:', conversation ? 'Available' : 'Not found');

        // Check if conversation contains our uploaded data
        if (conversation && Array.isArray(conversation)) {
            console.log('  Conversation messages count:', conversation.length);
            console.log('  Conversation content:', conversation);

            // Look for our uploaded data in the conversation
            let foundTestData1 = false;
            let foundTestData2 = false;

            for (const message of conversation) {
                try {
                    // Parse message if it's a string
                    let messageData;
                    if (typeof message === 'string') {
                        messageData = JSON.parse(message);
                    } else {
                        messageData = message;
                    }

                    // Check if this message contains our test data
                    if (messageData.test === 'data1' && messageData.name && messageData.name.startsWith('test-agent-')) {
                        foundTestData1 = true;
                        console.log('  ✓ Found testData1 in conversation:', messageData);
                    }
                    if (messageData.test === 'data2') {
                        foundTestData2 = true;
                        console.log('  ✓ Found testData2 in conversation:', messageData);
                    }
                } catch (parseError) {
                    // Skip messages that can't be parsed
                    console.log('  Skipping unparseable message:', message);
                }
            }

            console.log('  Contains testData1:', foundTestData1);
            console.log('  Contains testData2:', foundTestData2);

            if (foundTestData1 || foundTestData2) {
                console.log('✓ At least one uploaded data found in conversation');
            } else {
                console.log('⚠ Uploaded data not found in conversation');
            }
        } else if (conversation) {
            console.log('  Conversation data (non-array):', conversation);
        }
    } catch (getError) {
        console.log('⚠ Get conversation failed (expected if hub is not available):', getError.message);
    }

    // Check storage status
    console.log('  Checking storage status...');
    const status = storage.getStatus();
    console.log('✓ Storage status retrieved');
    console.log('  Queue length:', status.queueLength);
    console.log('  Is processing:', status.isProcessing);

    // Close storage hub
    console.log('  Closing storage hub...');
    storage.close();
    console.log('✓ Storage hub closed successfully');

    const finalStatus = storage.getStatus();
    console.log('  Final queue length:', finalStatus.queueLength);
    console.log('  Final processing status:', finalStatus.isProcessing);

} catch (error) {
    console.log('✗ Storage test failed:', error.message);
}