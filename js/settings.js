// Settings Manager
class SettingsManager {
    constructor() {
        this.clientIdKey = 'googleDriveClientId';
    }

    // Initialize settings modal
    init() {
        this.attachEventListeners();
        this.loadSettings();
        this.updateConnectionStatus();
        this.setCurrentOrigin();
    }

    attachEventListeners() {
        // Open settings modal
        document.getElementById('openSettings')?.addEventListener('click', () => {
            ui.closeModal('menuModal');
            ui.openModal('settingsModal');
        });

        // Save Client ID
        document.getElementById('saveClientId')?.addEventListener('click', () => {
            this.saveClientId();
        });

        // Toggle setup guide
        document.getElementById('toggleSetupGuide')?.addEventListener('click', (e) => {
            this.toggleSetupGuide();
        });

        // Backup to Drive from settings
        document.getElementById('settingsBackupToDrive')?.addEventListener('click', async () => {
            await this.backupToDrive();
        });

        // Restore from Drive from settings
        document.getElementById('settingsRestoreFromDrive')?.addEventListener('click', async () => {
            await this.restoreFromDrive();
        });
    }

    // Load saved settings
    loadSettings() {
        const clientId = localStorage.getItem(this.clientIdKey);
        if (clientId) {
            const input = document.getElementById('googleClientId');
            if (input) {
                input.value = clientId;
            }
        }
    }

    // Save Client ID to localStorage
    saveClientId() {
        const input = document.getElementById('googleClientId');
        const clientId = input?.value.trim();

        if (!clientId) {
            ui.showToast('Please enter a valid Client ID', 'error');
            return;
        }

        // Basic validation
        if (!clientId.includes('.apps.googleusercontent.com')) {
            ui.showToast('Client ID format looks incorrect. Please check it.', 'warning');
            return;
        }

        localStorage.setItem(this.clientIdKey, clientId);
        
        // Initialize Google Drive backup with the new Client ID
        // Second parameter is API key (optional, not used for Drive API v3)
        driveBackup.initialize(clientId, '').then(() => {
            ui.showToast('Client ID saved successfully! ✅', 'success');
            this.updateConnectionStatus();
        }).catch(error => {
            console.error('Error initializing Drive:', error);
            ui.showToast('Client ID saved, but Google services failed to load', 'warning');
        });
    }

    // Update connection status indicator
    updateConnectionStatus() {
        const statusElement = document.getElementById('driveConnectionStatus');
        if (!statusElement) return;

        const clientId = localStorage.getItem(this.clientIdKey);

        if (clientId && driveBackup.isSignedIn) {
            statusElement.className = 'status-badge status-connected';
            statusElement.textContent = '✅ Connected';
        } else if (clientId) {
            statusElement.className = 'status-badge status-disconnected';
            statusElement.textContent = '⚠️ Client ID Set (Sign in needed)';
        } else {
            statusElement.className = 'status-badge status-disconnected';
            statusElement.textContent = '⚠️ Not Connected';
        }
    }

    // Toggle setup guide visibility
    toggleSetupGuide() {
        const guide = document.getElementById('driveSetupGuide');
        const button = document.getElementById('toggleSetupGuide');
        
        if (!guide || !button) return;

        if (guide.classList.contains('hidden')) {
            guide.classList.remove('hidden');
            button.textContent = '📚 Hide Google Drive Setup Guide';
        } else {
            guide.classList.add('hidden');
            button.textContent = '📚 Show Google Drive Setup Guide';
        }
    }

    // Set the current origin for the setup guide
    setCurrentOrigin() {
        const originElement = document.getElementById('currentOrigin');
        if (originElement) {
            originElement.textContent = window.location.origin;
        }
    }

    // Backup to Drive
    async backupToDrive() {
        const clientId = localStorage.getItem(this.clientIdKey);

        if (!clientId) {
            ui.showToast('Please set up your Google Client ID first!', 'error');
            document.getElementById('toggleSetupGuide')?.click(); // Show guide
            return;
        }

        try {
            ui.showLoading();
            
            // Initialize if not already done (API key not needed for Drive API v3)
            if (!driveBackup.clientId) {
                await driveBackup.initialize(clientId, '');
            }

            await driveBackup.backupToDrive();
            ui.showToast('Backup to Google Drive successful! ✅', 'success');
            this.updateConnectionStatus();
        } catch (error) {
            console.error('Backup error:', error);
            
            if (error.message.includes('Client ID')) {
                ui.showToast('Please configure your Google Client ID in Settings', 'error');
                document.getElementById('toggleSetupGuide')?.click();
            } else {
                ui.showToast(`Backup failed: ${error.message}`, 'error');
            }
        } finally {
            ui.hideLoading();
        }
    }

    // Restore from Drive
    async restoreFromDrive() {
        const clientId = localStorage.getItem(this.clientIdKey);

        if (!clientId) {
            ui.showToast('Please set up your Google Client ID first!', 'error');
            document.getElementById('toggleSetupGuide')?.click(); // Show guide
            return;
        }

        if (!confirm('This will merge backup data with your current library. Continue?')) {
            return;
        }

        try {
            ui.showLoading();
            
            // Initialize if not already done (API key not needed for Drive API v3)
            if (!driveBackup.clientId) {
                await driveBackup.initialize(clientId, '');
            }

            await driveBackup.restoreFromDrive();
            ui.showToast('Restore from Google Drive successful! ✅', 'success');
            this.updateConnectionStatus();
            
            // Refresh the library view
            ui.renderBookGrid();
        } catch (error) {
            console.error('Restore error:', error);
            
            if (error.message.includes('Client ID')) {
                ui.showToast('Please configure your Google Client ID in Settings', 'error');
                document.getElementById('toggleSetupGuide')?.click();
            } else if (error.message.includes('No backup file')) {
                ui.showToast('No backup file found in Google Drive', 'warning');
            } else {
                ui.showToast(`Restore failed: ${error.message}`, 'error');
            }
        } finally {
            ui.hideLoading();
        }
    }
}

// Create global instance
const settingsManager = new SettingsManager();
