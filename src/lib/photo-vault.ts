// API-quality source images live in IndexedDB, separate from display thumbnails.
const DATABASE = "glowcheck.photos";
const memory = new Map<string, Blob>();
let epoch = 0;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("photos");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Photo storage is busy."));
  });
}

async function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction("photos", mode);
      const request = action(tx.objectStore("photos"));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = tx.onabort = () => reject(tx.error ?? new Error("Photo storage failed."));
    });
  } finally {
    db.close();
  }
}

export async function savePhoto(id: string, photo: Blob): Promise<boolean> {
  const started = epoch;
  memory.set(id, photo);
  try {
    const record = { bytes: await photo.arrayBuffer(), type: photo.type || "image/jpeg" };
    await transaction("readwrite", (store) => store.put(record, id));
    memory.delete(id);
    if (started !== epoch) {
      await transaction("readwrite", (store) => store.delete(id));
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function readPhoto(id: string): Promise<File | null> {
  const cached = memory.get(id);
  if (cached) return new File([cached], "glowcheck-selfie.jpg", { type: cached.type || "image/jpeg" });
  try {
    const record = await transaction<unknown>("readonly", (store) => store.get(id));
    if (record instanceof Blob) return new File([record], "glowcheck-selfie.jpg", { type: record.type || "image/jpeg" });
    if (record && typeof record === "object" && "bytes" in record && record.bytes instanceof ArrayBuffer && "type" in record && typeof record.type === "string") {
      return new File([record.bytes], "glowcheck-selfie.jpg", { type: record.type });
    }
  } catch { /* A missing source is shown as a recoverable preview error. */ }
  return null;
}

export async function prunePhotos(ids: string[]): Promise<void> {
  const keep = new Set(ids);
  for (const id of memory.keys()) if (!keep.has(id)) memory.delete(id);
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("photos", "readwrite");
      const store = tx.objectStore("photos");
      const cursor = store.openKeyCursor();
      cursor.onsuccess = () => {
        const row = cursor.result;
        if (!row) return;
        if (!keep.has(String(row.key))) store.delete(row.key);
        row.continue();
      };
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}

export function forgetMemoryPhotos() {
  epoch += 1;
  memory.clear();
}

export async function clearPhotos(): Promise<void> {
  forgetMemoryPhotos();
  if (typeof indexedDB !== "undefined") await transaction("readwrite", (store) => store.clear());
}
