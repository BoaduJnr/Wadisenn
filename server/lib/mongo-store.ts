import { MongoClient, ServerApiVersion, type Collection, type Db } from "mongodb";
import {
  decodeKey,
  encodeKey,
  prefixRange,
  type Store,
  type StoreEntry,
  type StoreEntryMaybe,
  type StoreKey,
} from "./store.ts";

/**
 * One document per key. `_id` is the NUL-joined key, which gives ordered
 * prefix scans for free off the primary index — so no secondary index is
 * needed, and there is no way for the key and its index to disagree.
 *
 * `key` keeps the original segments because callers read them back (listing
 * months, for instance, pulls the month out of ["expenses", month, id]).
 */
interface KvDoc {
  _id: string;
  key: string[];
  value: unknown;
  updatedAt: Date;
}

const DEFAULT_DB = "wadisenn";
const COLLECTION = "kv";

/** Mongo's duplicate-key error, used to detect a lost insert race. */
const DUPLICATE_KEY = 11000;

export class MongoStore implements Store {
  #client: MongoClient;
  #collection: Collection<KvDoc>;

  private constructor(client: MongoClient, db: Db) {
    this.#client = client;
    this.#collection = db.collection<KvDoc>(COLLECTION);
  }

  /**
   * Connects and verifies the connection up front, so a bad URI or a blocked
   * IP fails at startup with a clear message rather than on the first request.
   */
  static async connect(uri: string, dbName?: string): Promise<MongoStore> {
    const client = new MongoClient(uri, {
      serverApi: { version: ServerApiVersion.v1 },
      serverSelectionTimeoutMS: 15_000,
      retryWrites: true,
    });
    await client.connect();

    // A URI may name a database; fall back to ours when it does not.
    const fromUri = new URL(uri.replace("mongodb+srv://", "https://")).pathname.slice(1);
    const db = client.db(dbName || fromUri || DEFAULT_DB);
    await db.command({ ping: 1 });

    return new MongoStore(client, db);
  }

  async get<T>(key: StoreKey): Promise<StoreEntryMaybe<T>> {
    const doc = await this.#collection.findOne({ _id: encodeKey(key) });
    return { key: [...key], value: doc ? (doc.value as T) : null };
  }

  async set(key: StoreKey, value: unknown): Promise<void> {
    const _id = encodeKey(key);
    // The replacement document must not repeat _id; the filter supplies it,
    // and an upsert derives the id from there.
    await this.#collection.replaceOne(
      { _id },
      { key: [...key], value, updatedAt: new Date() },
      { upsert: true },
    );
  }

  async delete(key: StoreKey): Promise<void> {
    await this.#collection.deleteOne({ _id: encodeKey(key) });
  }

  async *list<T>({ prefix }: { prefix: StoreKey }): AsyncIterable<StoreEntry<T>> {
    const range = prefixRange(prefix);
    const filter = range ? { _id: { $gte: range.gte, $lt: range.lt } } : {};

    // Sorted by _id so callers see keys in the same order they would from any
    // ordered key/value store, which the month listings rely on.
    const cursor = this.#collection.find(filter).sort({ _id: 1 });
    try {
      for await (const doc of cursor) {
        yield { key: doc.key ?? decodeKey(doc._id), value: doc.value as T };
      }
    } finally {
      await cursor.close().catch(() => {});
    }
  }

  async insertIfAbsent(key: StoreKey, value: unknown): Promise<boolean> {
    const _id = encodeKey(key);
    try {
      await this.#collection.insertOne({ _id, key: [...key], value, updatedAt: new Date() });
      return true;
    } catch (err) {
      // The unique _id index is what actually enforces this, so a duplicate
      // here means another writer won the race, not that something is broken.
      if (typeof err === "object" && err !== null && (err as { code?: number }).code === DUPLICATE_KEY) {
        return false;
      }
      throw err;
    }
  }

  async close(): Promise<void> {
    await this.#client.close();
  }
}
