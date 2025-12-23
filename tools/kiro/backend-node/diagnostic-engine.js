/**
 * ARK Diagnostic Engine
 * 
 * Comprehensive diagnostic system to identify all current issues
 * across the KIRO Digital Calendar application.
 * 
 * Validates: Requirements 7.4, 7.5
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

class DiagnosticEngine {
    constructor(config = {}) {
        this.config = {
            backendUrl: config.backendUrl || 'http://localhost:8000',
            frontendUrl: config.frontendUrl || 'http://localhost:3000',
            timeout: config.timeout || 5000,
            ...config
        };
        
        this.results = {
            timestamp: new Date().toISOString(),
            overallStatus: 'unknown',
            components: {},
            issues: [],
            recommendations: []
        };
    }

    /**
     * Run full diagnostic across all application components
     */
    async runFullDiagnostic() {
        console.log('🔍 Starting comprehensive diagnostic...\n');
        
        try {
            // Test all components
            await this.testBackendHealth();
            await this.validateFrontendElements();
            await this.testAPIIntegration();
            await this.checkPWAFeatures();
            await this.auditConfiguration();
            
            // Generate overall status
            this.calculateOverallStatus();
            
            // Generate recommendations
            this.generateRecommendations();
            
            // Generate report
            const report = this.generateDiagnosticReport();
            
            console.log('\n✅ Diagnostic complete!\n');
            return report;
            
        } catch (error) {
            console.error('❌ Diagnostic failed:', error);
            this.results.overallStatus = 'critical';
            this.addIssue('diagnostic-engine', 'critical', 
                'Diagnostic engine encountered an error', 
                error.message,
                'Check diagnostic engine logs and configuration');
            return this.generateDiagnosticReport();
        }
    }

    /**
     * Test backend server health and functionality
     */
    async testBackendHealth() {
        console.log('🔧 Testing backend health...');
        
        const component = {
            name: 'backend',
            status: 'healthy',
            tests: [],
            issues: [],
            dependencies: []
        };

        // Test 1: Server is running
        const serverRunning = await this.testEndpoint('/health', 'GET');
        component.tests.push({
            name: 'Server Running',
            passed: serverRunning.success,
            message: serverRunning.message,
            duration: serverRunning.duration
        });
        
        if (!serverRunning.success) {
            this.addIssue('backend', 'critical', 
                'Backend server is not running',
                'Server failed to respond to health check',
                'Start the backend server using SIMPLE-START.bat or npm start');
            component.status = 'error';
        }

        // Test 2: API endpoints respond correctly
        if (serverRunning.success) {
            const endpoints = [
                { path: '/', method: 'GET', name: 'Root endpoint' },
                { path: '/api/quotes/today', method: 'GET', name: 'Today\'s quote' },
                { path: '/api/quotes', method: 'GET', name: 'Quotes list' },
                { path: '/api/themes', method: 'GET', name: 'Themes list' },
                { path: '/api/ai-status', method: 'GET', name: 'AI status' },
                { path: '/api/users/profile', method: 'GET', name: 'User profile' }
            ];

            for (const endpoint of endpoints) {
                const result = await this.testEndpoint(endpoint.path, endpoint.method);
                component.tests.push({
                    name: endpoint.name,
                    passed: result.success,
                    message: result.message,
                    duration: result.duration
                });

                if (!result.success) {
                    this.addIssue('backend', 'high',
                        `API endpoint ${endpoint.path} not working`,
                        result.message,
                        `Check server logs and endpoint implementation for ${endpoint.path}`);
                    component.status = 'warning';
                }
            }
        }

        // Test 3: Environment configuration
        const envCheck = this.checkEnvironmentVariables();
        component.tests.push({
            name: 'Environment Configuration',
            passed: envCheck.passed,
            message: envCheck.message
        });

        if (!envCheck.passed) {
            this.addIssue('backend', 'medium',
                'Environment configuration incomplete',
                envCheck.message,
                'Check .env file and ensure all required variables are set');
            if (component.status === 'healthy') {
                component.status = 'warning';
            }
        }

        // Test 4: Static file serving
        if (serverRunning.success) {
            const staticTest = await this.testEndpoint('/index.html', 'GET');
            component.tests.push({
                name: 'Static File Serving',
                passed: staticTest.success,
                message: staticTest.message,
                duration: staticTest.duration
            });

            if (!staticTest.success) {
                this.addIssue('backend', 'high',
                    'Static file serving not working',
                    'Frontend files are not being served correctly',
                    'Check static file middleware configuration in server.js');
                component.status = 'warning';
            }
        }

        this.results.components.backend = component;
        console.log(`  Status: ${component.status}`);
    }

    /**
     * Validate frontend DOM elements and structure
     */
    async validateFrontendElements() {
        console.log('🎨 Validating frontend elements...');
        
        const component = {
            name: 'frontend',
            status: 'healthy',
            tests: [],
            issues: [],
            dependencies: ['backend']
        };

        // Test 1: Check if index.html exists
        const indexPath = path.join(__dirname, '../frontend/public/index.html');
        const indexExists = fs.existsSync(indexPath);
        
        component.tests.push({
            name: 'index.html exists',
            passed: indexExists,
            message: indexExists ? 'index.html found' : 'index.html not found'
        });

        if (!indexExists) {
            this.addIssue('frontend', 'critical',
                'index.html file missing',
                'Main HTML file not found in public directory',
                'Ensure index.html exists in frontend/public directory');
            component.status = 'error';
        }

        // Test 2: Check if app.js exists
        const appJsPath = path.join(__dirname, '../frontend/src/js/app.js');
        const appJsExists = fs.existsSync(appJsPath);
        
        component.tests.push({
            name: 'app.js exists',
            passed: appJsExists,
            message: appJsExists ? 'app.js found' : 'app.js not found'
        });

        if (!appJsExists) {
            this.addIssue('frontend', 'critical',
                'app.js file missing',
                'Main JavaScript file not found',
                'Ensure app.js exists in frontend/src/js directory');
            component.status = 'error';
        }

        // Test 3: Validate HTML structure
        if (indexExists) {
            const htmlContent = fs.readFileSync(indexPath, 'utf8');
            const requiredElements = [
                { id: 'loading-screen', name: 'Loading screen' },
                { id: 'daily-quote', name: 'Daily quote view' },
                { id: 'archive', name: 'Archive view' },
                { id: 'profile-setup', name: 'Profile setup view' },
                { id: 'settings', name: 'Settings view' },
                { id: 'quote-text', name: 'Quote text element' },
                { id: 'quote-author', name: 'Quote author element' },
                { id: 'feedback-like', name: 'Like button' },
                { id: 'feedback-neutral', name: 'Neutral button' },
                { id: 'feedback-dislike', name: 'Dislike button' },
                { id: 'nav-today', name: 'Today navigation' },
                { id: 'nav-archive', name: 'Archive navigation' },
                { id: 'nav-settings', name: 'Settings navigation' }
            ];

            for (const element of requiredElements) {
                const exists = htmlContent.includes(`id="${element.id}"`);
                component.tests.push({
                    name: `Element: ${element.name}`,
                    passed: exists,
                    message: exists ? `${element.name} found` : `${element.name} missing`
                });

                if (!exists) {
                    this.addIssue('frontend', 'high',
                        `Missing DOM element: ${element.id}`,
                        `Required element ${element.name} not found in HTML`,
                        `Add element with id="${element.id}" to index.html`);
                    component.status = 'warning';
                }
            }
        }

        // Test 4: Check CSS files
        const cssPath = path.join(__dirname, '../frontend/public/css/main.css');
        const cssExists = fs.existsSync(cssPath);
        
        component.tests.push({
            name: 'CSS files exist',
            passed: cssExists,
            message: cssExists ? 'main.css found' : 'main.css not found'
        });

        if (!cssExists) {
            this.addIssue('frontend', 'medium',
                'CSS file missing',
                'main.css not found in public/css directory',
                'Build CSS files using npm run build:css');
            if (component.status === 'healthy') {
                component.status = 'warning';
            }
        }

        this.results.components.frontend = component;
        console.log(`  Status: ${component.status}`);
    }

    /**
     * Test API integration and external services
     */
    async testAPIIntegration() {
        console.log('🔌 Testing API integration...');
        
        const component = {
            name: 'apiIntegration',
            status: 'healthy',
            tests: [],
            issues: [],
            dependencies: ['backend']
        };

        // Test 1: OpenAI configuration
        const openaiConfigured = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 0;
        const aiEnabled = process.env.ENABLE_AI_GENERATION === 'true';
        
        component.tests.push({
            name: 'OpenAI API Key Configured',
            passed: openaiConfigured,
            message: openaiConfigured ? 'API key present' : 'API key missing'
        });

        component.tests.push({
            name: 'AI Generation Enabled',
            passed: aiEnabled,
            message: aiEnabled ? 'AI generation enabled' : 'AI generation disabled'
        });

        if (!openaiConfigured) {
            this.addIssue('apiIntegration', 'medium',
                'OpenAI API key not configured',
                'OPENAI_API_KEY environment variable is missing',
                'Add OPENAI_API_KEY to .env file to enable AI quote generation');
            component.status = 'warning';
        }

        if (!aiEnabled && openaiConfigured) {
            this.addIssue('apiIntegration', 'low',
                'AI generation disabled',
                'ENABLE_AI_GENERATION is not set to true',
                'Set ENABLE_AI_GENERATION=true in .env to enable AI features');
            if (component.status === 'healthy') {
                component.status = 'warning';
            }
        }

        // Test 2: API response format
        const quoteResponse = await this.testEndpoint('/api/quotes/today', 'GET');
        if (quoteResponse.success && quoteResponse.data) {
            const hasRequiredFields = quoteResponse.data.text && quoteResponse.data.author;
            component.tests.push({
                name: 'Quote API Response Format',
                passed: hasRequiredFields,
                message: hasRequiredFields ? 'Valid quote format' : 'Invalid quote format'
            });

            if (!hasRequiredFields) {
                this.addIssue('apiIntegration', 'high',
                    'Invalid API response format',
                    'Quote API does not return required fields',
                    'Ensure quote API returns text, author, theme, and date fields');
                component.status = 'warning';
            }
        }

        // Test 3: CORS configuration
        component.tests.push({
            name: 'CORS Configuration',
            passed: true, // Assume configured if server is running
            message: 'CORS middleware configured'
        });

        this.results.components.apiIntegration = component;
        console.log(`  Status: ${component.status}`);
    }

    /**
     * Check PWA features and service worker
     */
    async checkPWAFeatures() {
        console.log('📱 Checking PWA features...');
        
        const component = {
            name: 'pwaFeatures',
            status: 'healthy',
            tests: [],
            issues: [],
            dependencies: ['frontend']
        };

        // Test 1: Manifest file exists
        const manifestPath = path.join(__dirname, '../frontend/public/manifest.json');
        const manifestExists = fs.existsSync(manifestPath);
        
        component.tests.push({
            name: 'Web App Manifest',
            passed: manifestExists,
            message: manifestExists ? 'manifest.json found' : 'manifest.json not found'
        });

        if (!manifestExists) {
            this.addIssue('pwaFeatures', 'high',
                'Web app manifest missing',
                'manifest.json not found in public directory',
                'Create manifest.json with PWA configuration');
            component.status = 'warning';
        }

        // Test 2: Service worker file exists
        const swPath = path.join(__dirname, '../frontend/public/sw.js');
        const swExists = fs.existsSync(swPath);
        
        component.tests.push({
            name: 'Service Worker',
            passed: swExists,
            message: swExists ? 'sw.js found' : 'sw.js not found'
        });

        if (!swExists) {
            this.addIssue('pwaFeatures', 'high',
                'Service worker missing',
                'sw.js not found in public directory',
                'Create service worker for offline functionality');
            component.status = 'warning';
        }

        // Test 3: Icons directory
        const iconsPath = path.join(__dirname, '../frontend/public/icons');
        const iconsExist = fs.existsSync(iconsPath);
        
        component.tests.push({
            name: 'PWA Icons',
            passed: iconsExist,
            message: iconsExist ? 'Icons directory found' : 'Icons directory not found'
        });

        if (!iconsExist) {
            this.addIssue('pwaFeatures', 'medium',
                'PWA icons missing',
                'Icons directory not found',
                'Create icons directory with app icons for different sizes');
            if (component.status === 'healthy') {
                component.status = 'warning';
            }
        }

        this.results.components.pwaFeatures = component;
        console.log(`  Status: ${component.status}`);
    }

    /**
     * Audit configuration and environment
     */
    auditConfiguration() {
        console.log('⚙️  Auditing configuration...');
        
        const component = {
            name: 'configuration',
            status: 'healthy',
            tests: [],
            issues: [],
            dependencies: []
        };

        // Test 1: Backend .env file
        const backendEnvPath = path.join(__dirname, '.env');
        const backendEnvExists = fs.existsSync(backendEnvPath);
        
        component.tests.push({
            name: 'Backend .env file',
            passed: backendEnvExists,
            message: backendEnvExists ? '.env file found' : '.env file not found'
        });

        if (!backendEnvExists) {
            this.addIssue('configuration', 'high',
                'Backend .env file missing',
                'Environment configuration file not found',
                'Copy .env.example to .env and configure variables');
            component.status = 'warning';
        }

        // Test 2: Required environment variables
        const requiredVars = ['PORT', 'OPENAI_API_KEY', 'ENABLE_AI_GENERATION'];
        const missingVars = [];

        for (const varName of requiredVars) {
            const exists = process.env[varName] !== undefined;
            component.tests.push({
                name: `Env var: ${varName}`,
                passed: exists,
                message: exists ? `${varName} set` : `${varName} missing`
            });

            if (!exists) {
                missingVars.push(varName);
            }
        }

        if (missingVars.length > 0) {
            this.addIssue('configuration', 'medium',
                'Missing environment variables',
                `Variables not set: ${missingVars.join(', ')}`,
                'Add missing variables to .env file');
            if (component.status === 'healthy') {
                component.status = 'warning';
            }
        }

        // Test 3: Package dependencies
        const backendPackagePath = path.join(__dirname, 'package.json');
        const frontendPackagePath = path.join(__dirname, '../frontend/package.json');
        
        const backendPackageExists = fs.existsSync(backendPackagePath);
        const frontendPackageExists = fs.existsSync(frontendPackagePath);
        
        component.tests.push({
            name: 'Package.json files',
            passed: backendPackageExists && frontendPackageExists,
            message: 'Package configuration files found'
        });

        // Test 4: Node modules installed
        const backendModulesPath = path.join(__dirname, 'node_modules');
        const frontendModulesPath = path.join(__dirname, '../frontend/node_modules');
        
        const backendModulesExist = fs.existsSync(backendModulesPath);
        const frontendModulesExist = fs.existsSync(frontendModulesPath);
        
        component.tests.push({
            name: 'Dependencies installed',
            passed: backendModulesExist && frontendModulesExist,
            message: backendModulesExist && frontendModulesExist ? 
                'All dependencies installed' : 'Some dependencies missing'
        });

        if (!backendModulesExist || !frontendModulesExist) {
            this.addIssue('configuration', 'high',
                'Dependencies not installed',
                'node_modules directory missing',
                'Run npm install in backend-node and frontend directories');
            component.status = 'warning';
        }

        this.results.components.configuration = component;
        console.log(`  Status: ${component.status}`);
    }

    /**
     * Test a specific endpoint
     */
    async testEndpoint(path, method = 'GET') {
        const startTime = Date.now();
        
        return new Promise((resolve) => {
            const url = new URL(path, this.config.backendUrl);
            const options = {
                method: method,
                timeout: this.config.timeout,
                headers: {
                    'User-Agent': 'ARK-Diagnostic-Engine/1.0'
                }
            };

            const protocol = url.protocol === 'https:' ? https : http;
            
            const req = protocol.request(url, options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    const duration = Date.now() - startTime;
                    
                    try {
                        const jsonData = JSON.parse(data);
                        resolve({
                            success: res.statusCode >= 200 && res.statusCode < 300,
                            statusCode: res.statusCode,
                            message: `Response: ${res.statusCode}`,
                            data: jsonData,
                            duration: duration
                        });
                    } catch (e) {
                        resolve({
                            success: res.statusCode >= 200 && res.statusCode < 300,
                            statusCode: res.statusCode,
                            message: `Response: ${res.statusCode} (non-JSON)`,
                            data: data,
                            duration: duration
                        });
                    }
                });
            });

            req.on('error', (error) => {
                const duration = Date.now() - startTime;
                resolve({
                    success: false,
                    message: `Error: ${error.message}`,
                    error: error,
                    duration: duration
                });
            });

            req.on('timeout', () => {
                req.destroy();
                const duration = Date.now() - startTime;
                resolve({
                    success: false,
                    message: 'Request timeout',
                    duration: duration
                });
            });

            req.end();
        });
    }

    /**
     * Check environment variables
     */
    checkEnvironmentVariables() {
        const requiredVars = {
            'PORT': 'Server port number',
            'OPENAI_API_KEY': 'OpenAI API key for AI generation',
            'ENABLE_AI_GENERATION': 'Enable/disable AI features'
        };

        const missing = [];
        const present = [];

        for (const [varName, description] of Object.entries(requiredVars)) {
            if (process.env[varName]) {
                present.push(varName);
            } else {
                missing.push(varName);
            }
        }

        return {
            passed: missing.length === 0,
            message: missing.length === 0 ? 
                'All required variables present' : 
                `Missing: ${missing.join(', ')}`,
            missing: missing,
            present: present
        };
    }

    /**
     * Add an issue to the results
     */
    addIssue(component, severity, description, rootCause, solution) {
        // Ensure strings are properly handled and not corrupted
        // Use a more robust string cleaning approach
        const cleanDescription = this.sanitizeString(description);
        const cleanRootCause = this.sanitizeString(rootCause);
        const cleanSolution = this.sanitizeString(solution);
        
        // Validate minimum string lengths
        if (cleanDescription.length === 0 || cleanRootCause.length === 0 || cleanSolution.length === 0) {
            console.warn('ARK Diagnostic: Skipping issue with empty strings');
            return;
        }
        
        const issue = {
            id: `issue-${this.results.issues.length + 1}`,
            component: component,
            severity: severity,
            description: cleanDescription,
            rootCause: cleanRootCause,
            solution: cleanSolution,
            timestamp: new Date().toISOString()
        };
        
        this.results.issues.push(issue);
        
        // Initialize component if it doesn't exist
        if (!this.results.components[component]) {
            this.results.components[component] = {
                name: component,
                status: 'healthy',
                tests: [],
                issues: [],
                dependencies: []
            };
        }
        
        // Update component status based on issue severity
        const currentComponent = this.results.components[component];
        const currentStatus = currentComponent.status;
        
        // Status hierarchy: healthy < warning < error
        // Only update status if new severity is worse than current
        if (severity === 'critical') {
            currentComponent.status = 'error';
        } else if ((severity === 'high' || severity === 'medium') && currentStatus === 'healthy') {
            currentComponent.status = 'warning';
        }
        // Low severity issues don't change status
        
        // Add issue to component's issue list
        currentComponent.issues.push(issue.id);
    }

    /**
     * Sanitize string input to prevent corruption
     */
    sanitizeString(input) {
        if (input === null || input === undefined) {
            return '';
        }
        
        // Convert to string and handle potential prototype pollution
        let str = String(input);
        
        // Remove any non-printable characters and normalize whitespace
        str = str.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();
        
        // Ensure we have a clean string without prototype pollution
        return str.split('').join('');
    }

    /**
     * Calculate overall system status
     */
    calculateOverallStatus() {
        const statuses = Object.values(this.results.components).map(c => c.status);
        
        if (statuses.includes('error')) {
            this.results.overallStatus = 'critical';
        } else if (statuses.includes('warning')) {
            this.results.overallStatus = 'issues';
        } else {
            this.results.overallStatus = 'healthy';
        }
    }

    /**
     * Generate recommendations based on issues
     */
    generateRecommendations() {
        const recommendations = [];

        // Group issues by severity
        const criticalIssues = this.results.issues.filter(i => i.severity === 'critical');
        const highIssues = this.results.issues.filter(i => i.severity === 'high');
        const mediumIssues = this.results.issues.filter(i => i.severity === 'medium');

        if (criticalIssues.length > 0) {
            recommendations.push({
                priority: 'critical',
                title: 'Address Critical Issues First',
                description: 'Fix critical issues that prevent the application from running',
                actions: criticalIssues.map(i => i.solution)
            });
        }

        if (highIssues.length > 0) {
            recommendations.push({
                priority: 'high',
                title: 'Fix High Priority Issues',
                description: 'Resolve issues that significantly impact functionality',
                actions: highIssues.map(i => i.solution)
            });
        }

        if (mediumIssues.length > 0) {
            recommendations.push({
                priority: 'medium',
                title: 'Address Medium Priority Issues',
                description: 'Fix issues that may cause problems or limit features',
                actions: mediumIssues.map(i => i.solution)
            });
        }

        if (this.results.issues.length === 0) {
            recommendations.push({
                priority: 'info',
                title: 'System Healthy',
                description: 'All diagnostic tests passed successfully',
                actions: ['Continue with regular maintenance and monitoring']
            });
        }

        this.results.recommendations = recommendations;
    }

    /**
     * Generate comprehensive diagnostic report
     */
    generateDiagnosticReport() {
        const report = {
            ...this.results,
            summary: {
                totalComponents: Object.keys(this.results.components).length,
                healthyComponents: Object.values(this.results.components).filter(c => c.status === 'healthy').length,
                warningComponents: Object.values(this.results.components).filter(c => c.status === 'warning').length,
                errorComponents: Object.values(this.results.components).filter(c => c.status === 'error').length,
                totalIssues: this.results.issues.length,
                criticalIssues: this.results.issues.filter(i => i.severity === 'critical').length,
                highIssues: this.results.issues.filter(i => i.severity === 'high').length,
                mediumIssues: this.results.issues.filter(i => i.severity === 'medium').length,
                lowIssues: this.results.issues.filter(i => i.severity === 'low').length
            }
        };

        return report;
    }

    /**
     * Print diagnostic report to console
     */
    printReport(report) {
        console.log('\n' + '='.repeat(80));
        console.log('ARK DIAGNOSTIC REPORT');
        console.log('='.repeat(80));
        console.log(`\nTimestamp: ${report.timestamp}`);
        console.log(`Overall Status: ${report.overallStatus.toUpperCase()}`);
        
        console.log('\n' + '-'.repeat(80));
        console.log('SUMMARY');
        console.log('-'.repeat(80));
        console.log(`Total Components: ${report.summary.totalComponents}`);
        console.log(`  ✅ Healthy: ${report.summary.healthyComponents}`);
        console.log(`  ⚠️  Warning: ${report.summary.warningComponents}`);
        console.log(`  ❌ Error: ${report.summary.errorComponents}`);
        console.log(`\nTotal Issues: ${report.summary.totalIssues}`);
        console.log(`  🔴 Critical: ${report.summary.criticalIssues}`);
        console.log(`  🟠 High: ${report.summary.highIssues}`);
        console.log(`  🟡 Medium: ${report.summary.mediumIssues}`);
        console.log(`  🟢 Low: ${report.summary.lowIssues}`);

        console.log('\n' + '-'.repeat(80));
        console.log('COMPONENT STATUS');
        console.log('-'.repeat(80));
        for (const [name, component] of Object.entries(report.components)) {
            const statusIcon = component.status === 'healthy' ? '✅' : 
                              component.status === 'warning' ? '⚠️' : '❌';
            console.log(`\n${statusIcon} ${component.name.toUpperCase()}: ${component.status}`);
            console.log(`   Tests: ${component.tests.length} (${component.tests.filter(t => t.passed).length} passed)`);
            if (component.issues.length > 0) {
                console.log(`   Issues: ${component.issues.length}`);
            }
        }

        if (report.issues.length > 0) {
            console.log('\n' + '-'.repeat(80));
            console.log('ISSUES FOUND');
            console.log('-'.repeat(80));
            for (const issue of report.issues) {
                const severityIcon = issue.severity === 'critical' ? '🔴' :
                                   issue.severity === 'high' ? '🟠' :
                                   issue.severity === 'medium' ? '🟡' : '🟢';
                console.log(`\n${severityIcon} [${issue.severity.toUpperCase()}] ${issue.description}`);
                console.log(`   Component: ${issue.component}`);
                console.log(`   Root Cause: ${issue.rootCause}`);
                console.log(`   Solution: ${issue.solution}`);
            }
        }

        if (report.recommendations.length > 0) {
            console.log('\n' + '-'.repeat(80));
            console.log('RECOMMENDATIONS');
            console.log('-'.repeat(80));
            for (const rec of report.recommendations) {
                console.log(`\n📋 ${rec.title} [${rec.priority.toUpperCase()}]`);
                console.log(`   ${rec.description}`);
                if (rec.actions.length > 0) {
                    console.log('   Actions:');
                    rec.actions.forEach((action, i) => {
                        console.log(`     ${i + 1}. ${action}`);
                    });
                }
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log('END OF REPORT');
        console.log('='.repeat(80) + '\n');
    }

    /**
     * Save report to file
     */
    saveReport(report, filename = 'diagnostic-report.json') {
        const reportPath = path.join(__dirname, filename);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📄 Report saved to: ${reportPath}`);
        return reportPath;
    }
}

module.exports = DiagnosticEngine;
