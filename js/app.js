// Main Application Controller
class App {
    constructor() {
        this.initialized = false;
    }

    async init() {
        console.log('Initializing Reading Journal App...');

        try {
            // Initialize database
            await db.init();
            console.log('Database initialized');

            // Initialize UI
            this.setupEventListeners();
            this.setupModalHandlers();
            this.setupDarkMode();

            // Load initial view
            await ui.renderBookGrid();

            // Initialize fuzzy search
            await fuzzySearch.initialize();

            this.initialized = true;
            console.log('App initialized successfully');

            // Check if we should show install prompt
            this.setupPWAInstall();

        } catch (error) {
            console.error('Initialization error:', error);
            ui.showToast('Failed to initialize app', 'error');
        }
    }

    setupEventListeners() {
        // Header buttons
        document.getElementById('searchBtn')?.addEventListener('click', () => {
            ui.toggle('searchBar');
            if (!document.getElementById('searchBar').classList.contains('hidden')) {
                document.getElementById('searchInput')?.focus();
            }
        });

        document.getElementById('closeSearch')?.addEventListener('click', () => {
            ui.hide('searchBar');
            document.getElementById('searchInput').value = '';
        });

        document.getElementById('filterBtn')?.addEventListener('click', () => {
            ui.openModal('filterModal');
            this.populateFilterOptions();
        });

        document.getElementById('menuBtn')?.addEventListener('click', () => {
            ui.openModal('menuModal');
        });

        // Add book buttons
        document.getElementById('addFirstBook')?.addEventListener('click', () => {
            ui.openModal('addBookModal');
        });

        document.getElementById('addBookBtn')?.addEventListener('click', () => {
            ui.openModal('addBookModal');
        });

        // Add book methods
        document.getElementById('scanBarcodeBtn')?.addEventListener('click', () => {
            ui.closeModal('addBookModal');
            this.startBarcodeScanning();
        });

        document.getElementById('searchOnlineBtn')?.addEventListener('click', () => {
            ui.closeModal('addBookModal');
            ui.openModal('searchModal');
        });

        document.getElementById('manualEntryBtn')?.addEventListener('click', () => {
            ui.closeModal('addBookModal');
            ui.openModal('manualEntryModal');
        });

        // Search functionality
        document.getElementById('searchInput')?.addEventListener('input', async (e) => {
            const query = e.target.value.trim();
            if (query.length >= 2) {
                const results = await fuzzySearch.searchBooks(query);
                const books = results.map(r => r.book);
                await ui.renderBookGrid(books);
            } else if (query.length === 0) {
                await ui.renderBookGrid();
            }
        });

        document.getElementById('performSearch')?.addEventListener('click', () => {
            this.performOnlineSearch();
        });

        document.getElementById('onlineSearchInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performOnlineSearch();
            }
        });

        // Manual book entry
        document.getElementById('manualBookForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.addManualBook();
        });

        // Scanner fallback
        document.getElementById('fallbackToSearch')?.addEventListener('click', () => {
            scanner.stopScanning();
            ui.closeModal('scannerModal');
            ui.openModal('searchModal');
        });

        // Filter actions
        document.getElementById('applyFilters')?.addEventListener('click', async () => {
            await this.applyFilters();
            ui.closeModal('filterModal');
        });

        document.getElementById('clearFilters')?.addEventListener('click', async () => {
            this.clearFilters();
            await ui.renderBookGrid();
            ui.closeModal('filterModal');
        });

        // Menu actions
        document.getElementById('manageCollections')?.addEventListener('click', () => {
            ui.closeModal('menuModal');
            collectionsManager.showManageCollections();
        });

        document.getElementById('manageTags')?.addEventListener('click', () => {
            ui.closeModal('menuModal');
            collectionsManager.showManageTags();
        });

        document.getElementById('backupToDrive')?.addEventListener('click', () => {
            this.backupToGoogleDrive();
        });

        document.getElementById('restoreFromDrive')?.addEventListener('click', () => {
            this.restoreFromGoogleDrive();
        });

        document.getElementById('exportJSON')?.addEventListener('click', async () => {
            await driveBackup.exportToJSON();
            ui.showToast('Backup downloaded', 'success');
        });

        document.getElementById('importJSON')?.addEventListener('click', () => {
            this.importJSON();
        });

        document.getElementById('viewStats')?.addEventListener('click', () => {
            ui.closeModal('menuModal');
            collectionsManager.showStatistics();
        });

        document.getElementById('aboutApp')?.addEventListener('click', () => {
            this.showAbout();
        });

        // View mode toggle
        document.getElementById('gridViewBtn')?.addEventListener('click', () => {
            document.getElementById('gridViewBtn').classList.add('active');
            document.getElementById('listViewBtn').classList.remove('active');
            document.getElementById('bookGrid').className = 'book-grid';
        });

        document.getElementById('listViewBtn')?.addEventListener('click', () => {
            document.getElementById('listViewBtn').classList.add('active');
            document.getElementById('gridViewBtn').classList.remove('active');
            document.getElementById('bookGrid').className = 'book-list';
        });
    }

    setupModalHandlers() {
        // Close modal when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    ui.closeModal(modal.id);
                }
            });
        });

        // Close buttons
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    ui.closeModal(modal.id);
                }
            });
        });
    }

    setupDarkMode() {
        const darkModeToggle = document.getElementById('darkModeToggle');
        
        // Load saved preference
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
            darkModeToggle.textContent = '☀️';
        }

        darkModeToggle?.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', isDark);
            darkModeToggle.textContent = isDark ? '☀️' : '🌙';
        });
    }

    async startBarcodeScanning() {
        if (!BarcodeScanner.isCameraSupported()) {
            ui.showToast('Camera not supported on this device', 'error');
            ui.openModal('searchModal');
            return;
        }

        ui.openModal('scannerModal');
        
        const video = document.getElementById('scannerVideo');
        const canvas = document.getElementById('scannerCanvas');

        try {
            await scanner.initialize(video, canvas);
            await scanner.startScanning(
                async (barcode) => {
                    console.log('Barcode detected:', barcode);
                    ui.showToast('Barcode detected: ' + barcode, 'success');
                    
                    // Look up book by ISBN
                    ui.showLoading();
                    const bookData = await googleBooks.searchByISBN(barcode);
                    ui.hideLoading();

                    if (bookData) {
                        await this.addBookFromData(bookData);
                        ui.closeModal('scannerModal');
                    } else {
                        ui.showToast('Book not found. Try manual search.', 'warning');
                        scanner.stopScanning();
                        ui.closeModal('scannerModal');
                        ui.openModal('searchModal');
                        document.getElementById('onlineSearchInput').value = barcode;
                    }
                },
                (error) => {
                    console.error('Scanner error:', error);
                    ui.showToast('Camera access denied. Using search instead.', 'warning');
                    ui.closeModal('scannerModal');
                    ui.openModal('searchModal');
                }
            );
        } catch (error) {
            console.error('Scanner initialization error:', error);
            ui.showToast('Failed to start camera', 'error');
            ui.closeModal('scannerModal');
            ui.openModal('searchModal');
        }
    }

    async performOnlineSearch() {
        const query = document.getElementById('onlineSearchInput').value.trim();
        if (!query) return;

        ui.showLoading();
        const results = await googleBooks.searchBooks(query);
        ui.hideLoading();

        const resultsContainer = document.getElementById('searchResults');
        resultsContainer.innerHTML = '';

        if (results.length === 0) {
            resultsContainer.innerHTML = '<p>No results found.</p>';
            return;
        }

        results.forEach(book => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.innerHTML = `
                <img src="${book.coverImage || googleBooks.getPlaceholderCover(book.title)}" 
                     alt="${book.title}" 
                     class="search-result-cover">
                <div class="search-result-info">
                    <div class="search-result-title">${book.title}</div>
                    <div class="search-result-author">${book.authors.join(', ')}</div>
                    <div class="search-result-meta">
                        ${book.publishedDate ? book.publishedDate : ''} 
                        ${book.publisher ? '· ' + book.publisher : ''}
                    </div>
                </div>
            `;
            
            item.addEventListener('click', async () => {
                await this.addBookFromData(book);
                ui.closeModal('searchModal');
                document.getElementById('onlineSearchInput').value = '';
                resultsContainer.innerHTML = '';
            });

            resultsContainer.appendChild(item);
        });
    }

    async addManualBook() {
        const title = document.getElementById('manualTitle').value.trim();
        if (!title) return;

        const bookData = {
            title,
            authors: document.getElementById('manualAuthor').value.split(',').map(a => a.trim()),
            isbn: document.getElementById('manualISBN').value.trim(),
            description: document.getElementById('manualDescription').value.trim(),
            publisher: document.getElementById('manualPublisher').value.trim(),
            publishedDate: document.getElementById('manualPublishedYear').value.trim(),
            categories: document.getElementById('manualCategories').value.split(',').map(c => c.trim()),
            coverImage: '',
            status: 'to-read',
            rating: 0
        };

        await this.addBookFromData(bookData);
        ui.closeModal('manualEntryModal');
        document.getElementById('manualBookForm').reset();
    }

    async addBookFromData(bookData) {
        try {
            const bookId = await db.addBook(bookData);
            ui.showToast('Book added to library', 'success');
            await ui.renderBookGrid();
            
            // Optionally show the book detail
            setTimeout(() => {
                ui.showBookDetail(bookId);
            }, 500);
        } catch (error) {
            console.error('Error adding book:', error);
            ui.showToast('Failed to add book', 'error');
        }
    }

    async populateFilterOptions() {
        const tags = await db.getAll('tags');
        const collections = await db.getAll('collections');

        const tagList = document.getElementById('tagFilterList');
        const collectionList = document.getElementById('collectionFilterList');

        tagList.innerHTML = tags.map(tag => `
            <label>
                <input type="checkbox" class="tag-filter" value="${tag.name}">
                ${tag.name}
            </label>
        `).join('');

        collectionList.innerHTML = collections.map(col => `
            <label>
                <input type="checkbox" class="collection-filter" value="${col.name}">
                ${col.name}
            </label>
        `).join('');
    }

    async applyFilters() {
        const filters = {};

        // Status filters
        const statusFilters = Array.from(document.querySelectorAll('.status-filter:checked'))
            .map(cb => cb.value);
        if (statusFilters.length > 0) {
            filters.status = statusFilters;
        }

        // Rating filter
        const ratingFilter = document.getElementById('ratingFilter').value;
        if (ratingFilter) {
            filters.minRating = parseInt(ratingFilter);
        }

        // Tag filters
        const tagFilters = Array.from(document.querySelectorAll('.tag-filter:checked'))
            .map(cb => cb.value);
        if (tagFilters.length > 0) {
            filters.tags = tagFilters;
        }

        // Collection filters
        const collectionFilters = Array.from(document.querySelectorAll('.collection-filter:checked'))
            .map(cb => cb.value);
        if (collectionFilters.length > 0) {
            filters.collections = collectionFilters;
        }

        const results = await fuzzySearch.filterBooks(filters);
        await ui.renderBookGrid(results);
        
        // Show active filters
        this.showActiveFilters(filters);
    }

    showActiveFilters(filters) {
        const container = document.getElementById('activeFilters');
        container.innerHTML = '';

        const allFilters = [
            ...(filters.status || []).map(s => ({ type: 'status', value: s })),
            ...(filters.tags || []).map(t => ({ type: 'tag', value: t })),
            ...(filters.collections || []).map(c => ({ type: 'collection', value: c })),
        ];

        allFilters.forEach(filter => {
            const tag = document.createElement('div');
            tag.className = 'filter-tag';
            tag.innerHTML = `
                ${filter.value}
                <button onclick="app.removeFilter('${filter.type}', '${filter.value}')">×</button>
            `;
            container.appendChild(tag);
        });
    }

    clearFilters() {
        document.querySelectorAll('.status-filter, .tag-filter, .collection-filter')
            .forEach(cb => cb.checked = false);
        document.getElementById('ratingFilter').value = '';
        document.getElementById('activeFilters').innerHTML = '';
    }

    async backupToGoogleDrive() {
        try {
            // Note: This requires Google OAuth setup
            ui.showToast('Google Drive backup requires OAuth setup. Use JSON export instead.', 'warning');
            
            // Uncomment when OAuth is configured:
            // ui.showLoading();
            // await driveBackup.backupToDrive();
            // ui.hideLoading();
            // ui.showToast('Backup completed', 'success');
        } catch (error) {
            console.error('Backup error:', error);
            ui.showToast(error.message || 'Backup failed', 'error');
        }
    }

    async restoreFromGoogleDrive() {
        try {
            ui.showToast('Google Drive restore requires OAuth setup. Use JSON import instead.', 'warning');
            
            // Uncomment when OAuth is configured:
            // if (confirm('This will merge backup data with existing data. Continue?')) {
            //     ui.showLoading();
            //     await driveBackup.restoreFromDrive();
            //     ui.hideLoading();
            //     ui.showToast('Restore completed', 'success');
            //     await ui.renderBookGrid();
            // }
        } catch (error) {
            console.error('Restore error:', error);
            ui.showToast(error.message || 'Restore failed', 'error');
        }
    }

    importJSON() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    ui.showLoading();
                    await driveBackup.importFromJSON(file);
                    ui.hideLoading();
                    ui.showToast('Import completed', 'success');
                    await ui.renderBookGrid();
                } catch (error) {
                    console.error('Import error:', error);
                    ui.showToast('Import failed', 'error');
                }
            }
        };
        input.click();
    }

    showAbout() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>About Reading Journal</h2>
                    <button class="close-modal">✕</button>
                </div>
                <div class="modal-body">
                    <p><strong>Family Reading Journal</strong></p>
                    <p>Version 1.0.0</p>
                    <p>A private, offline-first Progressive Web App for tracking your family's reading journey.</p>
                    <br>
                    <p><strong>Features:</strong></p>
                    <ul>
                        <li>📷 Barcode scanning (ISBN/EAN)</li>
                        <li>🔍 Fuzzy search across library</li>
                        <li>📝 Rich notes and quotes</li>
                        <li>🏷️ Custom tags and collections</li>
                        <li>☁️ Manual backup/restore (JSON)</li>
                        <li>🌙 Dark mode support</li>
                        <li>📱 Fully offline capable</li>
                    </ul>
                    <br>
                    <p><strong>Privacy:</strong> All data is stored locally on your device. Nothing is sent to external servers unless you manually trigger a backup.</p>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    }

    setupPWAInstall() {
        let deferredPrompt;

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            // Show install button or prompt
            console.log('PWA install prompt available');
        });

        window.addEventListener('appinstalled', () => {
            console.log('PWA installed');
            ui.showToast('App installed successfully!', 'success');
            deferredPrompt = null;
        });
    }
}

