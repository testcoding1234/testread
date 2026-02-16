// Smart Tag Suggestion System
class TagSuggestionEngine {
    constructor() {
        this.commonWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'been', 'be',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
            'should', 'may', 'might', 'must', 'can', 'vol', 'volume', 'book', 'edition'
        ]);
    }

    // Generate tag suggestions from book metadata
    generateSuggestions(book) {
        const suggestions = new Set();

        // Extract from title (including series names)
        this.extractFromTitle(book.title || '', suggestions);

        // Extract from categories/genres
        if (book.categories && Array.isArray(book.categories)) {
            book.categories.forEach(category => {
                this.extractFromCategory(category, suggestions);
            });
        }

        // Extract from author name
        if (book.authors) {
            const authors = Array.isArray(book.authors) ? book.authors : [book.authors];
            authors.forEach(author => {
                if (author && author.trim()) {
                    suggestions.add(author.trim());
                }
            });
        }

        // Extract from publisher if notable
        if (book.publisher && book.publisher.trim()) {
            const publisher = book.publisher.trim();
            // Only add publisher if it's a well-known one
            if (this.isNotablePublisher(publisher)) {
                suggestions.add(publisher);
            }
        }

        return Array.from(suggestions).slice(0, 10); // Limit to 10 suggestions
    }

    extractFromTitle(title, suggestions) {
        // Look for series names in parentheses or after colon/dash
        const seriesMatch = title.match(/\(([^)]+)\)/);
        if (seriesMatch) {
            const series = seriesMatch[1].trim();
            if (!this.isCommonPhrase(series)) {
                suggestions.add(series);
            }
        }

        // Extract from subtitle (after colon or dash)
        const subtitleMatch = title.match(/[:\-–—]\s*(.+)/);
        if (subtitleMatch) {
            const subtitle = subtitleMatch[1].trim();
            this.extractKeywords(subtitle, suggestions);
        }

        // Extract keywords from main title
        this.extractKeywords(title, suggestions);
    }

    extractFromCategory(category, suggestions) {
        // Split compound categories
        const parts = category.split(/[\/,&]/).map(p => p.trim());
        
        parts.forEach(part => {
            // Clean up category names
            const cleaned = part
                .replace(/^(Fiction|Non-Fiction|Nonfiction)\s*/i, '')
                .replace(/\s*Fiction$/i, '')
                .trim();
            
            if (cleaned && cleaned.length > 2 && !this.isCommonPhrase(cleaned)) {
                suggestions.add(cleaned);
            }
        });
    }

    extractKeywords(text, suggestions) {
        // Extract meaningful words from text
        const words = text
            .replace(/[^\w\s'-]/g, ' ')
            .split(/\s+/)
            .map(w => w.trim().toLowerCase())
            .filter(w => w.length > 3 && !this.commonWords.has(w));

        // Add capitalized versions of significant words
        words.forEach(word => {
            const capitalized = word.charAt(0).toUpperCase() + word.slice(1);
            if (!this.isCommonPhrase(capitalized)) {
                suggestions.add(capitalized);
            }
        });
    }

    isCommonPhrase(phrase) {
        const lower = phrase.toLowerCase();
        return this.commonWords.has(lower) || 
               /^(vol|volume|book|edition|chapter|part)\s*\d*$/i.test(lower);
    }

    isNotablePublisher(publisher) {
        // List of notable publishers worth tagging
        const notablePublishers = [
            'penguin', 'random house', 'harpercollins', 'simon', 'schuster',
            'macmillan', 'hachette', 'scholastic', 'oxford', 'cambridge',
            'vintage', 'anchor', 'knopf', 'crown', 'bantam', 'ballantine'
        ];
        
        const lowerPublisher = publisher.toLowerCase();
        return notablePublishers.some(notable => lowerPublisher.includes(notable));
    }

    // Get existing tags for autocomplete
    async getExistingTags(query = '') {
        const allTags = await db.getAll('tags');
        
        if (!query) {
            return allTags;
        }

        const lowerQuery = query.toLowerCase();
        return allTags.filter(tag => 
            tag.name.toLowerCase().includes(lowerQuery)
        );
    }

    // Combine suggestions with existing tags for autocomplete
    async getCombinedSuggestions(book, query = '') {
        const suggestions = this.generateSuggestions(book);
        const existingTags = await this.getExistingTags(query);
        
        const existingTagNames = new Set(existingTags.map(t => t.name));
        
        // Filter out suggestions that already exist as tags
        const newSuggestions = suggestions
            .filter(s => !existingTagNames.has(s))
            .map(name => ({ name, isNew: true }));
        
        // Filter existing tags by query
        const filteredExisting = query 
            ? existingTags.filter(t => 
                t.name.toLowerCase().includes(query.toLowerCase())
              ).map(t => ({ ...t, isNew: false }))
            : existingTags.map(t => ({ ...t, isNew: false }));

        // Combine: existing tags first, then new suggestions
        return [...filteredExisting, ...newSuggestions];
    }
}

// Create global instance
const tagSuggestions = new TagSuggestionEngine();
