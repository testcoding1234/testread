// Fuzzy Search Implementation
class FuzzySearch {
    constructor() {
        this.books = [];
        this.notes = [];
    }

    async initialize() {
        // Load all books and notes from database
        this.books = await db.getAll('books');
        this.notes = await db.getAll('notes');
    }

    // Calculate Levenshtein distance for fuzzy matching
    levenshteinDistance(str1, str2) {
        const len1 = str1.length;
        const len2 = str2.length;
        const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));

        for (let i = 0; i <= len1; i++) matrix[0][i] = i;
        for (let j = 0; j <= len2; j++) matrix[j][0] = j;

        for (let j = 1; j <= len2; j++) {
            for (let i = 1; i <= len1; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,
                    matrix[j - 1][i] + 1,
                    matrix[j - 1][i - 1] + indicator
                );
            }
        }

        return matrix[len2][len1];
    }

    // Calculate similarity score (0-1, higher is better)
    calculateSimilarity(str1, str2) {
        const s1 = str1.toLowerCase();
        const s2 = str2.toLowerCase();
        
        // Exact match
        if (s1 === s2) return 1.0;
        
        // Contains match
        if (s1.includes(s2) || s2.includes(s1)) {
            return 0.9;
        }
        
        // Fuzzy match using Levenshtein distance
        const maxLength = Math.max(s1.length, s2.length);
        const distance = this.levenshteinDistance(s1, s2);
        return 1 - (distance / maxLength);
    }

    // Search books by query
    async searchBooks(query, options = {}) {
        const {
            threshold = 0.3,  // Minimum similarity score
            limit = 50,
            searchFields = ['title', 'authors', 'description', 'categories']
        } = options;

        await this.initialize();

        const results = [];
        const lowerQuery = query.toLowerCase();

        for (const book of this.books) {
            let maxScore = 0;
            let matchedField = '';

            // Check each search field
            for (const field of searchFields) {
                let fieldValue = book[field];
                
                if (!fieldValue) continue;

                // Handle arrays (like authors, categories)
                if (Array.isArray(fieldValue)) {
                    for (const item of fieldValue) {
                        const score = this.calculateSimilarity(String(item), lowerQuery);
                        if (score > maxScore) {
                            maxScore = score;
                            matchedField = field;
                        }
                    }
                } else {
                    const score = this.calculateSimilarity(String(fieldValue), lowerQuery);
                    if (score > maxScore) {
                        maxScore = score;
                        matchedField = field;
                    }
                }
            }

            // Check notes for this book
            const bookNotes = this.notes.filter(n => n.bookId === book.id);
            for (const note of bookNotes) {
                if (note.text) {
                    const score = this.calculateSimilarity(note.text, lowerQuery);
                    if (score > maxScore) {
                        maxScore = score;
                        matchedField = 'notes';
                    }
                }
            }

            if (maxScore >= threshold) {
                results.push({
                    book,
                    score: maxScore,
                    matchedField
                });
            }
        }

        // Sort by score (highest first) and limit results
        results.sort((a, b) => b.score - a.score);
        return results.slice(0, limit);
    }

    // Quick search with autocomplete suggestions
    async getQuickSuggestions(query, limit = 5) {
        if (!query || query.length < 2) {
            return [];
        }

        await this.initialize();
        const lowerQuery = query.toLowerCase();
        const suggestions = new Set();

        // Search titles
        for (const book of this.books) {
            if (book.title && book.title.toLowerCase().includes(lowerQuery)) {
                suggestions.add(book.title);
            }
            
            // Search authors
            if (book.authors) {
                for (const author of book.authors) {
                    if (author.toLowerCase().includes(lowerQuery)) {
                        suggestions.add(author);
                    }
                }
            }

            if (suggestions.size >= limit) break;
        }

        return Array.from(suggestions).slice(0, limit);
    }

    // Filter books by multiple criteria
    async filterBooks(filters = {}) {
        await this.initialize();
        let results = [...this.books];

        // Filter by status
        if (filters.status && filters.status.length > 0) {
            results = results.filter(book => filters.status.includes(book.status));
        }

        // Filter by rating
        if (filters.minRating) {
            results = results.filter(book => (book.rating || 0) >= filters.minRating);
        }

        // Filter by tags
        if (filters.tags && filters.tags.length > 0) {
            const bookTagsData = await db.getAll('bookTags');
            const bookIdsWithTags = new Set();
            
            for (const tag of filters.tags) {
                const tagObj = (await db.getAll('tags')).find(t => t.name === tag);
                if (tagObj) {
                    const bookTags = bookTagsData.filter(bt => bt.tagId === tagObj.id);
                    bookTags.forEach(bt => bookIdsWithTags.add(bt.bookId));
                }
            }
            
            results = results.filter(book => bookIdsWithTags.has(book.id));
        }

        // Filter by collections
        if (filters.collections && filters.collections.length > 0) {
            const bookCollectionsData = await db.getAll('bookCollections');
            const bookIdsInCollections = new Set();
            
            for (const collection of filters.collections) {
                const collectionObj = (await db.getAll('collections')).find(c => c.name === collection);
                if (collectionObj) {
                    const bookCollections = bookCollectionsData.filter(bc => bc.collectionId === collectionObj.id);
                    bookCollections.forEach(bc => bookIdsInCollections.add(bc.bookId));
                }
            }
            
            results = results.filter(book => bookIdsInCollections.has(book.id));
        }

        // Filter by author
        if (filters.author) {
            const authorQuery = filters.author.toLowerCase();
            results = results.filter(book => 
                book.authors && book.authors.some(author => 
                    author.toLowerCase().includes(authorQuery)
                )
            );
        }

        // Filter by date range
        if (filters.dateFrom) {
            results = results.filter(book => 
                book.dateAdded && new Date(book.dateAdded) >= new Date(filters.dateFrom)
            );
        }

        if (filters.dateTo) {
            results = results.filter(book => 
                book.dateAdded && new Date(book.dateAdded) <= new Date(filters.dateTo)
            );
        }

        return results;
    }

    // Sort books
    sortBooks(books, sortBy = 'dateAdded', order = 'desc') {
        const sorted = [...books];

        sorted.sort((a, b) => {
            let aVal = a[sortBy];
            let bVal = b[sortBy];

            // Handle arrays (like authors)
            if (Array.isArray(aVal)) aVal = aVal[0];
            if (Array.isArray(bVal)) bVal = bVal[0];

            // Handle dates
            if (sortBy.includes('date') || sortBy.includes('Date')) {
                aVal = new Date(aVal || 0).getTime();
                bVal = new Date(bVal || 0).getTime();
            }

            // Handle strings
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            if (aVal < bVal) return order === 'asc' ? -1 : 1;
            if (aVal > bVal) return order === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    }
}

// Create global instance
const fuzzySearch = new FuzzySearch();