// Initialize app when DOM is ready
const app = new App();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
} else {
    app.init();
}

// Handle book detail actions globally
document.addEventListener('click', async (e) => {
    if (e.target.id === 'editStatus') {
        const bookId = getCurrentBookId();
        const book = await db.get('books', bookId);
        if (book) bookDetailManager.showEditStatusDialog(book);
    }
    
    if (e.target.id === 'editBook') {
        const bookId = getCurrentBookId();
        const book = await db.get('books', bookId);
        if (book) bookDetailManager.showEditBookDialog(book);
    }
    
    if (e.target.id === 'deleteBook') {
        const bookId = getCurrentBookId();
        const book = await db.get('books', bookId);
        if (book) bookDetailManager.deleteBook(book);
    }
});

function getCurrentBookId() {
    const detailView = document.getElementById('bookDetailView');
    if (!detailView || detailView.classList.contains('hidden')) return null;
    
    const backBtn = document.querySelector('#backToLibrary');
    if (!backBtn) return null;
    
    // Extract from the rendered book detail
    const bookCard = document.querySelector('.book-detail-container');
    if (bookCard) {
        // We need to store the book ID somewhere accessible
        // Let's add it as a data attribute when rendering
        return parseInt(bookCard.dataset.bookId);
    }
    return null;
}
