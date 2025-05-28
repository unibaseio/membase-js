import { ethers } from 'ethers';

class ChainUtil {
    static isValidAddress(address) {
        try {
            ethers.getAddress(address);
            return true;
        } catch (error) {
            return false;
        }
    }

    static formatEther(wei) {
        return ethers.formatEther(wei);
    }

    static parseEther(ether) {
        return ethers.parseEther(ether);
    }

    static formatUnits(value, decimals) {
        return ethers.formatUnits(value, decimals);
    }

    static parseUnits(value, decimals) {
        return ethers.parseUnits(value, decimals);
    }

    static keccak256(data) {
        return ethers.keccak256(data);
    }

    static solidityPackedKeccak256(types, values) {
        return ethers.solidityPackedKeccak256(types, values);
    }

    static getContractAddress(transaction) {
        return ethers.getContractAddress(transaction);
    }

    static getCreate2Address(from, salt, initCodeHash) {
        return ethers.getCreate2Address(from, salt, initCodeHash);
    }

    static hexlify(value) {
        return ethers.hexlify(value);
    }

    static toUtf8String(bytes) {
        return ethers.toUtf8String(bytes);
    }

    static toUtf8Bytes(str) {
        return ethers.toUtf8Bytes(str);
    }
}

export default ChainUtil; 