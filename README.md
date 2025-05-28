# Membase JS: Decentralized Memory Layer for AI Agents

**Membase** is a high-performance decentralized AI memory layer designed for persistent conversation storage, scalable knowledge bases, and secure on-chain collaboration tasks — built for the next generation of intelligent agents.

---

## ✨ Features

- **On-Chain Identity Management**  
  Secure cryptographic identity verification and agent registration on blockchain, enabling trustless collaboration, verifiable interactions, and autonomous task coordination in decentralized multi-agent ecosystems.

- **Multi-Memory Management**  
  Manage multiple conversation threads with preload and auto-upload support to Membase Hub.

- **Buffered Single Memory**  
  Store and sync a conversation history with decentralized storage hubs.

- **Knowledge Base Integration**  
  Build, expand, and synchronize agent knowledge using Chroma-based vector storage.

- **Chain Task Coordination**  
  Create, join, and settle on-chain collaborative tasks with decentralized rewards.

- **Secure and Scalable**  
  Designed for millions of conversations and knowledge objects, with blockchain-based verification.

---

## Installation

```bash
npm install membase
```

## Environment Setup

Before using the library, set up the required environment variables:

```bash
# Required for blockchain functionality
export MEMBASE_ACCOUNT="0x1234567890123456789012345678901234567890"
export MEMBASE_SECRET_KEY="0x1234567890123456789012345678901234567890123456789012345678901234"
export MEMBASE_ID="your-unique-membase-id"

# Optional configurations
export MEMBASE_RPC_ENDPOINT="https://bsc-testnet-rpc.publicnode.com"
export MEMBASE_HUB="https://testnet.hub.membase.io"
# TODO: test
export MEMBASE_CHROMA_HOST="localhost"
export MEMBASE_CHROMA_PORT="8000"
```

