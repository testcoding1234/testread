// UI Controller and Helpers
class UIController {
    constructor() {
        this.currentView = 'library';
        this.currentFilters = {};
        this.viewMode = 'grid';
    }

    // Show loading spinner
    showLoading() {
        document.getElementById('loadingSpinner')?.classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loadingSpinner')?.classList.add('hidden');
    }

    // Toast notifications
    showToast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideDown 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // Modal management
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    closeAllModals() {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    }

    // Toggle visibility
    show(elementId) {
        document.getElementById(elementId)?.classList.remove('hidden');
    }

    hide(elementId) {
        document.getElementById(elementId)?.classList.add('hidden');
    }

    toggle(elementId) {
        document.getElementById(elementId)?.classList.toggle('hidden');
    }

    // Render book grid
    async renderBookGrid(books = null) {
        const bookGrid = document.getElementById('bookGrid');
        if (!bookGrid) return;

        if (!books) {
            books = await db.getAll('books');
        }

        // Sort books by date added (newest first)
        books = fuzzySearch.sortBooks(books, 'dateAdded', 'desc');

        bookGrid.innerHTML = '';

        if (books.length === 0) {
            this.show('welcomeScreen');
            this.hide('libraryView');
            this.hide('addBookBtn');
            return;
        }

        this.hide('welcomeScreen');
        this.show('libraryView');
        this.show('addBookBtn');

        for (const book of books) {
            const card = this.createBookCard(book);
            bookGrid.appendChild(card);
        }
    }

    createBookCard(book) {
        const card = document.createElement('div');
        card.className = 'book-card';
        card.dataset.bookId = book.id;

        // Cover
        const coverDiv = document.createElement('div');
        coverDiv.className = 'book-cover';
        
        if (book.coverImage) {
            const img = document.createElement('img');
            img.src = book.coverImage;
            img.alt = book.title;
            img.loading = 'lazy';
            coverDiv.appendChild(img);
        } else {
            coverDiv.textContent = '📚';
        }

        // Info
        const infoDiv = document.createElement('div');
        infoDiv.className = 'book-info';

        const title = document.createElement('div');
        title.className = 'book-title';
        title.textContent = book.title;

        const author = document.createElement('div');
        author.className = 'book-author';
        author.textContent = Array.isArray(book.authors) ? book.authors.join(', ') : book.authors || 'Unknown Author';

        const meta = document.createElement('div');
        meta.className = 'book-meta';

        // Rating
        if (book.rating > 0) {
            const rating = document.createElement('span');
            rating.className = 'book-rating';
            rating.textContent = '⭐'.repeat(book.rating);
            meta.appendChild(rating);
        }

        // Status
        const status = document.createElement('span');
        status.className = `book-status status-${book.status}`;
        status.textContent = book.status === 'to-read' ? 'To Read' : 
                           book.status === 'reading' ? 'Reading' : 'Finished';
        meta.appendChild(status);

        infoDiv.appendChild(title);
        infoDiv.appendChild(author);
        infoDiv.appendChild(meta);

        card.appendChild(coverDiv);
        card.appendChild(infoDiv);

        // Click event
        card.addEventListener('click', () => this.showBookDetail(book.id));

        return card;
    }

    // Show book detail view
    async showBookDetail(bookId) {
        const book = await db.get('books', bookId);
        if (!book) return;

        this.hide('libraryView');
        this.show('bookDetailView');

        const detailView = document.getElementById('bookDetailView');
        detailView.innerHTML = await this.renderBookDetail(book);

        // Attach event listeners for book detail actions
        this.attachBookDetailListeners(book);
    }

