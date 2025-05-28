import axios from 'axios';

class Client {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.uploadQueue = [];
        this.isProcessing = false;
        this.membaseId = process.env.MEMBASE_ID || '';

        // Configure axios defaults to reduce intermittent issues
        this.axiosConfig = {
            timeout: 30000,
            maxRedirects: 5,
            validateStatus: function (status) {
                return status < 500;
            },
            // Disable keep-alive to avoid connection reuse issues
            headers: {
                'Connection': 'close'
            }
        };
    }

    /**
     * Retry wrapper for API calls
     * @param {Function} apiCall - The API call function to retry
     * @param {string} operationName - Name of the operation for logging
     * @param {number} maxRetries - Maximum number of retries (default: 3)
     * @param {number} baseDelay - Base delay between retries in ms (default: 1000)
     * @returns {Promise} - Result of the API call
     */
    async retryApiCall(apiCall, operationName, maxRetries = 3, baseDelay = 1000) {
        let lastError = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await apiCall();

                if (result !== null) {
                    return result;
                }

                // If result is null, treat as failure
                lastError = new Error(`${operationName} returned null`);

            } catch (error) {
                lastError = error;

                // Don't retry on certain error types
                if (error.response && error.response.status >= 400 && error.response.status < 500) {
                    break;
                }
            }

            // Add exponential backoff delay before next attempt
            if (attempt < maxRetries) {
                const delay = baseDelay * Math.pow(2, attempt - 1);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        console.error(`${operationName} failed after ${maxRetries} attempts`);
        throw lastError || new Error(`${operationName} failed after ${maxRetries} attempts`);
    }

    async processUploadQueue() {
        if (this.isProcessing || this.uploadQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

        while (this.uploadQueue.length > 0) {
            const uploadTask = this.uploadQueue.shift();
            if (!uploadTask) break;

            const { owner, bucket, filename, msg, resolve, reject } = uploadTask;

            try {
                const memeStruct = {
                    Owner: owner,
                    Bucket: bucket,
                    ID: filename,
                    Message: msg
                };

                const response = await axios.post(`${this.baseUrl}/api/upload`, memeStruct, {
                    headers: { 'Content-Type': 'application/json' }
                });

                const res = response.data;
                resolve(res);
            } catch (error) {
                console.error(`Error during upload: ${error.message}`);
                reject(error);
            }

            // Small delay between uploads
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.isProcessing = false;
    }

    initialize(baseUrl) {
        if (!this.baseUrl) {
            this.baseUrl = baseUrl;
        }
    }

    async uploadHub(owner, filename, msg, bucket = null, wait = true) {
        try {
            let defaultBucket = owner;
            if (this.membaseId !== "") {
                defaultBucket = this.membaseId;
            }

            if (bucket === null) {
                if (typeof msg === 'string') {
                    try {
                        const msgDict = JSON.parse(msg);
                        bucket = msgDict.name || defaultBucket;
                    } catch (error) {
                        bucket = defaultBucket;
                    }
                } else {
                    bucket = defaultBucket;
                }
            }

            if (wait) {
                return new Promise((resolve, reject) => {
                    this.uploadQueue.push({ owner, bucket, filename, msg, resolve, reject });
                    this.processUploadQueue();
                });
            } else {
                this.uploadQueue.push({
                    owner,
                    bucket,
                    filename,
                    msg,
                    resolve: () => { },
                    reject: () => { }
                });
                this.processUploadQueue();
                return { status: "queued", message: "Upload task has been queued" };
            }
        } catch (error) {
            console.error(`Error queueing upload task: ${error.message}`);
            return null;
        }
    }

    async uploadHubData(owner, filename, data) {
        try {
            const formData = new FormData();
            const blob = new Blob([data], { type: 'application/octet-stream' });
            formData.append('file', blob, filename);
            formData.append('owner', owner);

            const response = await axios.post(`${this.baseUrl}/api/uploadData`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const res = response.data;
            return res;
        } catch (error) {
            console.error(`Error during upload: ${error.message}`);
            return null;
        }
    }

    async listConversations(owner, maxRetries = 3) {
        return this.retryApiCall(
            async () => {
                const formData = new URLSearchParams();
                formData.append('owner', owner);

                const response = await axios.post(`${this.baseUrl}/api/conversation`, formData, {
                    ...this.axiosConfig,
                    headers: {
                        ...this.axiosConfig.headers,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });

                if (response.status >= 400) {
                    return null;
                }

                return response.data;
            },
            `listConversations(${owner})`,
            maxRetries
        ).catch(error => {
            console.error(`Error during list conversations: ${error.message}`);
            return null;
        });
    }

    async getConversation(owner, conversationId, maxRetries = 3) {
        return this.retryApiCall(
            async () => {
                const formData = new URLSearchParams();
                formData.append('owner', owner);
                formData.append('id', conversationId);

                const response = await axios.post(`${this.baseUrl}/api/conversation`, formData, {
                    ...this.axiosConfig,
                    headers: {
                        ...this.axiosConfig.headers,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });

                if (response.status >= 400) {
                    return null;
                }

                return response.data;
            },
            `getConversation(${owner}, ${conversationId})`,
            maxRetries
        ).catch(error => {
            console.error(`Error during get conversation: ${error.message}`);
            return null;
        });
    }

    async downloadHub(owner, filename) {
        try {
            const formData = new URLSearchParams();
            formData.append('id', filename);
            formData.append('owner', owner);

            const response = await axios.post(`${this.baseUrl}/api/download`, formData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                responseType: 'arraybuffer'
            });

            return response.data;
        } catch (error) {
            console.error(`Error during download: ${error.message}`);
            return null;
        }
    }

    async waitForUploadQueue() {
        while (this.uploadQueue.length > 0 || this.isProcessing) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    /**
     * Close the storage client and clean up resources
     */
    close() {
        // Clear the upload queue
        this.uploadQueue = [];
        this.isProcessing = false;
    }

    /**
     * Get current status of the storage client
     */
    getStatus() {
        return {
            baseUrl: this.baseUrl,
            membaseId: this.membaseId,
            queueLength: this.uploadQueue.length,
            isProcessing: this.isProcessing
        };
    }
}

// Create a default client instance
export const hubClient = new Client(process.env.MEMBASE_HUB || 'https://testnet.hub.membase.io');

export default Client; 