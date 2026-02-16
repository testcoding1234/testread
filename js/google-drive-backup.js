// Google Drive Backup & Restore Module
class GoogleDriveBackup {
    constructor() {
        this.clientId = ''; // Set this via settings or config
        this.apiKey = ''; // Set this via settings or config
        this.discoveryDocs = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
        this.scopes = 'https://www.googleapis.com/auth/drive.file';
        this.accessToken = null;
        this.isSignedIn = false;
        this.backupFileName = 'reading-journal-backup.json';
    }

    async initialize(clientId, apiKey) {
        this.clientId = clientId;
        this.apiKey = apiKey;
        
        // Load Google Identity Services
        return new Promise((resolve, reject) => {
            // Check if Google API is already loaded
            if (typeof google !== 'undefined' && google.accounts) {
                resolve();
                return;
            }

            // Load the Google Identity Services library
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
            document.head.appendChild(script);
        });
    }

    async signIn() {
        return new Promise((resolve, reject) => {
            if (!this.clientId) {
                reject(new Error('Google Client ID not configured. Please set up OAuth credentials.'));
                return;
            }

            try {
                const client = google.accounts.oauth2.initTokenClient({
                    client_id: this.clientId,
                    scope: this.scopes,
                    callback: (response) => {
                        if (response.access_token) {
                            this.accessToken = response.access_token;
                            this.isSignedIn = true;
                            resolve(response);
                        } else {
                            reject(new Error('Failed to obtain access token'));
                        }
                    },
                });
                client.requestAccessToken();
            } catch (error) {
                reject(error);
            }
        });
    }

    async backupToDrive() {
        if (!this.isSignedIn) {
            await this.signIn();
        }

        try {
            // Export data from IndexedDB
            const data = await db.exportData();
            const jsonData = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });

            // Check if backup file already exists
            const existingFile = await this.findBackupFile();

            if (existingFile) {
                // Update existing file
                return await this.updateFile(existingFile.id, blob);
            } else {
                // Create new file
                return await this.createFile(blob);
            }
        } catch (error) {
            console.error('Backup error:', error);
            throw error;
        }
    }

    async restoreFromDrive() {
        if (!this.isSignedIn) {
            await this.signIn();
        }

        try {
            const backupFile = await this.findBackupFile();
            
            if (!backupFile) {
                throw new Error('No backup file found in Google Drive');
            }

            // Download the file
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files/${backupFile.id}?alt=media`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Failed to download backup file');
            }

            const data = await response.json();
            
            // Import data into IndexedDB
            await db.importData(data, false); // false = don't clear existing data by default
            
            return data;
        } catch (error) {
            console.error('Restore error:', error);
            throw error;
        }
    }

    async findBackupFile() {
        try {
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files?q=name='${this.backupFileName}'&spaces=appDataFolder`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );

            const data = await response.json();
            
            if (data.files && data.files.length > 0) {
                return data.files[0];
            }
            return null;
        } catch (error) {
            console.error('Error finding backup file:', error);
            return null;
        }
    }

    async createFile(blob) {
        const metadata = {
            name: this.backupFileName,
            mimeType: 'application/json',
            parents: ['appDataFolder']
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', blob);

        const response = await fetch(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                },
                body: form
            }
        );

        return await response.json();
    }

    async updateFile(fileId, blob) {
        const response = await fetch(
            `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: blob
            }
        );

        return await response.json();
    }

    signOut() {
        this.accessToken = null;
        this.isSignedIn = false;
        if (typeof google !== 'undefined' && google.accounts) {
            google.accounts.oauth2.revoke(this.accessToken);
        }
    }

    // Manual JSON export (no Google Drive)
    async exportToJSON() {
        const data = await db.exportData();
        const jsonData = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `reading-journal-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    // Manual JSON import
    async importFromJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    await db.importData(data, false);
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    }
}

// Create global instance
const driveBackup = new GoogleDriveBackup();
