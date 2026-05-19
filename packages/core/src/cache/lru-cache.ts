import type { Cache } from "../types";

export interface LRUCacheOptions {
  maxSize: number;
}

export class LRUCache<T = unknown> implements Cache<T> {
  private readonly maxSize: number;
  private readonly storage = new Map<string, T>();

  constructor(options: LRUCacheOptions) {
    if (!Number.isInteger(options.maxSize) || options.maxSize <= 0) {
      throw new Error("LRUCache maxSize must be a positive integer.");
    }

    this.maxSize = options.maxSize;
  }

  get(key: string): T | undefined {
    const value = this.storage.get(key);
    if (value === undefined) {
      return undefined;
    }

    this.storage.delete(key);
    this.storage.set(key, value);
    return value;
  }

  set(key: string, value: T): void {
    if (this.storage.has(key)) {
      this.storage.delete(key);
    }

    this.storage.set(key, value);

    if (this.storage.size > this.maxSize) {
      const firstKey = this.storage.keys().next().value;
      if (firstKey !== undefined) {
        this.storage.delete(firstKey);
      }
    }
  }

  delete(key: string): void {
    this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
  }
}
