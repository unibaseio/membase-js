import Message from './message.js';

function defaultSerialize(obj) {
    if (obj && typeof obj === 'object' && obj.constructor && obj.constructor.name === 'Message') {
        return obj.toDict();
    }
    return obj;
}

function deserializeHook(key, value) {
    if (value && typeof value === 'object' && value.__module__ && value.__name__) {
        if (value.__module__ === 'membase.memory.message' && value.__name__ === 'Message') {
            return Message.fromDict(value);
        }
    }
    return value;
}

export function serialize(obj) {
    return JSON.stringify(obj, (key, value) => defaultSerialize(value));
}

export function deserialize(str) {
    return JSON.parse(str, deserializeHook);
}

export function isSerializable(obj) {
    try {
        serialize(obj);
        return true;
    } catch (error) {
        return false;
    }
} 