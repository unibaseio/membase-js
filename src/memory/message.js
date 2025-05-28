import { v4 as uuidv4 } from 'uuid';
import CryptoJS from 'crypto-js';
import { isSerializable } from './serialize.js';

function getTimestamp(format = null, time = null) {
    const date = time || new Date();
    if (format) {
        // Simple format implementation, can be extended
        return date.toISOString().replace('T', ' ').substring(0, 19);
    }
    return date.toISOString().replace('T', ' ').substring(0, 19);
}

function mapStringToColorMark(targetStr) {
    const colorMarks = [
        ['\x1b[90m', '\x1b[0m'],
        ['\x1b[91m', '\x1b[0m'],
        ['\x1b[92m', '\x1b[0m'],
        ['\x1b[93m', '\x1b[0m'],
        ['\x1b[94m', '\x1b[0m'],
        ['\x1b[95m', '\x1b[0m'],
        ['\x1b[96m', '\x1b[0m'],
        ['\x1b[97m', '\x1b[0m'],
    ];

    const hash = CryptoJS.SHA256(targetStr).toString();
    const hashValue = parseInt(hash.substring(0, 8), 16);
    const index = hashValue % colorMarks.length;
    return colorMarks[index];
}

class Message {
    static serializedAttrs = new Set([
        'id',
        'name',
        'content',
        'role',
        'url',
        'metadata',
        'timestamp',
    ]);

    constructor(name, content, role, url = null, metadata = null, echo = false, ...kwargs) {
        this._id = uuidv4().replace(/-/g, '');
        this._name = name;
        this._content = content;
        this._role = role;
        this._url = url;
        this._metadata = metadata;
        this._timestamp = getTimestamp();

        if (Object.keys(kwargs).length > 0) {
            console.warn(
                `In current version, the message class does not inherit the dict class. ` +
                `The input arguments ${JSON.stringify(kwargs)} are not used.`
            );
        }

        if (echo) {
            console.log(this.toString());
        }
    }

    // Getters
    get id() {
        return this._id;
    }

    get name() {
        return this._name;
    }

    get coloredName() {
        const [m1, m2] = mapStringToColorMark(this.name);
        return `${m1}${this.name}${m2}`;
    }

    get content() {
        return this._content;
    }

    get role() {
        return this._role;
    }

    get url() {
        return this._url;
    }

    get metadata() {
        return this._metadata;
    }

    get timestamp() {
        return this._timestamp;
    }

    // Setters
    set id(value) {
        this._id = value;
    }

    set name(value) {
        this._name = value;
    }

    set content(value) {
        if (!isSerializable(value)) {
            console.warn(
                `The content you input is not JSON serializable and will be ` +
                `converted to string. If you want to use the content for ` +
                `further processing, please make sure it is JSON serializable.`
            );
        }
        this._content = value;
    }

    set role(value) {
        if (!['system', 'user', 'assistant'].includes(value)) {
            console.warn(
                `The role ${value} is not in the list of ['system', 'user', 'assistant']. ` +
                `This may cause unexpected behavior.`
            );
        }
        this._role = value;
    }

    set url(value) {
        this._url = value;
    }

    set metadata(value) {
        this._metadata = value;
    }

    set timestamp(value) {
        this._timestamp = value;
    }

    formattedStr(colored = false) {
        const name = colored ? this.coloredName : this.name;
        const content = typeof this.content === 'string' ? this.content : JSON.stringify(this.content);

        let result = `${name}: ${content}`;

        if (this.url) {
            const urls = Array.isArray(this.url) ? this.url : [this.url];
            result += `\n<url>${urls.join('</url>\n<url>')}</url>`;
        }

        return result;
    }

    toString() {
        return this.formattedStr();
    }

    equals(other) {
        if (!(other instanceof Message)) {
            return false;
        }

        return (
            this.id === other.id &&
            this.name === other.name &&
            JSON.stringify(this.content) === JSON.stringify(other.content) &&
            this.role === other.role &&
            JSON.stringify(this.url) === JSON.stringify(other.url) &&
            JSON.stringify(this.metadata) === JSON.stringify(other.metadata) &&
            this.timestamp === other.timestamp
        );
    }

    toDict() {
        function serializeWithCycleDetection(obj, visited = new WeakSet()) {
            if (obj === null || typeof obj !== 'object') {
                return obj;
            }

            if (visited.has(obj)) {
                return '[Circular Reference]';
            }

            visited.add(obj);

            if (Array.isArray(obj)) {
                return obj.map(item => serializeWithCycleDetection(item, visited));
            }

            const result = {};
            for (const [key, value] of Object.entries(obj)) {
                result[key] = serializeWithCycleDetection(value, visited);
            }

            visited.delete(obj);
            return result;
        }

        const result = {};
        for (const attr of Message.serializedAttrs) {
            if (this.hasOwnProperty(`_${attr}`)) {
                result[attr] = serializeWithCycleDetection(this[`_${attr}`]);
            }
        }
        return result;
    }

    static fromDict(serializedDict) {
        const message = Object.create(Message.prototype);

        for (const attr of Message.serializedAttrs) {
            if (serializedDict.hasOwnProperty(attr)) {
                message[`_${attr}`] = serializedDict[attr];
            }
        }

        return message;
    }
}

export default Message; 