🌐 **Hub Access**: Visit your conversations at [https://testnet.hub.membase.io/](https://testnet.hub.membase.io/)

## Quick Start

### Memory Management

```javascript
import { Message, BufferedMemory, MultiMemory } from 'membase';

// Create a simple memory instance
const memory = new BufferedMemory('conversation-id', 'owner-address', true);

// Add messages
const message1 = new Message('agent-name', 'Hello, this is a test message', 'user');
const message2 = new Message('agent-name', 'Hello! I received your message.', 'assistant');

memory.add(message1);
memory.add(message2);

console.log('Memory size:', memory.size());
console.log('Recent messages:', memory.get(2));

// Multi-conversation memory
const multiMemory = new MultiMemory('owner-address', true, null, false);
multiMemory.add(new Message('agent', 'First conversation', 'user'), 'conv1');
multiMemory.add(new Message('agent', 'Second conversation', 'user'), 'conv2');

console.log('All conversations:', multiMemory.getAllConversations());
console.log('Conv1 size:', multiMemory.size('conv1'));
```

### Blockchain Integration

```javascript
import { Auth, membaseChain, membaseId } from 'membase';

// Check if chain client is initialized
if (membaseChain) {
    console.log('Wallet address:', membaseChain.walletAddress);
    console.log('Current RPC:', membaseChain.currentRpc);

    // Sign messages
    const message = 'Test message for signing';
    const signature = await membaseChain.signMessage(message);
    
    // Verify signatures
    const isValid = await membaseChain.validSignature(message, signature, membaseChain.walletAddress);
    console.log('Signature valid:', isValid);

    // Register agents
    const agentName = 'test-agent-' + Math.random().toString(36).substring(2, 15);
    await membaseChain.register(agentName);
    console.log('Agent registered:', agentName);

    // Create and manage tasks
    const taskId = 'test-task-' + Math.random().toString(36).substring(2, 15);
    await membaseChain.createTask(taskId, 100);
    await membaseChain.joinTask(taskId, agentName);
    await membaseChain.finishTask(taskId, agentName);

    // Agent authorization
    const newAgent = 'buyer-agent-' + Math.random().toString(36).substring(2, 15);
    await membaseChain.register(newAgent);
    await membaseChain.buy(agentName, newAgent);
    const hasAuth = await membaseChain.hasAuth(agentName, newAgent);
    console.log('Agent has authorization:', hasAuth);
}

// Authentication utilities
const auth = new Auth();
const timestamp = Math.floor(Date.now() / 1000);
const authSignature = await auth.createAuth(timestamp);
```

### Storage Hub

```javascript
import { Storage } from 'membase';

const hubUrl = process.env.MEMBASE_HUB || 'https://testnet.hub.membase.io';
const storage = new Storage(hubUrl);

// Upload data (blocking)
const testData = {
    test: 'data',
    timestamp: Date.now(),
    name: 'test-agent'
};

try {
    const uploadResult = await storage.uploadHub(
        'owner-address', 
        'filename', 
        JSON.stringify(testData), 
        null, 
        true  // wait for completion
    );
    console.log('Upload completed:', uploadResult);
} catch (error) {
    console.log('Upload failed:', error.message);
}

// Upload data (non-blocking with queue)
await storage.uploadHub(
    'owner-address', 
    'filename-2', 
    JSON.stringify(testData), 
    null, 
    false  // queue for later processing
);

// Wait for upload queue to complete
await storage.waitForUploadQueue();

// Download data
try {
    const downloadResult = await storage.downloadHub('owner-address', 'filename');
    if (downloadResult) {
        const downloadedString = downloadResult instanceof ArrayBuffer 
            ? new TextDecoder().decode(downloadResult)
            : downloadResult.toString();
        const downloadedData = JSON.parse(downloadedString);
        console.log('Downloaded data:', downloadedData);
    }
} catch (error) {
    console.log('Download failed:', error.message);
}

// List conversations
const conversations = await storage.listConversations('owner-address');
console.log('Conversations:', conversations);

// Get specific conversation
const conversation = await storage.getConversation('owner-address', 'conversation-id');
console.log('Conversation messages:', conversation);

// Check storage status
const status = storage.getStatus();
console.log('Queue length:', status.queueLength);
console.log('Is processing:', status.isProcessing);

// Close storage when done
storage.close();
```

### Knowledge Base

```javascript
import { Document, Chroma } from 'membase';

// Create documents
const doc1 = new Document('This is a document about artificial intelligence and machine learning.');
doc1.updateMetadata('category', 'AI');
doc1.updateMetadata('tags', ['AI', 'ML', 'test']);

const doc2 = new Document('Another document about blockchain technology and smart contracts.');
doc2.updateMetadata('category', 'Blockchain');
doc2.updateMetadata('tags', ['blockchain', 'smart contracts']);

console.log('Document ID:', doc1.docId);
console.log('Document metadata:', doc1.metadata);

// Serialize and restore documents
const docDict = doc1.toDict();
const restoredDoc = Document.fromDict(docDict);
console.log('Content matches:', doc1.content === restoredDoc.content);

// Initialize Chroma vector database client
const chromaHost = process.env.MEMBASE_CHROMA_HOST || 'localhost';
const chromaPort = process.env.MEMBASE_CHROMA_PORT || 8000;
const chroma = new Chroma(chromaHost, chromaPort, 'my-collection');

console.log('Chroma base URL:', chroma.baseUrl);
console.log('Collection name:', chroma.collectionName);
```

## API Reference

### Memory Classes

#### BufferedMemory
- `new BufferedMemory(conversationId, membaseAccount, autoUploadToHub)`
- `add(message)` - Add a message to memory
- `get(recentN, filterFunc)` - Get messages from memory
- `delete(index)` - Delete messages by index
- `clear()` - Clear all memory
- `size()` - Get memory size

#### MultiMemory
- `new MultiMemory(membaseAccount, autoUploadToHub, defaultConversationId, loadFromHub)`
- `add(message, conversationId)` - Add message to specific conversation
- `getAllConversations()` - Get all conversation IDs
- `size(conversationId)` - Get size of specific conversation

#### Message
- `new Message(name, content, role, timestamp)`
- Properties: `id`, `name`, `content`, `role`, `timestamp`

### Blockchain Classes

#### Chain Client (membaseChain)
- `signMessage(message)` - Sign a message
- `validSignature(message, signature, walletAddress)` - Verify signature
- `register(uuid)` - Register an agent
- `createTask(taskId, price)` - Create a new task
- `joinTask(taskId, uuid)` - Join a task
- `finishTask(taskId, uuid)` - Finish a task
- `buy(uuid, auuid)` - Purchase agent authorization
- `hasAuth(uuid, auuid)` - Check authorization
- `getAgent(uuid)` - Get agent address
- `getTask(taskId)` - Get task details

#### Auth
- `createAuth(timestamp)` - Create authentication signature
- `verifySign(agentId, timestamp, signature)` - Verify signature
- `verifyAuth(taskId, agentId, timestamp, signature)` - Verify authorization

### Storage Classes

#### Storage
- `new Storage(baseUrl)`
- `uploadHub(owner, filename, data, conversationId, wait)` - Upload data
- `downloadHub(owner, filename)` - Download data
- `listConversations(owner)` - List conversations
- `getConversation(owner, conversationId)` - Get conversation
- `waitForUploadQueue()` - Wait for upload queue completion
- `getStatus()` - Get storage status
- `close()` - Close storage client

### Knowledge Classes

#### Document
- `new Document(content, docId, metadata)`
- `updateMetadata(key, value)` - Update metadata
- `toDict()` - Serialize to dictionary
- `Document.fromDict(dict)` - Restore from dictionary

#### Chroma
- `new Chroma(host, port, collectionName)`
- Properties: `host`, `port`, `collectionName`, `baseUrl`

## Running Examples

The library includes comprehensive examples in the `examples/` directory:

```bash
# Test memory functionality
node examples/memory.js

# Test blockchain integration
node examples/chain.js

# Test storage hub
node examples/hub.js

# Test knowledge base
node examples/knowledge.js
```

## Error Handling

The library includes robust error handling for common scenarios:

- **Network connectivity issues**: Automatic retry mechanisms for blockchain and storage operations
- **Invalid signatures**: Proper validation and error messages
- **Missing environment variables**: Graceful degradation with warnings
- **Transaction failures**: Nonce management and gas price optimization

## License

MIT 

---

## 📞 Contact

- Website: [https://www.unibase.com](https://www.unibase.com)
- GitHub Issues: [Membase Issues](https://github.com/unibaseio/membase/issues)
- Email: <support@unibase.com> 