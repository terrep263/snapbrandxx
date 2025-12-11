/**
 * Logo Library - Persistent logo storage using IndexedDB
 * Stores logos with metadata (id, name, image data) for reuse across sessions
 */

export interface LogoItem {
  id: string;
  name: string;
  imageData: string; // Data URL
  createdAt: number;
  updatedAt: number;
}

const DB_NAME = 'snapbrandxx-logos';
const DB_VERSION = 1;
const STORE_NAME = 'logos';

/**
 * Initialize IndexedDB database
 */
async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

/**
 * Save a logo to the library
 */
export async function saveLogo(name: string, imageFile: File): Promise<LogoItem> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const imageData = reader.result as string;
      const logo: LogoItem = {
        id: `logo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: name.trim() || `Logo ${new Date().toLocaleDateString()}`,
        imageData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      try {
        const db = await initDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(logo);

        request.onsuccess = () => resolve(logo);
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(imageFile);
  });
}

/**
 * Get all logos from the library
 */
export async function getAllLogos(): Promise<LogoItem[]> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initDB();
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const logos = request.result as LogoItem[];
        // Sort by most recently updated
        logos.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(logos);
      };
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get a single logo by ID
 */
export async function getLogoById(id: string): Promise<LogoItem | null> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initDB();
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Delete a logo from the library
 */
export async function deleteLogo(id: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Update logo name
 */
export async function updateLogoName(id: string, newName: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const logo = getRequest.result;
        if (!logo) {
          reject(new Error('Logo not found'));
          return;
        }

        logo.name = newName.trim();
        logo.updatedAt = Date.now();
        const putRequest = store.put(logo);

        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Convert LogoItem to HTMLImageElement for use in watermark layers
 */
export function logoItemToImage(logoItem: LogoItem): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load logo image'));
    img.src = logoItem.imageData;
  });
}


