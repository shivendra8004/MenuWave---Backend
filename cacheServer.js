const NodeCache = require("node-cache");

class CacheService {
    constructor(ttlSeconds) {
        this.cache = new NodeCache({
            stdTTL: ttlSeconds,
            checkperiod: ttlSeconds * 0.2,
            useClones: false,
        });

        this.MAX_CACHE_SIZE = 100; // Adjust based on your needs
        this.CLEAN_INTERVAL = 60000; // Clean every minute

        // Start the cleaning interval
        this.startCleaning();
    }

    get(key) {
        return this.cache.get(key);
    }

    set(key, value) {
        return this.cache.set(key, value);
    }

    del(key) {
        this.cache.del(key);
    }

    flush() {
        this.cache.flushAll();
    }

    startCleaning() {
        setInterval(() => {
            this.cleanCache();
        }, this.CLEAN_INTERVAL);
    }

    cleanCache() {
        const keys = this.cache.keys();
        if (keys.length > this.MAX_CACHE_SIZE) {
            const keysToRemove = keys.slice(0, keys.length - this.MAX_CACHE_SIZE);
            keysToRemove.forEach((key) => this.cache.del(key));
            console.log(`Cleaned ${keysToRemove.length} items from cache`);
        }
    }
}

module.exports = CacheService;
