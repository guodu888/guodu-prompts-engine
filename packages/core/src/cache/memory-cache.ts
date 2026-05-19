import type { Cache } from "../types";

export class MemoryCache<T = unknown> implements Cache<T> {
  private readonly storage = new Map<string, T>();

  get(key: string): T | undefined {
    return this.storage.get(key);
  }

  set(key: string, value: T): void {
    this.storage.set(key, value);
  }

  delete(key: string): void {
    this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
  }
}
