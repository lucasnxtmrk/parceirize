class CacheManager {
  constructor() {
    this.cache = new Map()
    this.maxSize = 100
    this.ttl = 5 * 60 * 1000 // 5 minutes
  }

  set(key, data, customTTL = null) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }

    const expiry = Date.now() + (customTTL || this.ttl)
    this.cache.set(key, {
      data,
      expiry,
      timestamp: Date.now()
    })

    // Persist to localStorage for important data
    if (typeof window !== 'undefined' && key.includes('user-')) {
      try {
        localStorage.setItem(`cache_${key}`, JSON.stringify({
          data,
          expiry,
          timestamp: Date.now()
        }))
      } catch (e) {
        console.warn('Failed to persist cache to localStorage:', e)
      }
    }
  }

  get(key) {
    let cached = this.cache.get(key)
    
    // Try localStorage if not in memory
    if (!cached && typeof window !== 'undefined' && key.includes('user-')) {
      try {
        const stored = localStorage.getItem(`cache_${key}`)
        if (stored) {
          cached = JSON.parse(stored)
          this.cache.set(key, cached) // Restore to memory
        }
      } catch (e) {
        console.warn('Failed to retrieve cache from localStorage:', e)
      }
    }

    if (!cached) return null

    if (Date.now() > cached.expiry) {
      this.cache.delete(key)
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`cache_${key}`)
      }
      return null
    }

    return cached.data
  }

  has(key) {
    return this.get(key) !== null
  }

  delete(key) {
    this.cache.delete(key)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`cache_${key}`)
    }
  }

  clear() {
    this.cache.clear()
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          localStorage.removeItem(key)
        }
      })
    }
  }

  size() {
    return this.cache.size
  }

  // Cache with automatic refresh
  async getOrFetch(key, fetchFunction, ttl = null) {
    const cached = this.get(key)
    if (cached) {
      return cached
    }

    try {
      const data = await fetchFunction()
      this.set(key, data, ttl)
      return data
    } catch (error) {
      console.error('Cache fetch error:', error)
      throw error
    }
  }

  // Background refresh for frequently used data
  async backgroundRefresh(key, fetchFunction, ttl = null) {
    try {
      const data = await fetchFunction()
      this.set(key, data, ttl)
      return data
    } catch (error) {
      console.warn('Background refresh failed:', error)
      return this.get(key) // Return cached version if refresh fails
    }
  }

  // Get cache statistics
  getStats() {
    const stats = {
      size: this.cache.size,
      entries: []
    }

    for (const [key, value] of this.cache.entries()) {
      stats.entries.push({
        key,
        size: JSON.stringify(value.data).length,
        age: Date.now() - value.timestamp,
        ttl: value.expiry - Date.now()
      })
    }

    return stats
  }
}

// Create singleton instance
const cache = new CacheManager()

// API Response Cache
export const apiCache = {
  get: (url, params = {}) => {
    const key = `api_${url}_${JSON.stringify(params)}`
    return cache.get(key)
  },

  set: (url, params = {}, data, ttl = 5 * 60 * 1000) => {
    const key = `api_${url}_${JSON.stringify(params)}`
    cache.set(key, data, ttl)
  },

  invalidate: (pattern) => {
    const keys = Array.from(cache.cache.keys())
    keys.forEach(key => {
      if (key.includes(pattern)) {
        cache.delete(key)
      }
    })
  }
}

// User Data Cache
export const userCache = {
  get: (userId, dataType) => {
    return cache.get(`user-${userId}-${dataType}`)
  },

  set: (userId, dataType, data, ttl = 10 * 60 * 1000) => {
    cache.set(`user-${userId}-${dataType}`, data, ttl)
  },

  clear: (userId) => {
    const keys = Array.from(cache.cache.keys())
    keys.forEach(key => {
      if (key.startsWith(`user-${userId}-`)) {
        cache.delete(key)
      }
    })
  }
}

// Image Cache for better performance
export const imageCache = {
  preload: (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })
  },

  preloadMultiple: (srcArray) => {
    return Promise.all(srcArray.map(src => imageCache.preload(src)))
  }
}

export default cache