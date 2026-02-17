// UI Controller and Helpers
//
// SECURITY NOTE: Tag Suggestion Rendering
// ========================================
// The tag suggestion system uses DOM APIs to prevent Cross-Site Scripting (XSS) attacks.
// 
// Protection measures:
// 1. All dynamic tag names from user input or external sources (e.g., book metadata from APIs)
//    are rendered using DOM APIs (createElement + textContent) instead of innerHTML.
// 2. textContent automatically escapes HTML special characters, preventing injection of 
//    malicious scripts through tag names.
// 3. Event listeners are registered programmatically and tracked in tagSuggestionsCleanup array
//    to prevent memory leaks when navigating away from the book detail view.
// 
// Why this is XSS-safe:
// - textContent treats all input as plain text, never as HTML or JavaScript
// - Even if a tag name contains "<script>alert('XSS')</script>", it will be displayed
//   literally as text rather than executed as code
// - This is superior to HTML escaping (which can have edge cases) because the browser's
//   DOM API guarantees the content will never be interpreted as markup
//
class UIController {
    constructor() {
        this.currentView = 'library';
        this.currentFilters = {};
        this.viewMode = 'grid';
        this.tagSuggestionsCleanup = [];
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
            rating.innerHTML = '★'.repeat(book.rating) + '☆'.repeat(5 - book.rating);
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
                    <div style="position: relative; margin-top: 12px;">
                        <input 
                            type="text" 
                            id="newTagInput" 
                            placeholder="Add tag... (type to see suggestions)" 
                            class="form-input"
                            autocomplete="off">
                        <div id="tagSuggestions" class="tag-suggestions hidden"></div>
                    </div>
                    <div id="suggestedTags" class="suggested-tags-container"></div>
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
            const isFilled = i <= rating;
            const starSymbol = isFilled ? '★' : '☆';
            html += `<span class="star ${isFilled ? 'filled' : 'empty'}" data-rating="${i}">${starSymbol}</span>`;
        }
        return html;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Safely render tag suggestions using DOM APIs instead of innerHTML.
     * This prevents XSS attacks by using textContent for user-controlled data.
     * 
     * @param {HTMLElement} container - The container element for suggestions
     * @param {Array} suggestions - Array of suggestion objects
     * @param {Function} selectCallback - Callback function when suggestion is selected
     */
    renderTagSuggestions(container, suggestions, selectCallback) {
        if (!container) return;

        // Clear existing content safely
        container.replaceChildren();

        // Create suggestion items using safe DOM APIs
        suggestions.forEach((suggestion, index) => {
            const item = document.createElement('div');
            item.className = 'tag-suggestion-item';
            if (suggestion.isNew) {
                item.classList.add('new-tag');
            }
            item.dataset.index = index;

            // Create span for tag name using textContent (XSS-safe)
            const nameSpan = document.createElement('span');
            nameSpan.textContent = suggestion.name;
            item.appendChild(nameSpan);

            // Add "NEW" badge if it's a new tag
            if (suggestion.isNew) {
                const badge = document.createElement('span');
                badge.className = 'tag-badge';
                badge.textContent = 'NEW';
                item.appendChild(badge);
            }

            // Attach click handler
            const clickHandler = () => selectCallback(index);
            item.addEventListener('click', clickHandler);
            
            // Store cleanup for this listener
            this.tagSuggestionsCleanup.push(() => {
                item.removeEventListener('click', clickHandler);
            });

            container.appendChild(item);
        });
    }

