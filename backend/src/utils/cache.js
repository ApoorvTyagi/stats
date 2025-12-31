/**
 * Simple in-memory cache with TTL
 */
class Cache {
    constructor(ttlMs = 5 * 60 * 1000) { // Default 5 minutes
        this.cache = new Map();
        this.ttl = ttlMs;
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    }

    set(key, value) {
        this.cache.set(key, {
            value,
            expiry: Date.now() + this.ttl
        });
    }

    clear() {
        this.cache.clear();
    }

    has(key) {
        return this.get(key) !== null;
    }
}

module.exports = new Cache();