    async renderBookDetail(book) {
        const notes = await db.getNotesForBook(book.id);
        const tags = await db.getTagsForBook(book.id);
        const collections = await db.getCollectionsForBook(book.id);
        const photos = await db.getPhotosForBook(book.id);

        return `
            <div class="book-detail-container" data-book-id="${book.id}">
                <button id="backToLibrary" class="btn btn-secondary mb-2">← Back to Library</button>
                
                <div class="book-detail-header">
                    <div class="book-detail-cover">
                        <img src="${book.coverImage || googleBooks.getPlaceholderCover(book.title)}" alt="${book.title}">
                    </div>
                    <div class="book-detail-info">
                        <h1 class="book-detail-title">${book.title}</h1>
                        <p class="book-detail-author">${Array.isArray(book.authors) ? book.authors.join(', ') : book.authors || 'Unknown Author'}</p>
                        
                        <div class="book-detail-meta">
                            <div class="meta-item">
                                <span class="meta-label">Status</span>
                                <span class="meta-value" id="currentStatus">${book.status === 'to-read' ? 'To Read' : book.status === 'reading' ? 'Reading' : 'Finished'}</span>
                            </div>
                            ${book.publisher ? `
                            <div class="meta-item">
                                <span class="meta-label">Publisher</span>
                                <span class="meta-value">${book.publisher}</span>
                            </div>` : ''}
                            ${book.publishedDate ? `
                            <div class="meta-item">
                                <span class="meta-label">Published</span>
                                <span class="meta-value">${book.publishedDate}</span>
                            </div>` : ''}
                        </div>

                        <div class="book-detail-actions">
                            <button id="editStatus" class="btn btn-secondary">Change Status</button>
                            <button id="editBook" class="btn btn-secondary">Edit Details</button>
                            <button id="deleteBook" class="btn btn-secondary">Delete</button>
                        </div>
                    </div>
                </div>

                ${book.description ? `
                <div class="book-detail-section">
                    <h3 class="section-title">Description</h3>
                    <p>${book.description}</p>
                </div>` : ''}

                <div class="book-detail-section">
                    <h3 class="section-title">Rating</h3>
                    <div class="rating-stars" id="ratingStars">
                        ${this.renderStars(book.rating || 0)}
                    </div>
                </div>

                <div class="book-detail-section">
                    <h3 class="section-title">Reading Dates</h3>
                    <div style="display: flex; gap: 16px; flex-wrap: wrap;">
                        <div>
                            <label>Started:</label>
                            <input type="date" id="dateStarted" value="${book.dateStarted || ''}" class="form-input">
                        </div>
                        <div>
                            <label>Finished:</label>
                            <input type="date" id="dateFinished" value="${book.dateFinished || ''}" class="form-input">
                        </div>
                    </div>
                </div>

                <div class="book-detail-section">
                    <h3 class="section-title">Notes & Quotes</h3>
                    <div class="notes-list" id="notesList">
                        ${notes.length > 0 ? notes.map(note => `
                            <div class="note-item" data-note-id="${note.id}">
                                <div class="note-date">${new Date(note.dateCreated).toLocaleDateString()}</div>
                                <div class="note-content">${this.escapeHtml(note.text)}</div>
                                <button class="btn btn-secondary" onclick="ui.deleteNote(${note.id})">Delete</button>
                            </div>
                        `).join('') : '<p>No notes yet.</p>'}
                    </div>
                    <textarea id="newNoteText" class="form-textarea" placeholder="Add a new note or favorite quote..."></textarea>
                    <button id="addNote" class="btn btn-primary">Add Note</button>
                </div>

                <div class="book-detail-section">
                    <h3 class="section-title">Tags</h3>
                    <div class="tags-container" id="bookTags">
                        ${tags.map(tag => `
                            <span class="tag removable" data-tag-id="${tag.id}">
                                ${tag.name}
                                <button onclick="ui.removeTagFromBook(${book.id}, ${tag.id})">×</button>
                            </span>
                        `).join('')}
                    </div>
                    <div style="display: flex; gap: 8px; margin-top: 12px;">
                        <input type="text" id="newTagInput" placeholder="Add tag..." class="form-input">
                        <button id="addTag" class="btn btn-primary">Add</button>
                    </div>
                </div>

                <div class="book-detail-section">
                    <h3 class="section-title">Photos</h3>
                    <div class="photos-grid" id="photosGrid">
                        ${photos.map(photo => `
                            <div class="photo-item" data-photo-id="${photo.id}">
                                <img src="${photo.data}" alt="Book photo">
                                <button class="photo-delete" onclick="ui.deletePhoto(${photo.id})">×</button>
                            </div>
                        `).join('')}
                    </div>
                    <input type="file" id="photoInput" accept="image/*" style="display: none;">
                    <button id="addPhoto" class="btn btn-secondary">Add Photo</button>
                </div>
            </div>
        `;
    }

