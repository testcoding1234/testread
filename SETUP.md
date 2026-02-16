# Quick Setup Guide

## Local Development

### Option 1: Python HTTP Server (Recommended)
```bash
# Navigate to project directory
cd testread

# Start server
python3 -m http.server 8080

# Open in browser
# http://localhost:8080
```

### Option 2: Node.js HTTP Server
```bash
# Install http-server globally (one time)
npm install -g http-server

# Navigate to project directory
cd testread

# Start server
http-server -p 8080

# Open in browser
# http://localhost:8080
```

### Option 3: VS Code Live Server
1. Install "Live Server" extension in VS Code
2. Right-click `index.html`
3. Select "Open with Live Server"

## Production Deployment

### GitHub Pages
1. Push code to GitHub repository
2. Go to Settings → Pages
3. Select branch (main/master)
4. Select folder (/ root)
5. Save and wait for deployment
6. Access at: `https://username.github.io/testread/`

### Netlify
1. Create account at netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect to GitHub repository
4. Build settings: Leave empty (static site)
5. Deploy
6. Access at: `https://your-app-name.netlify.app/`

### Vercel
1. Create account at vercel.com
2. Click "New Project"
3. Import GitHub repository
4. Build settings: Leave default
5. Deploy
6. Access at: `https://your-app-name.vercel.app/`

## Google Books API Setup (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project
3. Enable "Google Books API"
4. Create credentials → API Key
5. Add API key to `js/google-books-api.js` line 3:
   ```javascript
   this.apiKey = 'YOUR_API_KEY_HERE';
   ```

## Google Drive Backup Setup (Optional)

1. In [Google Cloud Console](https://console.cloud.google.com/)
2. Enable "Google Drive API"
3. Create credentials → OAuth 2.0 Client ID
4. Application type: Web application
5. Add authorized JavaScript origins:
   - `http://localhost:8080` (for development)
   - `https://your-production-domain.com` (for production)
6. Copy Client ID
7. Add to `js/google-drive-backup.js` line 3:
   ```javascript
   this.clientId = 'YOUR_CLIENT_ID_HERE.apps.googleusercontent.com';
   ```

## Testing the PWA

### Desktop Testing
1. Open in Chrome
2. Open DevTools (F12)
3. Go to Application tab
4. Check "Service Workers" - should be registered
5. Check "Manifest" - should show app info
6. Click "Add to Home Screen" to install

### Mobile Testing (Android)
1. Serve app over HTTPS or use tunneling (ngrok, localtunnel)
2. Open in Chrome on Android
3. Tap menu (⋮) → "Add to Home Screen"
4. App icon appears on home screen
5. Open app - runs in standalone mode

### Mobile Testing (iOS/iPad)
1. Open in Safari
2. Tap Share button (□↑)
3. Scroll and tap "Add to Home Screen"
4. App icon appears on home screen

## Browser Compatibility

### Recommended
- ✅ Chrome (Android/Desktop) - Best experience
- ✅ Edge (Desktop)
- ✅ Safari (iOS/iPadOS) - Good support

### Supported
- ⚠️ Firefox - Works but PWA features limited
- ⚠️ Samsung Internet - Good alternative on Android

### Features by Browser
| Feature | Chrome | Safari | Firefox | Edge |
|---------|--------|--------|---------|------|
| PWA Install | ✅ | ✅ | ⚠️ | ✅ |
| Service Worker | ✅ | ✅ | ✅ | ✅ |
| IndexedDB | ✅ | ✅ | ✅ | ✅ |
| Camera API | ✅ | ⚠️ | ✅ | ✅ |
| Barcode Scan | ✅ | ⚠️ | ✅ | ✅ |

## Troubleshooting

### Service Worker Not Registering
- Ensure serving over HTTPS or localhost
- Check browser console for errors
- Clear cache and hard reload (Ctrl+Shift+R)

### Camera Not Working
- Ensure HTTPS connection
- Check camera permissions in browser settings
- Use fallback search if camera unavailable

### Books Not Persisting
- Check IndexedDB is enabled in browser
- Check available storage space
- Try exporting and re-importing data

### PWA Not Installing
- Ensure manifest.json is valid
- Serve over HTTPS
- Check all icons are available
- Clear browser cache

## Data Management

### Export Your Library
1. Open menu (☰)
2. Tap "Export as JSON"
3. Save file to safe location
4. Keep regular backups

### Import/Restore
1. Open menu (☰)
2. Tap "Import JSON"
3. Select backup file
4. Data will be merged with existing library

### Clear All Data
1. Browser Settings → Site Settings
2. Find your app URL
3. Clear storage/data
4. Or use browser DevTools → Application → Storage → Clear

## Performance Tips

### For Large Libraries (500+ books)
- Regularly export backups
- Compress photos before adding
- Use tags instead of creating many collections
- Clear browser cache occasionally

### For Better Speed
- Use WiFi for initial book searches
- Download app for offline use
- Keep photos under 1MB each
- Use grid view for faster scrolling

## Security & Privacy

### Data Storage
- All data stored locally in browser
- No server-side storage
- No analytics or tracking
- No cookies used

### Backup Security
- JSON exports are unencrypted
- Store backups in secure location
- Google Drive backups use your Google account permissions
- Consider encrypting sensitive notes before backing up

## Support

For issues or questions:
1. Check browser console for error messages
2. Review troubleshooting section above
3. Ensure latest browser version
4. Try different browser if issues persist

## Updates

To update the app:
1. Clear browser cache
2. Refresh the page
3. Service worker will update automatically
4. May need to uninstall and reinstall PWA

---

**Happy Reading! 📚**
