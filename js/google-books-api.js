// Google Books API Integration
class GoogleBooksAPI {
    constructor() {
        this.apiKey = ''; // Optional: Add your API key for higher rate limits
        this.baseURL = 'https://www.googleapis.com/books/v1/volumes';
    }

    async searchByISBN(isbn) {
        try {
            const url = `${this.baseURL}?q=isbn:${isbn}${this.apiKey ? '&key=' + this.apiKey : ''}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.items && data.items.length > 0) {
                return this.parseBookData(data.items[0]);
            }
            return null;
        } catch (error) {
            console.error('Error fetching book by ISBN:', error);
            return null;
        }
    }

    async searchBooks(query, maxResults = 10) {
        try {
            const url = `${this.baseURL}?q=${encodeURIComponent(query)}&maxResults=${maxResults}${this.apiKey ? '&key=' + this.apiKey : ''}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.items && data.items.length > 0) {
                return data.items.map(item => this.parseBookData(item));
            }
            return [];
        } catch (error) {
            console.error('Error searching books:', error);
            return [];
        }
    }

    async searchByTitleAuthor(title, author = '') {
        let query = `intitle:${title}`;
        if (author) {
            query += `+inauthor:${author}`;
        }
        return await this.searchBooks(query);
    }

    parseBookData(item) {
        const volumeInfo = item.volumeInfo || {};
        
        // Extract ISBN
        let isbn = '';
        if (volumeInfo.industryIdentifiers) {
            const isbn13 = volumeInfo.industryIdentifiers.find(id => id.type === 'ISBN_13');
            const isbn10 = volumeInfo.industryIdentifiers.find(id => id.type === 'ISBN_10');
            isbn = isbn13 ? isbn13.identifier : (isbn10 ? isbn10.identifier : '');
        }

        // Extract cover image (prefer high resolution)
        let coverImage = '';
        if (volumeInfo.imageLinks) {
            coverImage = volumeInfo.imageLinks.extraLarge ||
                        volumeInfo.imageLinks.large ||
                        volumeInfo.imageLinks.medium ||
                        volumeInfo.imageLinks.small ||
                        volumeInfo.imageLinks.thumbnail ||
                        '';
            // Use HTTPS
            coverImage = coverImage.replace('http://', 'https://');
        }

        return {
            title: volumeInfo.title || 'Unknown Title',
            authors: volumeInfo.authors || [],
            isbn: isbn,
            description: volumeInfo.description || '',
            publisher: volumeInfo.publisher || '',
            publishedDate: volumeInfo.publishedDate || '',
            pageCount: volumeInfo.pageCount || 0,
            categories: volumeInfo.categories || [],
            language: volumeInfo.language || 'en',
            coverImage: coverImage,
            googleBooksId: item.id,
            previewLink: volumeInfo.previewLink || '',
            infoLink: volumeInfo.infoLink || '',
            averageRating: volumeInfo.averageRating || 0,
            ratingsCount: volumeInfo.ratingsCount || 0,
            // Default fields for our app
            status: 'to-read',
            rating: 0,
            dateStarted: null,
            dateFinished: null,
            personalNotes: ''
        };
    }

    // Get book cover image URL
    getCoverImage(book, size = 'medium') {
        if (book.coverImage) {
            return book.coverImage;
        }
        // Fallback placeholder
        return this.getPlaceholderCover(book.title);
    }

    getPlaceholderCover(title) {
        // Generate a placeholder cover with the book title
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        
        // Random background color based on title
        const hue = this.hashCode(title) % 360;
        ctx.fillStyle = `hsl(${hue}, 50%, 50%)`;
        ctx.fillRect(0, 0, 200, 300);
        
        // Title text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Wrap text
        const words = title.split(' ');
        let line = '';
        let y = 150;
        for (let word of words) {
            const testLine = line + word + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > 180 && line !== '') {
                ctx.fillText(line, 100, y);
                line = word + ' ';
                y += 25;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, 100, y);
        
        return canvas.toDataURL();
    }

    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }
}

// Create global instance
const googleBooks = new GoogleBooksAPI();
