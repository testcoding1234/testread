# 📚 Family Reading Journal - Progressive Web App

A private, offline-first Progressive Web App designed for families to track their reading journey, take notes, organize books, and share their library.

## ✨ Features

### Core Functionality
- **📷 Barcode Scanning**: Use your camera to scan ISBN/EAN barcodes for instant book lookup
- **🔍 Fuzzy Search**: Intelligent search across titles, authors, notes, and tags with typo tolerance
- **📖 Rich Book Details**: Track reading status, ratings, dates, notes, quotes, and photos
- **⭐ Clear Star Ratings**: Tap to rate books with visual feedback (gold ★ filled, gray ☆ empty)
- **🏷️ Smart Tag Suggestions**: Auto-suggested tags from book metadata with autocomplete input
- **📁 Smart Organization**: Custom tags, collections, and advanced filtering
- **☁️ Manual Backup**: Export/import your library as JSON or backup to Google Drive
- **⚙️ Easy Google Drive Setup**: Step-by-step guide for setting up Google OAuth
- **🌙 Dark Mode**: Easy on the eyes with automatic dark mode support
- **📱 Fully Offline**: Works completely offline after initial installation

### Privacy-First
- All data stored locally using IndexedDB
- No external servers or tracking
- Photos and notes never leave your device unless you manually backup
- Perfect for personal and family use

### Book Identification Methods
1. **Camera Barcode Scanner** - Scan ISBN/EAN codes with your device camera (optimized for Android Chrome)
2. **Online Search** - Search Google Books API by title, author, or ISBN
3. **Manual Entry** - Add books manually with custom details

### New UX Improvements (Latest Release)
- **📊 Improved Star Rating**: Clear visual distinction between filled (★) and empty (☆) stars with gold coloring
- **🎯 Smart Tagging**: Auto-generated tag suggestions from book titles, authors, and genres
- **💡 Tag Autocomplete**: Type to see suggestions from existing tags and book metadata
- **📖 Step-by-Step Google Drive Setup**: Comprehensive in-app guide for OAuth configuration
- **⚙️ Settings Page**: Centralized settings with Drive connection status and setup instructions
- **♿ Better Accessibility**: Enhanced focus states, larger touch targets, and clear button feedback

## 🚀 Installation

### Android (Recommended)

1. **Open in Chrome**
   - Navigate to the app URL in Chrome browser
   - Or open the local `index.html` file

2. **Install as PWA**
   - Tap the browser menu (⋮)
   - Select "Add to Home Screen" or "Install App"
   - Choose a name and confirm
   - The app icon will appear on your home screen

3. **Grant Camera Permission** (Optional but recommended)
   - When using barcode scanning for the first time
   - Tap "Allow" when prompted for camera access
   - You can always use manual search if you prefer not to grant camera access

### iPad / iOS (Safari)

1. Open the app in Safari browser
2. Tap the Share button (□↑)
3. Scroll down and tap "Add to Home Screen"
4. Name the app and tap "Add"

Note: Camera scanning may have limited support on iOS. Use online search as fallback.

### Desktop

The app works on desktop browsers but is optimized for mobile touch interfaces.

## 📖 Usage Guide

### Adding Your First Book

1. **Using Barcode Scanner**
   - Tap the "+" floating action button
   - Choose "Scan Barcode"
   - Allow camera permission when prompted
   - Point camera at ISBN barcode on book
   - Book details will be fetched automatically

2. **Using Online Search**
   - Tap the "+" button
   - Choose "Search Online"
   - Enter title, author, or ISBN
   - Select your book from results

3. **Manual Entry**
   - Tap the "+" button
   - Choose "Manual Entry"
   - Fill in book details
   - Tap "Add Book"

### Managing Your Library

**Viewing Books**
- Browse your collection in grid or list view
- Tap any book to see full details

**Reading Status**
- Set status: To Read, Reading, or Finished
- Track start and finish dates automatically
- Monitor your reading progress

**Rating & Reviews**
- Rate books from 1-5 stars
- Add detailed reading notes
- Save favorite quotes
- Attach photos

**Organization**
- Create custom tags (e.g., "Philosophy", "Favorites")
- Build collections (e.g., "Summer Reading", "Family Picks")
- Filter by status, rating, tags, or collections
- Search across your entire library

### Backup & Restore

#### JSON Export/Import (Recommended)

**Export Backup:**
1. Open menu (☰)
2. Tap "Export as JSON"
3. Save the downloaded file securely

