import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import MemoryBase from './memory.js';
import Message from './message.js';
import { serialize, deserialize } from './serialize.js';
import { hubClient } from '../storage/hub.js';

class BufferedMemory extends MemoryBase {
    constructor(conversationId = null, membaseAccount = "default", autoUploadToHub = false) {
        super();

        this._messages = [];
        this._messageMap = {};

        // conversation_id is none or empty, generate a new uuid
        if (!conversationId) {
            this._conversationId = uuidv4();
        } else {
            this._conversationId = conversationId;
        }

        this._membaseAccount = membaseAccount;
        this._autoUploadToHub = autoUploadToHub;
    }

    add(memories) {
        this.addWithUpload(memories, true);
    }

    addWithUpload(memories, uploadToHub = true) {
        if (memories === null || memories === undefined) {
            return;
        }

        let recordMemories;
        if (!Array.isArray(memories)) {
            recordMemories = [memories];
        } else {
            recordMemories = memories;
        }

        // Assert the message types and check for duplicates using dict
        for (const memoryUnit of recordMemories) {
            if (!(memoryUnit instanceof Message)) {
                throw new Error(
                    `Cannot add ${typeof memoryUnit} to memory, must be a Message object.`
                );
            }

            // Skip if message already exists
            if (memoryUnit.id && this._messageMap.hasOwnProperty(memoryUnit.id)) {
                console.warn("duplicate memory_unit:", memoryUnit.id);
                continue;
            }

            // Add metadata
            if (typeof memoryUnit.metadata === 'object' && memoryUnit.metadata !== null) {
                memoryUnit.metadata.conversation = this._conversationId;
            } else if (typeof memoryUnit.metadata === 'string') {
                memoryUnit.metadata = {
                    metadata: memoryUnit.metadata,
                    conversation: this._conversationId
                };
            } else {
                memoryUnit.metadata = { conversation: this._conversationId };
            }

            // Add to memory and update map
            this._messages.push(memoryUnit);
            this._messageMap[memoryUnit.id] = this._messages.length - 1;

            // Upload to hub if needed
            if (this._autoUploadToHub && uploadToHub) {
                const msg = serialize(memoryUnit);
                const memoryId = this._conversationId + "_" + (this._messages.length - 1);
                console.debug(`Upload memory: ${this._membaseAccount} ${memoryId}`);
                hubClient.uploadHub(this._membaseAccount, memoryId, msg);
            }
        }
    }

    delete(index) {
        if (this.size() === 0) {
            console.warn("The memory is empty, and the delete operation is skipping.");
            return;
        }

        let indexSet;
        if (typeof index === 'number') {
            indexSet = new Set([index]);
        } else if (Array.isArray(index)) {
            indexSet = new Set(index);
        } else {
            throw new Error("index type only supports {number, Array}");
        }

        const invalidIndex = Array.from(indexSet).filter(i => i >= this.size() || i < 0);
        if (invalidIndex.length > 0) {
            console.warn(`Skip delete operation for the invalid index ${invalidIndex}`);
        }

        // Update message map before deleting messages
        const newMessages = [];
        const newMessageMap = {};

        for (let i = 0; i < this._messages.length; i++) {
            if (!indexSet.has(i)) {
                const msg = this._messages[i];
                newMessages.push(msg);
                if (msg.id) {
                    newMessageMap[msg.id] = newMessages.length - 1;
                }
            }
        }

        this._messages = newMessages;
        this._messageMap = newMessageMap;
    }

    get(recentN = null, filterFunc = null) {
        // extract the recent `recentN` entries in memories
        let memories;
        if (recentN === null) {
            memories = this._messages;
        } else {
            if (recentN > this.size()) {
                recentN = this.size();
            }
            memories = this._messages.slice(-recentN);
        }

        // filter the memories
        if (filterFunc !== null) {
            memories = memories.filter((memory, index) => filterFunc(index, memory));
        }

        return memories;
    }

    async export(filePath = null, toMem = false) {
        if (toMem) {
            return this._messages;
        }

        if (!toMem && filePath !== null) {
            const serializedMessages = this._messages.map(msg => serialize(msg));
            const jsonData = JSON.stringify(serializedMessages, null, 2);

            try {
                await fs.writeFile(filePath, jsonData, 'utf8');
                console.log(`Memory exported to ${filePath}`);
            } catch (error) {
                console.error(`Error exporting memory to file: ${error.message}`);
                throw error;
            }
        } else if (!toMem && filePath === null) {
            throw new Error("file_path cannot be None when to_mem is False");
        }

        return null;
    }

    async load(memories, overwrite = false) {
        if (overwrite) {
            this.clear();
        }

        if (typeof memories === 'string') {
            // Try to load from file first
            try {
                const fileContent = await fs.readFile(memories, 'utf8');
                const serializedMessages = JSON.parse(fileContent);
                const messageObjects = serializedMessages.map(data => deserialize(data));
                this.addWithUpload(messageObjects, false);
                return;
            } catch (error) {
                // If file reading fails, try to parse as JSON string
                try {
                    const serializedMessages = JSON.parse(memories);
                    const messageObjects = serializedMessages.map(data => deserialize(data));
                    this.addWithUpload(messageObjects, false);
                    return;
                } catch (parseError) {
                    throw new Error(`Failed to load memories: ${parseError.message}`);
                }
            }
        } else if (memories instanceof Message) {
            this.addWithUpload([memories], false);
        } else if (Array.isArray(memories)) {
            this.addWithUpload(memories, false);
        } else {
            throw new Error("Unsupported memories type for loading");
        }
    }

    clear() {
        this._messages = [];
        this._messageMap = {};
    }

    size() {
        return this._messages.length;
    }

    get conversationId() {
        return this._conversationId;
    }

    get membaseAccount() {
        return this._membaseAccount;
    }
}

export default BufferedMemory; 