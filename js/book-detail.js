// Book Detail Page Extended Functionality
class BookDetailManager {
    constructor() {
        this.currentBook = null;
    }

    async showEditStatusDialog(book) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Update Reading Status</h2>
                    <button class="close-modal">✕</button>
                </div>
                <div class="modal-body">
                    <div class="status-selector">
                        <div class="status-option ${book.status === 'to-read' ? 'selected' : ''}" data-status="to-read">
                            <div>📚</div>
                            <div>To Read</div>
                        </div>
                        <div class="status-option ${book.status === 'reading' ? 'selected' : ''}" data-status="reading">
                            <div>📖</div>
                            <div>Reading</div>
                        </div>
                        <div class="status-option ${book.status === 'finished' ? 'selected' : ''}" data-status="finished">
                            <div>✅</div>
                            <div>Finished</div>
                        </div>
                    </div>
                    <button id="saveStatus" class="btn btn-primary mt-2" style="width: 100%;">Save</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        let selectedStatus = book.status;

        modal.querySelectorAll('.status-option').forEach(option => {
            option.addEventListener('click', () => {
                modal.querySelectorAll('.status-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                selectedStatus = option.dataset.status;
            });
        });

        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelector('#saveStatus').addEventListener('click', async () => {
            book.status = selectedStatus;
            
            // Auto-set dates based on status
            if (selectedStatus === 'reading' && !book.dateStarted) {
                book.dateStarted = new Date().toISOString().split('T')[0];
            }
            if (selectedStatus === 'finished' && !book.dateFinished) {
                book.dateFinished = new Date().toISOString().split('T')[0];
            }

            await db.updateBook(book);
            modal.remove();
            ui.showToast('Status updated', 'success');
            ui.showBookDetail(book.id);
        });
    }

    async showEditBookDialog(book) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Edit Book Details</h2>
                    <button class="close-modal">✕</button>
                </div>
                <div class="modal-body">
                    <form id="editBookForm">
                        <label>Title</label>
                        <input type="text" id="editTitle" value="${book.title}" class="form-input" required>
                        
                        <label>Author(s)</label>
                        <input type="text" id="editAuthors" value="${Array.isArray(book.authors) ? book.authors.join(', ') : book.authors || ''}" class="form-input">
                        
                        <label>ISBN</label>
                        <input type="text" id="editISBN" value="${book.isbn || ''}" class="form-input">
                        
                        <label>Description</label>
                        <textarea id="editDescription" class="form-textarea">${book.description || ''}</textarea>
                        
                        <label>Publisher</label>
                        <input type="text" id="editPublisher" value="${book.publisher || ''}" class="form-input">
                        
                        <label>Published Date</label>
                        <input type="text" id="editPublishedDate" value="${book.publishedDate || ''}" class="form-input">
                        
                        <label>Cover Image URL</label>
                        <input type="url" id="editCoverImage" value="${book.coverImage || ''}" class="form-input">
                        
                        <button type="submit" class="btn btn-primary" style="width: 100%;">Save Changes</button>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelector('#editBookForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            book.title = document.getElementById('editTitle').value;
            book.authors = document.getElementById('editAuthors').value.split(',').map(a => a.trim());
            book.isbn = document.getElementById('editISBN').value;
            book.description = document.getElementById('editDescription').value;
            book.publisher = document.getElementById('editPublisher').value;
            book.publishedDate = document.getElementById('editPublishedDate').value;
            book.coverImage = document.getElementById('editCoverImage').value;

            await db.updateBook(book);
            modal.remove();
            ui.showToast('Book updated', 'success');
            ui.showBookDetail(book.id);
        });
    }

    async deleteBook(book) {
        if (!confirm(`Are you sure you want to delete "${book.title}"? This will also delete all notes, photos, and associations.`)) {
            return;
        }

        // Delete associated data
        const notes = await db.getNotesForBook(book.id);
        for (const note of notes) {
            await db.deleteNote(note.id);
        }

        const photos = await db.getPhotosForBook(book.id);
        for (const photo of photos) {
            await db.deletePhoto(photo.id);
        }

        // Delete book-tag relations
        const bookTags = await db.getByIndex('bookTags', 'bookId', book.id);
        for (const bt of bookTags) {
            await db.delete('bookTags', bt.id);
        }

        // Delete book-collection relations
        const bookCollections = await db.getByIndex('bookCollections', 'bookId', book.id);
        for (const bc of bookCollections) {
            await db.delete('bookCollections', bc.id);
        }

        // Delete the book itself
        await db.delete('books', book.id);

        ui.showToast('Book deleted', 'success');
        ui.hide('bookDetailView');
        ui.show('libraryView');
        ui.renderBookGrid();
    }
}

// Create global instance
const bookDetailManager = new BookDetailManager();
