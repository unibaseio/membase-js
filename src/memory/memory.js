import Message from './message.js';

class MemoryBase {
    static version = 1;

    /**
     * Return a certain range (recent_n or all) of memory,
     * filtered by filter_func
     * @param {number} recentN - indicate the most recent N memory pieces to be returned
     * @param {function} filterFunc - filter function to decide which pieces of memory should be returned
     * @returns {Array} filtered memory array
     */
    get(recentN = null, filterFunc = null) {
        throw new Error('Abstract method must be implemented');
    }

    /**
     * Adding new memory fragment, depending on how the memory are stored
     * @param {Message|Array<Message>|null} memories - Memories to be added
     */
    add(memories) {
        throw new Error('Abstract method must be implemented');
    }

    /**
     * Delete memory fragment, depending on how the memory are stored and matched
     * @param {number|Array<number>} index - indices of the memory fragments to delete
     */
    delete(index) {
        throw new Error('Abstract method must be implemented');
    }

    /**
     * Load memory, depending on how the memory are passed, design to load from both file or dict
     * @param {string|Array<Message>|Message} memories - memories to be loaded
     * @param {boolean} overwrite - if true, clear the current memory before loading the new ones
     */
    load(memories, overwrite = false) {
        throw new Error('Abstract method must be implemented');
    }

    /**
     * Export memory, depending on how the memory are stored
     * @param {string} filePath - file path to save the memory to
     * @param {boolean} toMem - if true, just return the list of messages in memory
     * @returns {Array|null} memory array if toMem is true
     */
    export(filePath = null, toMem = false) {
        throw new Error('Abstract method must be implemented');
    }

    /**
     * Clean memory, depending on how the memory are stored
     */
    clear() {
        throw new Error('Abstract method must be implemented');
    }

    /**
     * Returns the number of memory segments in memory
     * @returns {number} size of memory
     */
    size() {
        throw new Error('Abstract method must be implemented');
    }
}

export default MemoryBase; 