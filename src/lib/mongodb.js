
import { MongoClient } from "mongodb";

const options = {};
let globalClientPromise;

export const DB_NAME = process.env.MONGODB_DB_NAME || "library_management";
export const USER_COLLECTION = process.env.MONGODB_USER_COLLECTION || "user";
export const BOOK_COLLECTION = process.env.MONGODB_BOOK_COLLECTION || "book";
export const BORROW_COLLECTION = process.env.MONGODB_BORROW_COLLECTION || "borrow";

export function getClientPromise() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Please add your Mongo URI to .env.local or set MONGODB_URI env variable");
  }
  if (process.env.NODE_ENV === "development") {
    if (!globalClientPromise) {
      const client = new MongoClient(uri, options);
      globalClientPromise = client.connect();
    }
    return globalClientPromise;
  } else {
    const client = new MongoClient(uri, options);
    return client.connect();
  }
}