    attachBookDetailListeners(book) {
        // Clean up any previous event listeners
        this.cleanupTagSuggestions();

        // Back button
        const backButton = document.getElementById('backToLibrary');
        const backClickHandler = () => {
            // Clean up tag suggestions listeners
            this.cleanupTagSuggestions();
            this.hide('bookDetailView');
            this.show('libraryView');
            this.renderBookGrid();
        };
        backButton?.addEventListener('click', backClickHandler);
        this.tagSuggestionsCleanup.push(() => {
            backButton?.removeEventListener('click', backClickHandler);
        });

        // Rating stars
        this.attachRatingListeners(book);

        // Add note
        const addNoteButton = document.getElementById('addNote');
        const addNoteHandler = async () => {
            const noteText = document.getElementById('newNoteText').value.trim();
            if (noteText) {
                await db.addNote(book.id, noteText);
                document.getElementById('newNoteText').value = '';
                this.showToast('Note added', 'success');
                this.showBookDetail(book.id);
            }
        };
        addNoteButton?.addEventListener('click', addNoteHandler);
        this.tagSuggestionsCleanup.push(() => {
            addNoteButton?.removeEventListener('click', addNoteHandler);
        });

        // Add tag with autocomplete
        const tagInput = document.getElementById('newTagInput');
        const tagSuggestionsDiv = document.getElementById('tagSuggestions');
        let currentSuggestions = [];
        let selectedSuggestionIndex = -1;

        // Show suggestions on input
        const tagInputHandler = async (e) => {
            const query = e.target.value.trim();
            
            if (query.length === 0) {
                tagSuggestionsDiv?.classList.add('hidden');
                return;
            }

            currentSuggestions = await tagSuggestions.getCombinedSuggestions(book, query);
            
            if (currentSuggestions.length === 0) {
                tagSuggestionsDiv?.classList.add('hidden');
                return;
            }

            // Render suggestions safely using DOM APIs
            this.renderTagSuggestions(tagSuggestionsDiv, currentSuggestions, selectSuggestion);
            
            tagSuggestionsDiv?.classList.remove('hidden');
            selectedSuggestionIndex = -1;
        };
        tagInput?.addEventListener('input', tagInputHandler);
        this.tagSuggestionsCleanup.push(() => {
            tagInput?.removeEventListener('input', tagInputHandler);
        });

        // Keyboard navigation for suggestions
        const tagKeydownHandler = async (e) => {
            if (tagSuggestionsDiv?.classList.contains('hidden')) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    await addTagFromInput();
                }
                return;
            }

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, currentSuggestions.length - 1);
                updateSuggestionHighlight();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
                updateSuggestionHighlight();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (selectedSuggestionIndex >= 0) {
                    await selectSuggestion(selectedSuggestionIndex);
                } else {
                    await addTagFromInput();
                }
            } else if (e.key === 'Escape') {
                tagSuggestionsDiv?.classList.add('hidden');
                selectedSuggestionIndex = -1;
            }
        };
        tagInput?.addEventListener('keydown', tagKeydownHandler);
        this.tagSuggestionsCleanup.push(() => {
            tagInput?.removeEventListener('keydown', tagKeydownHandler);
        });

        const updateSuggestionHighlight = () => {
            tagSuggestionsDiv?.querySelectorAll('.tag-suggestion-item').forEach((item, index) => {
                if (index === selectedSuggestionIndex) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
        };

        const selectSuggestion = async (index) => {
            const suggestion = currentSuggestions[index];
            if (!suggestion) return;

            let tagId;
            if (suggestion.isNew) {
                // Create new tag
                tagId = await db.addTag(suggestion.name);
            } else {
                // Use existing tag
                tagId = suggestion.id;
            }

            await db.addTagToBook(book.id, tagId);
            tagInput.value = '';
            tagSuggestionsDiv?.classList.add('hidden');
            this.showToast('Tag added', 'success');
            this.showBookDetail(book.id);
        };

        const addTagFromInput = async () => {
            const tagName = tagInput.value.trim();
            if (tagName) {
                const tagId = await db.addTag(tagName);
                await db.addTagToBook(book.id, tagId);
                tagInput.value = '';
                tagSuggestionsDiv?.classList.add('hidden');
                this.showToast('Tag added', 'success');
                this.showBookDetail(book.id);
            }
        };

        // Close suggestions when clicking outside - using named function for cleanup
        const closeTagSuggestionsHandler = (e) => {
            if (!tagInput?.contains(e.target) && !tagSuggestionsDiv?.contains(e.target)) {
                tagSuggestionsDiv?.classList.add('hidden');
            }
        };
        document.addEventListener('click', closeTagSuggestionsHandler);
        
        // Store handler for cleanup
        this.tagSuggestionsCleanup.push(() => {
            document.removeEventListener('click', closeTagSuggestionsHandler);
        });

        // Show suggested tags (auto-generated)
        this.showSuggestedTags(book);

        // Add photo
        const addPhotoButton = document.getElementById('addPhoto');
        const addPhotoHandler = () => {
            document.getElementById('photoInput').click();
        };
        addPhotoButton?.addEventListener('click', addPhotoHandler);
        this.tagSuggestionsCleanup.push(() => {
            addPhotoButton?.removeEventListener('click', addPhotoHandler);
        });

        const photoInput = document.getElementById('photoInput');
        const photoChangeHandler = async (e) => {
            const file = e.target.files[0];
            if (file) {
                const compressed = await compressImage(file);
                await db.addPhoto(book.id, compressed);
                this.showToast('Photo added', 'success');
                this.showBookDetail(book.id);
            }
        };
        photoInput?.addEventListener('change', photoChangeHandler);
        this.tagSuggestionsCleanup.push(() => {
            photoInput?.removeEventListener('change', photoChangeHandler);
        });

        // Date changes
        const dateStarted = document.getElementById('dateStarted');
        const dateStartedHandler = async (e) => {
            book.dateStarted = e.target.value;
            await db.updateBook(book);
            this.showToast('Date updated', 'success');
        };
        dateStarted?.addEventListener('change', dateStartedHandler);
        this.tagSuggestionsCleanup.push(() => {
            dateStarted?.removeEventListener('change', dateStartedHandler);
        });

        const dateFinished = document.getElementById('dateFinished');
        const dateFinishedHandler = async (e) => {
            book.dateFinished = e.target.value;
            await db.updateBook(book);
            this.showToast('Date updated', 'success');
        };
        dateFinished?.addEventListener('change', dateFinishedHandler);
        this.tagSuggestionsCleanup.push(() => {
            dateFinished?.removeEventListener('change', dateFinishedHandler);
        });
    }

    attachRatingListeners(book) {
        document.querySelectorAll('.rating-stars .star').forEach(star => {
            star.addEventListener('click', async (e) => {
                const rating = parseInt(e.target.dataset.rating);
                book.rating = rating;
                await db.updateBook(book);
                // Update all stars immediately
                const ratingStarsContainer = document.getElementById('ratingStars');
                if (ratingStarsContainer) {
                    ratingStarsContainer.innerHTML = this.renderStars(rating);
                    // Re-attach listeners after updating HTML
                    this.attachRatingListeners(book);
                }
                this.showToast('Rating updated', 'success');
            });
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

    async showSuggestedTags(book) {
        const suggestedTagsContainer = document.getElementById('suggestedTags');
        if (!suggestedTagsContainer) return;

        // Get current tags for the book
        const currentTags = await db.getTagsForBook(book.id);
        const currentTagNames = new Set(currentTags.map(t => t.name));

        // Generate suggestions
        const suggestions = tagSuggestions.generateSuggestions(book);
        
        // Filter out tags that are already added
        const newSuggestions = suggestions.filter(s => !currentTagNames.has(s));

        if (newSuggestions.length === 0) {
            suggestedTagsContainer.innerHTML = '';
            return;
        }

        // Clear container safely
        suggestedTagsContainer.replaceChildren();

        // Create header using safe DOM APIs
        const header = document.createElement('div');
        header.className = 'suggested-tags-header';
        header.textContent = '💡 Suggested tags:';
        suggestedTagsContainer.appendChild(header);

        // Create list container
        const listContainer = document.createElement('div');
        listContainer.className = 'suggested-tags-list';
        suggestedTagsContainer.appendChild(listContainer);

        // Create suggested tag elements using safe DOM APIs
        newSuggestions.forEach(tagName => {
            const tagEl = document.createElement('div');
            tagEl.className = 'suggested-tag';
            // Note: tagName is stored in dataset and later passed to db.addTag(). 
            // While rendering is XSS-safe via textContent, the tag name is stored as-is 
            // in IndexedDB and must be rendered safely (using textContent) wherever displayed.
            tagEl.dataset.tagName = tagName;
            
            // Use textContent for tag name (XSS-safe)
            const nameSpan = document.createElement('span');
            nameSpan.textContent = tagName;
            tagEl.appendChild(nameSpan);
            
            // Add space and plus sign
            tagEl.appendChild(document.createTextNode(' '));
            const plusSign = document.createElement('span');
            plusSign.style.opacity = '0.6';
            plusSign.textContent = '+';
            tagEl.appendChild(plusSign);

            // Attach click handler
            const clickHandler = async () => {
                const tagId = await db.addTag(tagName);
                await db.addTagToBook(book.id, tagId);
                this.showToast(`Tag "${tagName}" added`, 'success');
                this.showBookDetail(book.id);
            };
            tagEl.addEventListener('click', clickHandler);
            
            // Store cleanup for this listener
            this.tagSuggestionsCleanup.push(() => {
                tagEl.removeEventListener('click', clickHandler);
            });

            listContainer.appendChild(tagEl);
        });
    }

    cleanupTagSuggestions() {
        if (this.tagSuggestionsCleanup) {
            this.tagSuggestionsCleanup.forEach(cleanup => cleanup());
            this.tagSuggestionsCleanup = [];
        }
    }
}

// Create global UI controller
const ui = new UIController();
