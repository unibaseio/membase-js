import KnowledgeBase from './knowledge.js';
import Document from './document.js';
import axios from 'axios';

class Chroma extends KnowledgeBase {
    constructor(host = 'localhost', port = 8000, collectionName = 'membase') {
        super();
        this.host = host;
        this.port = port;
        this.baseUrl = `http://${host}:${port}`;
        this.collectionName = collectionName;
        this.collection = null;
    }

    async initialize() {
        try {
            // Create or get collection
            const response = await axios.post(`${this.baseUrl}/api/v1/collections`, {
                name: this.collectionName,
                metadata: {}
            });
            this.collection = response.data;
        } catch (error) {
            // Collection might already exist, try to get it
            try {
                const response = await axios.get(`${this.baseUrl}/api/v1/collections/${this.collectionName}`);
                this.collection = response.data;
            } catch (getError) {
                throw new Error(`Failed to initialize Chroma collection: ${getError.message}`);
            }
        }
    }

    addDocuments(documents) {
        if (!Array.isArray(documents)) {
            documents = [documents];
        }

        const ids = documents.map(doc => doc.docId || this.generateId());
        const texts = documents.map(doc => doc.content);
        const metadatas = documents.map(doc => doc.metadata);

        return this.addToCollection(ids, texts, metadatas);
    }

    async addToCollection(ids, documents, metadatas = null) {
        if (!this.collection) {
            await this.initialize();
        }

        try {
            const response = await axios.post(`${this.baseUrl}/api/v1/collections/${this.collectionName}/add`, {
                ids,
                documents,
                metadatas
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to add documents to Chroma: ${error.message}`);
        }
    }

    updateDocuments(documents) {
        if (!Array.isArray(documents)) {
            documents = [documents];
        }

        const ids = documents.map(doc => doc.docId);
        const texts = documents.map(doc => doc.content);
        const metadatas = documents.map(doc => doc.metadata);

        return this.updateInCollection(ids, texts, metadatas);
    }

    async updateInCollection(ids, documents, metadatas = null) {
        if (!this.collection) {
            await this.initialize();
        }

        try {
            const response = await axios.post(`${this.baseUrl}/api/v1/collections/${this.collectionName}/update`, {
                ids,
                documents,
                metadatas
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to update documents in Chroma: ${error.message}`);
        }
    }

    deleteDocuments(documentIds) {
        if (!Array.isArray(documentIds)) {
            documentIds = [documentIds];
        }

        return this.deleteFromCollection(documentIds);
    }

    async deleteFromCollection(ids) {
        if (!this.collection) {
            await this.initialize();
        }

        try {
            const response = await axios.post(`${this.baseUrl}/api/v1/collections/${this.collectionName}/delete`, {
                ids
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to delete documents from Chroma: ${error.message}`);
        }
    }

    async retrieve(query, topK = 3, kwargs = {}) {
        if (!this.collection) {
            await this.initialize();
        }

        try {
            const response = await axios.post(`${this.baseUrl}/api/v1/collections/${this.collectionName}/query`, {
                query_texts: [query],
                n_results: topK,
                ...kwargs
            });

            const results = response.data;
            const documents = [];

            if (results.documents && results.documents[0]) {
                for (let i = 0; i < results.documents[0].length; i++) {
                    const doc = new Document(
                        results.documents[0][i],
                        results.metadatas && results.metadatas[0] ? results.metadatas[0][i] : {},
                        results.ids && results.ids[0] ? results.ids[0][i] : null
                    );
                    documents.push(doc);
                }
            }

            return documents;
        } catch (error) {
            throw new Error(`Failed to retrieve documents from Chroma: ${error.message}`);
        }
    }

    async load(path, kwargs = {}) {
        // Placeholder for loading from file
        throw new Error('Load functionality not implemented yet');
    }

    async save(path, kwargs = {}) {
        // Placeholder for saving to file
        throw new Error('Save functionality not implemented yet');
    }

    async clear() {
        if (!this.collection) {
            await this.initialize();
        }

        try {
            await axios.delete(`${this.baseUrl}/api/v1/collections/${this.collectionName}`);
            this.collection = null;
            await this.initialize();
        } catch (error) {
            throw new Error(`Failed to clear Chroma collection: ${error.message}`);
        }
    }

    async getStats() {
        if (!this.collection) {
            await this.initialize();
        }

        try {
            const response = await axios.get(`${this.baseUrl}/api/v1/collections/${this.collectionName}`);
            return {
                collection_name: this.collectionName,
                document_count: response.data.count || 0,
                metadata: response.data.metadata || {}
            };
        } catch (error) {
            throw new Error(`Failed to get Chroma stats: ${error.message}`);
        }
    }

    generateId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }
}

export default Chroma; 