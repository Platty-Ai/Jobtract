// Bulletproof URL Configuration System
// Automatically detects environment and configures URLs

class URLConfig {
    constructor() {
        this.environment = this.detectEnvironment();
        this.config = this.generateConfig();
    }

    detectEnvironment() {
        // Check if we're in development
        if (process.env.NODE_ENV === 'development') {
            return 'development';
        }

        // Check for common production indicators
        const hostname = window.location.hostname;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'development';
        }

        // Check for common deployment platforms
        if (hostname.includes('vercel.app') || 
            hostname.includes('netlify.app') || 
            hostname.includes('herokuapp.com') ||
            hostname.includes('appspot.com') ||
            hostname.includes('run.app')) {
            return 'production';
        }

        // Custom domain - assume production
        return 'production';
    }

    generateConfig() {
        const currentProtocol = window.location.protocol;
        const currentHostname = window.location.hostname;
        const currentPort = window.location.port;

        switch (this.environment) {
            case 'development':
                return {
                    API_BASE_URL: this.getDevelopmentAPIURL(),
                    FRONTEND_URL: `${currentProtocol}//${currentHostname}${currentPort ? ':' + currentPort : ''}`,
                    ENVIRONMENT: 'development',
                    IS_PRODUCTION: false
                };

            case 'production':
                return {
                    API_BASE_URL: this.getProductionAPIURL(),
                    FRONTEND_URL: `${currentProtocol}//${currentHostname}`,
                    ENVIRONMENT: 'production',
                    IS_PRODUCTION: true
                };

            default:
                return this.generateConfig(); // Fallback to development
        }
    }

    getDevelopmentAPIURL() {
        // Check for environment variable first
        if (process.env.REACT_APP_API_URL) {
            return process.env.REACT_APP_API_URL;
        }

        // Auto-detect based on current URL
        const currentProtocol = window.location.protocol;
        const currentHostname = window.location.hostname;

        // Common development patterns
        const commonPorts = [5000, 8000, 3001, 8080];
        
        // Try to detect if backend is running on a different port
        for (const port of commonPorts) {
            if (window.location.port !== port.toString()) {
                return `${currentProtocol}//${currentHostname}:${port}`;
            }
        }

        // Default to port 5000 (Flask default)
        return `${currentProtocol}//${currentHostname}:5000`;
    }

    getProductionAPIURL() {
        // Check for environment variable first
        if (process.env.REACT_APP_API_URL) {
            return process.env.REACT_APP_API_URL;
        }

        const currentProtocol = window.location.protocol;
        const currentHostname = window.location.hostname;

        // Production patterns
        if (currentHostname.includes('vercel.app')) {
            // Vercel pattern: frontend on vercel, backend on different service
            return process.env.REACT_APP_API_URL || `${currentProtocol}//api-${currentHostname}`;
        }

        if (currentHostname.includes('netlify.app')) {
            // Netlify pattern: often uses functions or external API
            return process.env.REACT_APP_API_URL || `${currentProtocol}//${currentHostname}/.netlify/functions`;
        }

        if (currentHostname.includes('appspot.com') || currentHostname.includes('run.app')) {
            // Google Cloud pattern: same domain, different service
            return `${currentProtocol}//api-${currentHostname}`;
        }

        // Custom domain - assume API is on same domain with /api prefix
        return `${currentProtocol}//${currentHostname}/api`;
    }

    // Get full API endpoint URL
    getAPIEndpoint(endpoint) {
        const baseURL = this.config.API_BASE_URL;
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
        
        // Handle different API patterns
        if (baseURL.endsWith('/api')) {
            return `${baseURL}/${cleanEndpoint}`;
        } else if (cleanEndpoint.startsWith('api/')) {
            return `${baseURL}/${cleanEndpoint}`;
        } else {
            return `${baseURL}/api/${cleanEndpoint}`;
        }
    }

    // Get configuration for debugging
    getDebugInfo() {
        return {
            environment: this.environment,
            config: this.config,
            detectedHostname: window.location.hostname,
            detectedPort: window.location.port,
            detectedProtocol: window.location.protocol,
            userAgent: navigator.userAgent,
            nodeEnv: process.env.NODE_ENV
        };
    }
}

// Create singleton instance
const urlConfig = new URLConfig();

// Export configuration
export const API_CONFIG = {
    BASE_URL: urlConfig.config.API_BASE_URL,
    FRONTEND_URL: urlConfig.config.FRONTEND_URL,
    ENVIRONMENT: urlConfig.config.ENVIRONMENT,
    IS_PRODUCTION: urlConfig.config.IS_PRODUCTION,
    
    // Helper methods
    getEndpoint: (endpoint) => urlConfig.getAPIEndpoint(endpoint),
    getDebugInfo: () => urlConfig.getDebugInfo()
};

// Export for debugging
export const DEBUG_URL_CONFIG = urlConfig.getDebugInfo();

// Console log for development debugging
if (!urlConfig.config.IS_PRODUCTION) {
    console.log('🔧 URL Configuration:', DEBUG_URL_CONFIG);
}

export default API_CONFIG;

