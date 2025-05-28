import { v4 as uuidv4 } from 'uuid';
import BufferedMemory from './bufferedMemory.js';
import Message from './message.js';
import { hubClient } from '../storage/hub.js';

class MultiMemory {
    constructor(
        membaseAccount = "default",
        autoUploadToHub = false,
        defaultConversationId = null,
        preloadFromHub = false
    ) {
        this._memories = new Map();
        this._membaseAccount = membaseAccount;
        this._autoUploadToHub = autoUploadToHub;
        this._defaultConversationId = defaultConversationId || uuidv4();
        this._preloadConversations = new Map();

        if (preloadFromHub) {
            this.loadAllFromHub();
        }
    }

    updateConversationId(conversationId = null) {
        this._defaultConversationId = conversationId || uuidv4();
    }

    getMemory(conversationId = null) {
        if (!conversationId) {
            conversationId = this._defaultConversationId;
        }

        if (!this._memories.has(conversationId)) {
            this._memories.set(conversationId, new BufferedMemory(
                conversationId,
                this._membaseAccount,
                this._autoUploadToHub
            ));
        }

        return this._memories.get(conversationId);
    }

    add(memories, conversationId = null) {
        const memory = this.getMemory(conversationId);
        memory.add(memories);
    }

    get(conversationId = null, recentN = null, filterFunc = null) {
        const memory = this.getMemory(conversationId);
        return memory.get(recentN, filterFunc);
    }

    delete(conversationId = null, index = null) {
        if (conversationId === null) {
            conversationId = this._defaultConversationId;
        }

        if (this._memories.has(conversationId)) {
            this._memories.get(conversationId).delete(index);
        }
    }

    clear(conversationId = null) {
        if (conversationId === null) {
            this._memories.clear();
            this._defaultConversationId = uuidv4();
        } else if (this._memories.has(conversationId)) {
            this._memories.get(conversationId).clear();
        }
    }

    getAllConversations() {
        return Array.from(this._memories.keys());
    }

    size(conversationId = null) {
        if (conversationId === null) {
            let totalSize = 0;
            for (const memory of this._memories.values()) {
                totalSize += memory.size();
            }
            return totalSize;
        } else if (this._memories.has(conversationId)) {
            return this._memories.get(conversationId).size();
        }
        return 0;
    }

    get defaultConversationId() {
        return this._defaultConversationId;
    }

    async loadFromHub(conversationId) {
        // Check if the conversation has been preloaded
        if (this.isPreloaded(conversationId)) {
            return;
        }

        // Record the preloaded conversation
        this._preloadConversations.set(conversationId, true);

        const memory = this.getMemory(conversationId);
        const msgstrings = await hubClient.getConversation(this._membaseAccount, conversationId);

        if (msgstrings === null) {
            return;
        }

        for (const msgstring of msgstrings) {
            try {
                console.debug("got msg:", msgstring);
                const jsonMsg = JSON.parse(msgstring);

                // Check if jsonMsg is a Message dict
                if (typeof jsonMsg === 'object' && jsonMsg.id && jsonMsg.name) {
                    const msg = Message.fromDict(jsonMsg);
                    memory.addWithUpload(msg, false);
                } else {
                    console.debug("invalid message format:", jsonMsg);
                }
            } catch (error) {
                console.error(`Error loading message: ${error.message}`);
            }
        }
    }

    async loadAllFromHub() {
        const conversations = await hubClient.listConversations(this._membaseAccount);

        if (conversations === null) {
            return;
        }

        for (const conversationId of conversations) {
            await this.loadFromHub(conversationId);
        }
    }

    isPreloaded(conversationId) {
        return this._preloadConversations.has(conversationId);
    }
}

export default MultiMemory; 