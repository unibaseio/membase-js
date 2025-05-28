import { ethers } from 'ethers';

class EVM {
    constructor(provider, wallet) {
        this.provider = provider;
        this.wallet = wallet;
    }

    async getBalance(address) {
        return await this.provider.getBalance(address);
    }

    async sendTransaction(to, value, data = '0x') {
        const tx = {
            to,
            value,
            data
        };
        return await this.wallet.sendTransaction(tx);
    }

    async estimateGas(to, value, data = '0x') {
        const tx = {
            to,
            value,
            data
        };
        return await this.provider.estimateGas(tx);
    }

    async getTransactionReceipt(txHash) {
        return await this.provider.getTransactionReceipt(txHash);
    }
}

export default EVM; 