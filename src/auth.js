import { membaseChain, membaseId } from './chain/chain.js';

class Auth {
    constructor() {
        this.logger = console;
    }

    async buyAuthOnchain(memoryId) {
        try {
            if (!(await membaseChain.hasAuth(memoryId, membaseId))) {
                this.logger.info(`add agent: ${membaseId} to hub memory: ${memoryId}`);
                await membaseChain.buy(memoryId, membaseId);
            }
        } catch (error) {
            this.logger.warn(`buy auth fail: ${error.message}`);
            throw error;
        }
    }

    async createAuth(timestamp) {
        try {
            timestamp = parseInt(timestamp);
        } catch (error) {
            throw new Error("Invalid timestamp in create");
        }
        const verifyMessage = `${timestamp}`;
        return await membaseChain.signMessage(verifyMessage);
    }

    async verifySign(agentId, timestamp, signature) {
        this.logger.debug(`sign time: ${timestamp}, agent: ${agentId}, sign: ${signature}`);

        if (!signature || !timestamp || !agentId) {
            throw new Error("Unauthorized");
        }

        try {
            timestamp = parseInt(timestamp);
        } catch (error) {
            throw new Error("Invalid timestamp");
        }

        const currentTime = Math.floor(Date.now() / 1000);
        if (currentTime - timestamp > 300) {
            this.logger.warn(`${agentId} has expired token`);
            throw new Error("Token expired");
        }

        const agentAddress = await membaseChain.getAgent(agentId);
        const verifyMessage = `${timestamp}`;
        if (!(await membaseChain.validSignature(verifyMessage, signature, agentAddress))) {
            this.logger.warn(`${agentId} has invalid signature`);
            throw new Error("Invalid signature");
        }
    }

    async verifyAuth(taskId, agentId, timestamp, signature) {
        if (!(await membaseChain.hasAuth(taskId, agentId))) {
            this.logger.warn(`${agentId} is not auth on chain`);
            throw new Error("No auth on chain");
        }

        await this.verifySign(agentId, timestamp, signature);
    }
}

export default Auth; 