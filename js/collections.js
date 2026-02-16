// Collections and Tags Management
class CollectionsManager {
    async showManageCollections() {
        const collections = await db.getAll('collections');
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Manage Collections</h2>
                    <button class="close-modal">✕</button>
                </div>
                <div class="modal-body">
                    <div class="filter-section">
                        <h3>Your Collections</h3>
                        <div id="collectionsList">
                            ${collections.length > 0 ? collections.map(col => `
                                <div class="menu-item" style="display: flex; justify-content: space-between; align-items: center;">
                                    <span>📁 ${col.name}</span>
                                    <button class="btn btn-secondary" onclick="collectionsManager.deleteCollection(${col.id})">Delete</button>
                                </div>
                            `).join('') : '<p>No collections yet.</p>'}
                        </div>
                    </div>
                    <div class="filter-section">
                        <h3>Add New Collection</h3>
                        <input type="text" id="newCollectionName" placeholder="Collection name..." class="form-input">
                        <button id="addCollection" class="btn btn-primary">Add Collection</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelector('#addCollection').addEventListener('click', async () => {
            const name = modal.querySelector('#newCollectionName').value.trim();
            if (name) {
                try {
                    await db.addCollection(name);
                    ui.showToast('Collection added', 'success');
                    modal.remove();
                    this.showManageCollections();
                } catch (error) {
                    ui.showToast('Collection already exists', 'error');
                }
            }
        });
    }

    async deleteCollection(collectionId) {
        if (!confirm('Delete this collection? Books will not be deleted.')) {
            return;
        }

        // Delete book-collection relations
        const bookCollections = await db.getByIndex('bookCollections', 'collectionId', collectionId);
        for (const bc of bookCollections) {
            await db.delete('bookCollections', bc.id);
        }

        // Delete collection
        await db.delete('collections', collectionId);
        
        ui.showToast('Collection deleted', 'success');
        this.showManageCollections();
    }

    async showManageTags() {
        const tags = await db.getAll('tags');
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Manage Tags</h2>
                    <button class="close-modal">✕</button>
                </div>
                <div class="modal-body">
                    <div class="filter-section">
                        <h3>Your Tags</h3>
                        <div id="tagsList" style="display: flex; flex-wrap: wrap; gap: 8px;">
                            ${tags.length > 0 ? tags.map(tag => `
                                <span class="tag" style="display: flex; gap: 8px; align-items: center;">
                                    ${tag.name}
                                    <button onclick="collectionsManager.deleteTag(${tag.id})" style="background: none; border: none; cursor: pointer;">×</button>
                                </span>
                            `).join('') : '<p>No tags yet.</p>'}
                        </div>
                    </div>
                    <div class="filter-section">
                        <h3>Add New Tag</h3>
                        <input type="text" id="newTagName" placeholder="Tag name..." class="form-input">
                        <button id="addNewTag" class="btn btn-primary">Add Tag</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelector('#addNewTag').addEventListener('click', async () => {
            const name = modal.querySelector('#newTagName').value.trim();
            if (name) {
                try {
                    await db.addTag(name);
                    ui.showToast('Tag added', 'success');
                    modal.remove();
                    this.showManageTags();
                } catch (error) {
                    ui.showToast('Tag already exists', 'error');
                }
            }
        });
    }

    async deleteTag(tagId) {
        if (!confirm('Delete this tag? It will be removed from all books.')) {
            return;
        }

        // Delete book-tag relations
        const bookTags = await db.getByIndex('bookTags', 'tagId', tagId);
        for (const bt of bookTags) {
            await db.delete('bookTags', bt.id);
        }

        // Delete tag
        await db.delete('tags', tagId);
        
        ui.showToast('Tag deleted', 'success');
        this.showManageTags();
    }

    async showAddToCollectionDialog(bookId) {
        const collections = await db.getAll('collections');
        const bookCollections = await db.getCollectionsForBook(bookId);
        const bookCollectionIds = bookCollections.map(c => c.id);

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Add to Collection</h2>
                    <button class="close-modal">✕</button>
                </div>
                <div class="modal-body">
                    ${collections.length > 0 ? collections.map(col => `
                        <label style="display: flex; align-items: center; gap: 8px; padding: 8px 0; cursor: pointer;">
                            <input type="checkbox" 
                                   class="collection-checkbox" 
                                   value="${col.id}" 
                                   ${bookCollectionIds.includes(col.id) ? 'checked' : ''}>
                            ${col.name}
                        </label>
                    `).join('') : '<p>No collections yet. Create one in the menu.</p>'}
                    <button id="saveCollections" class="btn btn-primary mt-2" style="width: 100%;">Save</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelector('#saveCollections').addEventListener('click', async () => {
            // Remove all current collections
            for (const col of bookCollections) {
                await db.removeBookFromCollection(bookId, col.id);
            }

            // Add selected collections
            const checkboxes = modal.querySelectorAll('.collection-checkbox:checked');
            for (const checkbox of checkboxes) {
                await db.addBookToCollection(bookId, parseInt(checkbox.value));
            }

            ui.showToast('Collections updated', 'success');
            modal.remove();
        });
    }

    async showStatistics() {
        const books = await db.getAll('books');
        const notes = await db.getAll('notes');
        
        const toRead = books.filter(b => b.status === 'to-read').length;
        const reading = books.filter(b => b.status === 'reading').length;
        const finished = books.filter(b => b.status === 'finished').length;
        
        const totalPages = books.reduce((sum, b) => sum + (b.pageCount || 0), 0);
        const avgRating = books.filter(b => b.rating > 0).reduce((sum, b) => sum + b.rating, 0) / books.filter(b => b.rating > 0).length || 0;

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Reading Statistics</h2>
                    <button class="close-modal">✕</button>
                </div>
                <div class="modal-body">
                    <div class="filter-section">
                        <h3>Library Overview</h3>
                        <p><strong>Total Books:</strong> ${books.length}</p>
                        <p><strong>To Read:</strong> ${toRead}</p>
                        <p><strong>Currently Reading:</strong> ${reading}</p>
                        <p><strong>Finished:</strong> ${finished}</p>
                    </div>
                    <div class="filter-section">
                        <h3>Reading Progress</h3>
                        <p><strong>Total Pages:</strong> ${totalPages.toLocaleString()}</p>
                        <p><strong>Average Rating:</strong> ${avgRating.toFixed(1)} ⭐</p>
                        <p><strong>Total Notes:</strong> ${notes.length}</p>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });
    }
}

// Create global instance
const collectionsManager = new CollectionsManager();
