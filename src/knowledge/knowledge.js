import Document from './document.js';

class KnowledgeBase {
    static version = 1;

    /**
     * Add documents to the knowledge base.
     * @param {Document|Array<Document>} documents - Single document or list of documents to add
     */
    addDocuments(documents) {
        throw new Error('Abstract method must be implemented');
    }

    /**
     * Update existing documents in the knowledge base.
     * @param {Document|Array<Document>} documents - Single document or list of documents to update
     */
    updateDocuments(documents) {
        throw new Error('Abstract method must be implemented');
    }

    /**
     * Delete documents from the knowledge base.
     * @param {string|Array<string>} documentIds - Single document ID or list of document IDs to delete
     */
    deleteDocuments(documentIds) {
        throw new Error('Abstract method must be implemented');
    }

    /**
     * Retrieve relevant documents for a query.
     * @param {string} query - The input query
     * @param {number} topK - Number of documents to retrieve
     * @param {Object} kwargs - Additional retrieval parameters
     * @returns {Array<Document>} List of relevant documents
     */
    retrieve(query, topK = 3, kwargs = {}) {
        throw new Error('Abstract method must be implemented');
    }

    /**
     * Load the RAG system from a saved state.
     * @param {string} path - Path to the saved state
     * @param {Object} kwargs - Additional loading parameters
     */
    load(path, kwargs = {}) {
        throw new Error('Abstract method must be implemented');
    }

    /**
     * Save the current state of the RAG system.
     * @param {string} path - Path to save the state
     * @param {Object} kwargs - Additional saving parameters
     */
    save(path, kwargs = {}) {
        throw new Error('Abstract method must be implemented');
    }

    /**
     * Clear all data from the RAG system.
     */
    clear() {
        throw new Error('Abstract method must be implemented');
    }

    /**
     * Get statistics about the RAG system.
     * @returns {Object} Dictionary containing various statistics
     */
    getStats() {
        throw new Error('Abstract method must be implemented');
    }
}

export default KnowledgeBase; 