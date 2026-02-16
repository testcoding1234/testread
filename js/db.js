// IndexedDB Database Manager
class Database {
    constructor() {
        this.dbName = 'ReadingJournalDB';
        this.version = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Books store
                if (!db.objectStoreNames.contains('books')) {
                    const bookStore = db.createObjectStore('books', { keyPath: 'id', autoIncrement: true });
                    bookStore.createIndex('isbn', 'isbn', { unique: false });
                    bookStore.createIndex('title', 'title', { unique: false });
                    bookStore.createIndex('authors', 'authors', { unique: false, multiEntry: true });
                    bookStore.createIndex('status', 'status', { unique: false });
                    bookStore.createIndex('rating', 'rating', { unique: false });
                    bookStore.createIndex('dateAdded', 'dateAdded', { unique: false });
                }

                // Notes store
                if (!db.objectStoreNames.contains('notes')) {
                    const noteStore = db.createObjectStore('notes', { keyPath: 'id', autoIncrement: true });
                    noteStore.createIndex('bookId', 'bookId', { unique: false });
                    noteStore.createIndex('dateCreated', 'dateCreated', { unique: false });
                }

                // Photos store
                if (!db.objectStoreNames.contains('photos')) {
                    const photoStore = db.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
                    photoStore.createIndex('bookId', 'bookId', { unique: false });
                }

                // Tags store
                if (!db.objectStoreNames.contains('tags')) {
                    const tagStore = db.createObjectStore('tags', { keyPath: 'id', autoIncrement: true });
                    tagStore.createIndex('name', 'name', { unique: true });
                }

                // Collections store
                if (!db.objectStoreNames.contains('collections')) {
                    const collectionStore = db.createObjectStore('collections', { keyPath: 'id', autoIncrement: true });
                    collectionStore.createIndex('name', 'name', { unique: true });
                }

                // Book-Tag relations
                if (!db.objectStoreNames.contains('bookTags')) {
                    const bookTagStore = db.createObjectStore('bookTags', { keyPath: 'id', autoIncrement: true });
                    bookTagStore.createIndex('bookId', 'bookId', { unique: false });
                    bookTagStore.createIndex('tagId', 'tagId', { unique: false });
                }

                // Book-Collection relations
                if (!db.objectStoreNames.contains('bookCollections')) {
                    const bookCollectionStore = db.createObjectStore('bookCollections', { keyPath: 'id', autoIncrement: true });
                    bookCollectionStore.createIndex('bookId', 'bookId', { unique: false });
                    bookCollectionStore.createIndex('collectionId', 'collectionId', { unique: false });
                }
            };
        });
    }

    // Generic CRUD operations
    async add(storeName, data) {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.add(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async get(storeName, id) {
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAll(storeName) {
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async update(storeName, data) {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.put(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName, id) {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getByIndex(storeName, indexName, value) {
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const index = store.index(indexName);
        return new Promise((resolve, reject) => {
            const request = index.getAll(value);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Book-specific operations
    async addBook(bookData) {
        const book = {
            ...bookData,
            dateAdded: new Date().toISOString(),
            dateModified: new Date().toISOString()
        };
        return await this.add('books', book);
    }

    async updateBook(book) {
        book.dateModified = new Date().toISOString();
        return await this.update('books', book);
    }

    async getBooksByStatus(status) {
        return await this.getByIndex('books', 'status', status);
    }

    // Note operations
    async addNote(bookId, noteText, type = 'general') {
        const note = {
            bookId,
            text: noteText,
            type,
            dateCreated: new Date().toISOString(),
            dateModified: new Date().toISOString()
        };
        return await this.add('notes', note);
    }

    async getNotesForBook(bookId) {
        return await this.getByIndex('notes', 'bookId', bookId);
    }

    async deleteNote(noteId) {
        return await this.delete('notes', noteId);
    }

    // Photo operations
    async addPhoto(bookId, photoData) {
        const photo = {
            bookId,
            data: photoData,
            dateAdded: new Date().toISOString()
        };
        return await this.add('photos', photo);
    }

    async getPhotosForBook(bookId) {
        return await this.getByIndex('photos', 'bookId', bookId);
    }

    async deletePhoto(photoId) {
        return await this.delete('photos', photoId);
    }

    // Tag operations
    async addTag(tagName) {
        try {
            return await this.add('tags', { name: tagName, dateCreated: new Date().toISOString() });
        } catch (error) {
            // Tag might already exist
            const tags = await this.getAll('tags');
            const existingTag = tags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
            if (existingTag) return existingTag.id;
            throw error;
        }
    }

    async addTagToBook(bookId, tagId) {
        return await this.add('bookTags', { bookId, tagId });
    }

    async getTagsForBook(bookId) {
        const bookTags = await this.getByIndex('bookTags', 'bookId', bookId);
        const tagIds = bookTags.map(bt => bt.tagId);
        const allTags = await this.getAll('tags');
        return allTags.filter(tag => tagIds.includes(tag.id));
    }

    async removeTagFromBook(bookId, tagId) {
        const bookTags = await this.getByIndex('bookTags', 'bookId', bookId);
        const relation = bookTags.find(bt => bt.tagId === tagId);
        if (relation) {
            await this.delete('bookTags', relation.id);
        }
    }

    // Collection operations
    async addCollection(collectionName) {
        try {
            return await this.add('collections', { 
                name: collectionName, 
                dateCreated: new Date().toISOString() 
            });
        } catch (error) {
            const collections = await this.getAll('collections');
            const existing = collections.find(c => c.name.toLowerCase() === collectionName.toLowerCase());
            if (existing) return existing.id;
            throw error;
        }
    }

    async addBookToCollection(bookId, collectionId) {
        return await this.add('bookCollections', { bookId, collectionId });
    }

    async getCollectionsForBook(bookId) {
        const bookCollections = await this.getByIndex('bookCollections', 'bookId', bookId);
        const collectionIds = bookCollections.map(bc => bc.collectionId);
        const allCollections = await this.getAll('collections');
        return allCollections.filter(col => collectionIds.includes(col.id));
    }

    async removeBookFromCollection(bookId, collectionId) {
        const bookCollections = await this.getByIndex('bookCollections', 'bookId', bookId);
        const relation = bookCollections.find(bc => bc.collectionId === collectionId);
        if (relation) {
            await this.delete('bookCollections', relation.id);
        }
    }

    async getBooksInCollection(collectionId) {
        const bookCollections = await this.getByIndex('bookCollections', 'collectionId', collectionId);
        const bookIds = bookCollections.map(bc => bc.bookId);
        const allBooks = await this.getAll('books');
        return allBooks.filter(book => bookIds.includes(book.id));
    }

    // Export/Import for backup
    async exportData() {
        const data = {
            books: await this.getAll('books'),
            notes: await this.getAll('notes'),
            photos: await this.getAll('photos'),
            tags: await this.getAll('tags'),
            collections: await this.getAll('collections'),
            bookTags: await this.getAll('bookTags'),
            bookCollections: await this.getAll('bookCollections'),
            exportDate: new Date().toISOString(),
            version: this.version
        };
        return data;
    }

    async importData(data, clearExisting = false) {
        if (clearExisting) {
            await this.clearAllData();
        }

        const stores = ['books', 'notes', 'photos', 'tags', 'collections', 'bookTags', 'bookCollections'];
        
        for (const store of stores) {
            if (data[store] && Array.isArray(data[store])) {
                for (const item of data[store]) {
                    await this.add(store, item);
                }
            }
        }
    }

    async clearAllData() {
        const stores = ['books', 'notes', 'photos', 'tags', 'collections', 'bookTags', 'bookCollections'];
        for (const store of stores) {
            const tx = this.db.transaction(store, 'readwrite');
            await tx.objectStore(store).clear();
        }
    }
}

// Utility: Compress image to reduce storage size
async function compressImage(file, maxWidth = 800, quality = 0.8) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                }, 'image/jpeg', quality);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// Create global database instance
const db = new Database();