    renderStars(rating) {
        let html = '';
        for (let i = 1; i <= 5; i++) {
            html += `<span class="star ${i <= rating ? 'filled' : 'empty'}" data-rating="${i}">⭐</span>`;
        }
        return html;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    attachBookDetailListeners(book) {
        // Back button
        document.getElementById('backToLibrary')?.addEventListener('click', () => {
            this.hide('bookDetailView');
            this.show('libraryView');
            this.renderBookGrid();
        });

        // Rating stars
        document.querySelectorAll('.rating-stars .star').forEach(star => {
            star.addEventListener('click', async (e) => {
                const rating = parseInt(e.target.dataset.rating);
                book.rating = rating;
                await db.updateBook(book);
                document.getElementById('ratingStars').innerHTML = this.renderStars(rating);
                this.showToast('Rating updated', 'success');
            });
        });

        // Add note
        document.getElementById('addNote')?.addEventListener('click', async () => {
            const noteText = document.getElementById('newNoteText').value.trim();
            if (noteText) {
                await db.addNote(book.id, noteText);
                document.getElementById('newNoteText').value = '';
                this.showToast('Note added', 'success');
                this.showBookDetail(book.id);
            }
        });

        // Add tag
        document.getElementById('addTag')?.addEventListener('click', async () => {
            const tagName = document.getElementById('newTagInput').value.trim();
            if (tagName) {
                const tagId = await db.addTag(tagName);
                await db.addTagToBook(book.id, tagId);
                document.getElementById('newTagInput').value = '';
                this.showToast('Tag added', 'success');
                this.showBookDetail(book.id);
            }
        });

        // Add photo
        document.getElementById('addPhoto')?.addEventListener('click', () => {
            document.getElementById('photoInput').click();
        });

        document.getElementById('photoInput')?.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                const compressed = await compressImage(file);
                await db.addPhoto(book.id, compressed);
                this.showToast('Photo added', 'success');
                this.showBookDetail(book.id);
            }
        });

        // Date changes
        document.getElementById('dateStarted')?.addEventListener('change', async (e) => {
            book.dateStarted = e.target.value;
            await db.updateBook(book);
            this.showToast('Date updated', 'success');
        });

        document.getElementById('dateFinished')?.addEventListener('change', async (e) => {
            book.dateFinished = e.target.value;
            await db.updateBook(book);
            this.showToast('Date updated', 'success');
        });
    }

    async deleteNote(noteId) {
        if (confirm('Delete this note?')) {
            await db.deleteNote(noteId);
            this.showToast('Note deleted', 'success');
            // Reload current view
            const bookId = parseInt(document.querySelector('.book-detail-container')?.dataset?.bookId || 0);
            if (bookId) this.showBookDetail(bookId);
        }
    }

    async deletePhoto(photoId) {
        if (confirm('Delete this photo?')) {
            await db.deletePhoto(photoId);
            this.showToast('Photo deleted', 'success');
            const bookId = parseInt(document.querySelector('.book-detail-container')?.dataset?.bookId || 0);
            if (bookId) this.showBookDetail(bookId);
        }
    }

    async removeTagFromBook(bookId, tagId) {
        await db.removeTagFromBook(bookId, tagId);
        this.showToast('Tag removed', 'success');
        this.showBookDetail(bookId);
    }
}

// Create global UI controller
const ui = new UIController();
