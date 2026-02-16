// Barcode Scanner Module using ZXing (loaded via CDN)
class BarcodeScanner {
    constructor() {
        this.video = null;
        this.canvas = null;
        this.stream = null;
        this.scanning = false;
        this.onBarcodeDetected = null;
        this.codeReader = null;
    }

    async initialize(videoElement, canvasElement) {
        this.video = videoElement;
        this.canvas = canvasElement;
        
        // Check if ZXing is available (will be loaded via CDN in production)
        if (typeof ZXing !== 'undefined' && ZXing.BrowserMultiFormatReader) {
            this.codeReader = new ZXing.BrowserMultiFormatReader();
        }
    }

    async startScanning(onDetected, onError) {
        this.onBarcodeDetected = onDetected;

        try {
            // Request camera permission
            const constraints = {
                video: {
                    facingMode: 'environment', // Use back camera on mobile
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;
            await this.video.play();

            this.scanning = true;

            // If ZXing is available, use it
            if (this.codeReader) {
                this.scanWithZXing();
            } else {
                // Fallback to manual scanning (less reliable)
                this.scanManually();
            }

        } catch (error) {
            console.error('Camera access error:', error);
            if (onError) {
                onError(error);
            }
        }
    }

    async scanWithZXing() {
        try {
            const result = await this.codeReader.decodeFromVideoDevice(
                null, // use default camera
                this.video,
                (result, error) => {
                    if (result) {
                        this.onBarcodeDetected(result.text);
                        this.stopScanning();
                    }
                }
            );
        } catch (error) {
            console.error('ZXing scanning error:', error);
        }
    }

    scanManually() {
        // Fallback: periodic canvas scanning
        const scanInterval = setInterval(() => {
            if (!this.scanning) {
                clearInterval(scanInterval);
                return;
            }

            // Draw video frame to canvas
            const ctx = this.canvas.getContext('2d');
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
            ctx.drawImage(this.video, 0, 0);

            // In a real implementation, you would use a barcode detection library here
            // For now, this is a placeholder
            // The ZXing CDN version will handle the actual detection
        }, 500);
    }

    stopScanning() {
        this.scanning = false;

        if (this.codeReader) {
            this.codeReader.reset();
        }

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        if (this.video) {
            this.video.srcObject = null;
        }
    }

    static async checkCameraPermission() {
        try {
            const result = await navigator.permissions.query({ name: 'camera' });
            return result.state; // 'granted', 'denied', or 'prompt'
        } catch (error) {
            // Permissions API not supported, try to access camera directly
            return 'prompt';
        }
    }

    static isCameraSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }
}

// Helper function to validate ISBN
function validateISBN(isbn) {
    // Remove hyphens and spaces
    const cleaned = isbn.replace(/[-\s]/g, '');
    
    // Check if it's ISBN-10 or ISBN-13
    if (cleaned.length === 10) {
        return validateISBN10(cleaned);
    } else if (cleaned.length === 13) {
        return validateISBN13(cleaned);
    }
    return false;
}

function validateISBN10(isbn) {
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(isbn[i]) * (10 - i);
    }
    const checkDigit = isbn[9] === 'X' ? 10 : parseInt(isbn[9]);
    sum += checkDigit;
    return sum % 11 === 0;
}

function validateISBN13(isbn) {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += parseInt(isbn[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = parseInt(isbn[12]);
    return (10 - (sum % 10)) % 10 === checkDigit;
}

// Create global scanner instance
const scanner = new BarcodeScanner();
