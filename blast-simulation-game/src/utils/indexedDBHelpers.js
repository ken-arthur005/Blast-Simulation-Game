let db = null;

export function initDB(dbName, storeName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(storeName)) {
        database.createObjectStore(storeName, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    request.onerror = (err) => reject("DB init error: " + err.target.error);
  });
}

export function add(storeName, data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);

    const request = store.add(data);
    request.onsuccess = () => resolve(request.result);
    request.onerror = (err) => reject("Add error: " + err.target.error);
  });
}

export function getAll(storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);

    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = (err) => reject("GetAll error: " + err.target.error);
  });
}

export function limitStore(storeName, maxItems) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);

    const getAllReq = store.getAll();

    getAllReq.onsuccess = () => {
      const items = getAllReq.result;

      if (items.length <= maxItems) {
        resolve("No cleanup needed");
        return;
      }

      // Sort by id (oldest first)
      items.sort((a, b) => a.id - b.id);

      // Calculate how many to delete
      const excess = items.length - maxItems;
      const itemsToDelete = items.slice(0, excess);

      let deletedCount = 0;

      itemsToDelete.forEach(item => {
        const deleteReq = store.delete(item.id);
        deleteReq.onsuccess = () => {
          deletedCount++;
          if (deletedCount === itemsToDelete.length) {
            resolve(`Cleanup done. Deleted ${deletedCount} old items.`);
          }
        };
        deleteReq.onerror = (err) =>
          reject("Cleanup error: " + err.target.error);
      });
    };

    getAllReq.onerror = (err) =>
      reject("Cleanup fetch error: " + err.target.error);
  });
}