**Import Backup:**
1. Open menu (☰)
2. Tap "Import JSON"
3. Select your backup file
4. Data will be merged with existing library

#### Google Drive Backup (Requires One-Time Setup)

**🆕 Streamlined Setup Process:**

The app now includes a comprehensive **step-by-step setup guide** built right into the Settings page!

**Quick Start:**
1. Open menu (☰) → **Settings & Google Drive Setup**
2. Click "Show Google Drive Setup Guide"
3. Follow the detailed instructions to create OAuth credentials
4. Paste your Client ID and save
5. You're ready to backup!

**What You'll Need:**
- A Google account
- 5-10 minutes for one-time setup
- Your GitHub Pages URL or localhost URL

**Using Google Drive Backup:**

**Backup:**
1. Open menu (☰) → Settings
2. Click "Backup to Google Drive"
3. Sign in with your Google account (first time only)
4. Your data is securely backed up

**Restore:**
1. Open menu (☰) → Settings
2. Click "Restore from Google Drive"
3. Sign in with your Google account
4. Data will be merged with your existing library

**🔒 Privacy Notes:**
- Backups are **manual only** - nothing uploads automatically
- Data is stored in your personal Google Drive (not accessible to others)
- You can revoke access anytime from Google Account settings
- No data is sent to any external servers except your Google Drive

### Family Sharing Workflow

1. **Primary User** creates and maintains the library
2. **Export** the library as JSON
3. **Share** the JSON file via email, cloud storage, or messaging
4. **Family Members** import the JSON file on their devices
5. **Periodically sync** by exchanging updated JSON exports

**Conflict Resolution:**
- Each family member can maintain their own notes and ratings
- Agree on who manages the master library
- Regularly export and share updates

## 🛠️ Technical Details

### Technology Stack
- **Frontend**: Vanilla HTML, CSS, JavaScript (no frameworks)
- **Data Storage**: IndexedDB for offline data persistence
- **Barcode Scanning**: ZXing library (loaded via CDN)
- **Book Metadata**: Google Books API
- **Backup**: Google Identity Services + Drive API (optional)
- **PWA**: Service Worker for offline functionality

### Browser Compatibility
- **Best Experience**: Android Chrome (primary target)
- **Supported**: Chrome, Edge, Firefox, Safari
- **iOS Safari**: Limited camera support, use search fallback

### Storage
- All data stored locally in browser's IndexedDB
- Images compressed to optimize storage
- No storage limits imposed by app (browser dependent)

### Offline Functionality
- Full offline access after first load
- Service worker caches all app assets
- Works without internet connection
- Barcode scanning requires camera (works offline)
- Book search requires internet (falls back to local search)

## 🔧 Configuration

### Google Books API (Optional)
The app works without an API key, but you can add one for higher rate limits:
1. Get an API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Google Books API
3. Add key to `js/google-books-api.js` (line 4)

### Google Drive OAuth
**No manual configuration needed!** Use the built-in setup guide:
1. Open Settings (☰ → Settings & Google Drive Setup)
2. Click "Show Google Drive Setup Guide"
3. Follow the step-by-step instructions in the app

The setup guide includes everything you need with clear explanations for non-technical users.

## 📱 Camera Permissions

### Android Chrome
1. Tap "Allow" when prompted
2. If denied, go to Settings → Site Settings → Camera
3. Find your app and enable camera access

### Denied Permission Recovery
- The app automatically falls back to manual search
- Tap "Can't scan? Search instead" button
- You can still use all features without camera access

## 🐛 Troubleshooting

**App won't install**
- Ensure you're using HTTPS or localhost
- Try clearing browser cache
- Use Chrome or Edge browser

**Camera not working**
- Check browser camera permissions
- Ensure you're using HTTPS
- Try the search fallback option

**Books not appearing**
- Check browser console for errors
- Ensure IndexedDB is enabled
- Try exporting and re-importing data

**Slow performance**
- Clear old cached data
- Reduce number of photos per book
- Close other apps/tabs

## 📄 License

This project is open source and available for personal and family use.

## 🤝 Contributing

This is a personal/family project. Feel free to fork and customize for your own use!

## 📞 Support

For issues or questions, please check the browser console for error messages and ensure:
- JavaScript is enabled
- IndexedDB is supported and enabled
- Camera permissions are granted (for barcode scanning)
- Internet connection available (for initial book search)

---

**Made with ❤️ for book lovers and families**
