class Client {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.uploadQueue = [];
        this.isProcessing = false;
        this.membaseId = process.env.MEMBASE_ID || '';

        // Configure fetch defaults for better HTTPS handling
        this.fetchConfig = {
            timeout: 30000,
            headers: {
                'User-Agent': 'membase-js/1.0.0',
                'Accept': 'application/json'
            }
        };

        // Configure HTTPS agent for Node.js fetch
        if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
            // In development, be more lenient with SSL certificates
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        }
    }

    /**
     * Enhanced fetch wrapper with timeout and error handling
     * @param {string} url - The URL to fetch
     * @param {Object} options - Fetch options
     * @returns {Promise<Response>} - Fetch response
     */
    async fetchWithTimeout(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.fetchConfig.timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers: {
                    ...this.fetchConfig.headers,
                    ...options.headers
                }
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
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

                // Don't retry on certain error types (4xx client errors)
                if (error.message.includes('400') || error.message.includes('401') ||
                    error.message.includes('403') || error.message.includes('404')) {
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

                const response = await this.fetchWithTimeout(`${this.baseUrl}/api/upload`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(memeStruct)
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const res = await response.json();
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

            const response = await this.fetchWithTimeout(`${this.baseUrl}/api/uploadData`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const res = await response.json();
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

                const response = await this.fetchWithTimeout(`${this.baseUrl}/api/conversation`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: formData
                });

                if (!response.ok) {
                    return null;
                }

                return await response.json();
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

                const response = await this.fetchWithTimeout(`${this.baseUrl}/api/conversation`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: formData
                });

                if (!response.ok) {
                    return null;
                }

                return await response.json();
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

            const response = await this.fetchWithTimeout(`${this.baseUrl}/api/download`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.arrayBuffer();
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
            isProcessing: this.isProcessing,
            fetchConfig: this.fetchConfig,
            environment: process.env.NODE_ENV || 'development'
        };
    }
}

// Create a default client instance
export const hubClient = new Client(process.env.MEMBASE_HUB || 'https://testnet.hub.membase.io');

export default Client; 