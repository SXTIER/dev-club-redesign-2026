const DB_NAME = "muict_devclub_files_db";
const STORE_NAME = "files";
const DB_VERSION = 1;

export interface StoredFileRecord {
  id: string;
  blob: Blob;
  bytes?: Uint8Array;
  filename: string;
  mimeType: string;
}

export interface StoredFileMeta {
  filename: string;
  mimeType: string;
}

export interface RetrievedFileBlob {
  blob: Blob;
  filename: string;
  mimeType: string;
}

function canCloneBlobNatively(blob: Blob): boolean {
  try {
    if (typeof structuredClone !== "function") {
      return false;
    }
    const cloned = structuredClone(blob);
    return cloned instanceof Blob && typeof cloned.size === "number";
  } catch {
    return false;
  }
}

async function readBlobBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === "function") {
    return new Uint8Array(await blob.arrayBuffer());
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result));
      } else {
        reject(new Error("Failed to read Blob bytes."));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("FileReader failed."));
    reader.readAsArrayBuffer(blob);
  });
}

function openFilesDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to open IndexedDB."));
    };
  });
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  executor: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T | null> {
  return openFilesDb().then((db) => {
    if (!db) {
      return null;
    }

    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      const request = executor(store);

      let resultValue: T;
      request.onsuccess = () => {
        resultValue = request.result;
      };

      tx.oncomplete = () => {
        db.close();
        resolve(resultValue);
      };

      tx.onerror = () => {
        db.close();
        reject(tx.error ?? new Error("IndexedDB transaction failed."));
      };

      tx.onabort = () => {
        db.close();
        reject(tx.error ?? new Error("IndexedDB transaction aborted."));
      };
    });
  });
}

export async function putFile(
  id: string,
  blob: Blob,
  meta: StoredFileMeta
): Promise<void> {
  if (typeof indexedDB === "undefined") {
    return;
  }

  const record: StoredFileRecord = {
    id,
    blob,
    filename: meta.filename,
    mimeType: meta.mimeType,
  };

  // jsdom Blobs lose their prototype/size under structuredClone in fake-indexeddb.
  if (!canCloneBlobNatively(blob)) {
    record.bytes = await readBlobBytes(blob);
  }

  await runTransaction("readwrite", (store) => store.put(record));
}

export async function getFileBlob(id: string): Promise<RetrievedFileBlob | null> {
  const record = await runTransaction<StoredFileRecord | undefined>(
    "readonly",
    (store) => store.get(id)
  );
  if (!record) {
    return null;
  }

  const validBlob =
    record.blob instanceof Blob && typeof record.blob.size === "number"
      ? record.blob
      : new Blob([record.bytes ? new Uint8Array(record.bytes) : new Uint8Array(0)], {
          type: record.mimeType,
        });

  return {
    blob: validBlob,
    filename: record.filename,
    mimeType: record.mimeType,
  };
}

export async function deleteFile(id: string): Promise<void> {
  await runTransaction("readwrite", (store) => store.delete(id));
}

export async function clearAllFiles(): Promise<void> {
  await runTransaction("readwrite", (store) => store.clear());
}
