class Document {
    constructor(content, metadata = {}, docId = null, createdAt = null, updatedAt = null) {
        this.content = content;
        this.metadata = metadata;
        this.docId = docId;
        this.createdAt = createdAt || new Date();
        this.updatedAt = updatedAt || new Date();
    }

    updateMetadata(key, value) {
        this.metadata[key] = value;
        this.updatedAt = new Date();
    }

    toDict() {
        return {
            content: this.content,
            metadata: this.metadata,
            docId: this.docId,
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString()
        };
    }

    static fromDict(data) {
        return new Document(
            data.content,
            data.metadata || {},
            data.docId,
            data.createdAt ? new Date(data.createdAt) : null,
            data.updatedAt ? new Date(data.updatedAt) : null
        );
    }
}

export default Document; 