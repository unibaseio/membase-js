import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

class Client {
    constructor(
        walletAddress,
        privateKey,
        ep = "https://bsc-testnet-rpc.publicnode.com",
        membaseContract = "0x100E3F8c5285df46A8B9edF6b38B8f90F1C32B7b"
    ) {
        // Initialize connection
        this.currentRpc = ep;
        this.provider = new ethers.JsonRpcProvider(ep);

        this.walletAddress = ethers.getAddress(walletAddress);
        // Ensure private key has 0x prefix for consistency
        this.privateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
        this.wallet = new ethers.Wallet(this.privateKey, this.provider);

        // Initialize nonce tracking
        this._nonce = null;

        // Load contract ABI
        this.membaseContract = membaseContract;
        this.loadContract();
    }

    loadContract() {
        // You'll need to include the contract ABI
        // For now, using a placeholder - replace with actual ABI
        const contractAbi = [
            "function getAgent(string memory _uuid) public view returns (address)",
            "function register(string memory _uuid) public",
            "function createTask(string memory _taskid, uint256 _price) public",
            "function joinTask(string memory _taskid, string memory _uuid) public",
            "function finishTask(string memory _taskid, string memory _uuid) public",
            "function getTask(string memory _taskid) public view returns (bool, address, uint256, uint256, string memory)",
            "function getPermission(string memory _taskid, string memory _uuid) public view returns (bool)"
        ];

        this.membase = new ethers.Contract(this.membaseContract, contractAbi, this.wallet);
    }

    async getNonce() {
        const networkNonce = await this.provider.getTransactionCount(this.walletAddress, 'pending');

        // Initialize local nonce if not set
        if (this._nonce === null) {
            this._nonce = networkNonce;
        }

        // Reset local nonce if it's out of sync
        if (this._nonce > networkNonce + 1 || this._nonce < networkNonce) {
            this._nonce = networkNonce;
        }

        return Math.max(this._nonce, networkNonce);
    }

    async getGasPrice() {
        const feeData = await this.provider.getFeeData();

        // For BSC, use gasPrice; for other networks, might use maxFeePerGas
        if (feeData.gasPrice) {
            // Add 20% buffer to avoid underpriced transactions
            return feeData.gasPrice * 120n / 100n;
        }

        // Fallback to a reasonable gas price (5 gwei)
        return ethers.parseUnits('5', 'gwei');
    }

    async sendContractTransaction(contractFunction, overrides = {}) {
        try {
            const nonce = await this.getNonce();
            const gasPrice = await this.getGasPrice();

            const txOptions = {
                nonce: nonce,
                gasPrice: gasPrice,
                gasLimit: overrides.gasLimit || 300000,
                ...overrides
            };

            const response = await contractFunction(txOptions);

            // Update local nonce after successful send
            this._nonce = nonce + 1;

            return response;
        } catch (error) {
            // If nonce error, reset and retry once
            if (error.message.includes('nonce') || error.message.includes('replacement')) {
                console.warn('Nonce error detected, resetting and retrying...');
                this._nonce = null;

                const nonce = await this.getNonce();
                const gasPrice = await this.getGasPrice();

                const txOptions = {
                    nonce: nonce,
                    gasPrice: gasPrice,
                    gasLimit: overrides.gasLimit || 300000,
                    ...overrides
                };

                const response = await contractFunction(txOptions);
                this._nonce = nonce + 1;

                return response;
            }
            throw error;
        }
    }

    async signMessage(message) {
        return await this.wallet.signMessage(message);
    }

    async validSignature(message, signature, walletAddress) {
        try {
            const recoveredAddress = ethers.verifyMessage(message, signature);
            return walletAddress.toLowerCase() === recoveredAddress.toLowerCase();
        } catch (error) {
            return false;
        }
    }

    async register(uuid) {
        const addr = await this.membase.getAgent(uuid);
        if (addr === this.walletAddress) {
            return;
        }

        if (addr !== ethers.ZeroAddress) {
            throw new Error(`already register: ${uuid} by ${addr}`);
        }

        return await this.sendContractTransaction((txOptions) => this.membase.register(uuid, txOptions));
    }

    async createTask(taskid, price) {
        const [fin, owner, taskPrice, value, winner] = await this.membase.getTask(taskid);
        console.log("task:", fin, owner, taskPrice, value, winner);

        if (owner === this.walletAddress) {
            return;
        }

        if (owner !== ethers.ZeroAddress) {
            throw new Error(`already register: ${taskid} by ${owner}`);
        }

        return await this.sendContractTransaction((txOptions) => this.membase.createTask(taskid, price, txOptions));
    }

    async joinTask(taskid, uuid) {
        if (await this.membase.getPermission(taskid, uuid)) {
            console.log(`already join task: ${taskid}`);
            return;
        }

        return await this.sendContractTransaction((txOptions) => this.membase.joinTask(taskid, uuid, txOptions));
    }

    async finishTask(taskid, uuid) {
        return await this.sendContractTransaction((txOptions) => this.membase.finishTask(taskid, uuid, txOptions));
    }

    async getTask(taskid) {
        return await this.membase.getTask(taskid);
    }

    async buy(uuid, auuid) {
        return await this.sendContractTransaction((txOptions) => this.membase.joinTask(uuid, auuid, txOptions));
    }

    async getAgent(uuid) {
        return await this.membase.getAgent(uuid);
    }

    async hasAuth(uuid, auuid) {
        try {
            return await this.membase.getPermission(uuid, auuid);
        } catch (error) {
            console.error(`Error checking auth: ${error.message}`);
            return false;
        }
    }
}

// Create default instances only if environment variables are available
let membaseChain = null;
let membaseId = "";

try {
    // Use consistent environment variable names
    const walletAddress = process.env.MEMBASE_ACCOUNT;
    const privateKey = process.env.MEMBASE_SECRET_KEY;

    if (walletAddress && privateKey) {
        membaseChain = new Client(
            walletAddress,
            privateKey,
            process.env.MEMBASE_RPC_ENDPOINT || "https://bsc-testnet-rpc.publicnode.com",
            process.env.MEMBASE_CONTRACT || "0x100E3F8c5285df46A8B9edF6b38B8f90F1C32B7b"
        );
        membaseId = process.env.MEMBASE_ID || "";
    } else {
        console.warn("Chain client not initialized: MEMBASE_ACCOUNT and MEMBASE_SECRET_KEY environment variables not set");
    }
} catch (error) {
    console.warn(`Chain client initialization failed: ${error.message}`);
}

export { membaseChain, membaseId };
export default Client; 