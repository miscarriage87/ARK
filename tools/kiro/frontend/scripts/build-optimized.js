#!/usr/bin/env node

/**
 * Optimized build script for ARK Digital Calendar
 * 
 * Generates critical CSS, optimized bundles, and performance reports.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting optimized build for ARK Digital Calendar...');

// Build configuration
const config = {
    srcDir: path.join(__dirname, '..', 'src'),
    publicDir: path.join(__dirname, '..', 'public'),
    distDir: path.join(__dirname, '..', 'dist'),
    criticalCssFile: path.join(__dirname, '..', 'src', 'css', 'critical.css'),
    mainCssFile: path.join(__dirname, '..', 'src', 'css', 'main.css'),
    outputCriticalCss: path.join(__dirname, '..', 'public', 'css', 'critical.css'),
    outputMainCss: path.join(__dirname, '..', 'public', 'css', 'main.css')
};

/**
 * Step 1: Build critical CSS
 */
function buildCriticalCSS() {
    console.log('📦 Building critical CSS...');
    
    try {
        // Copy critical CSS to public directory
        const criticalCss = fs.readFileSync(config.criticalCssFile, 'utf8');
        
        // Minify critical CSS (simple minification)
        const minifiedCritical = criticalCss
            .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
            .replace(/\s+/g, ' ') // Collapse whitespace
            .replace(/;\s*}/g, '}') // Remove unnecessary semicolons
            .replace(/\s*{\s*/g, '{') // Clean up braces
            .replace(/\s*}\s*/g, '}')
            .replace(/\s*,\s*/g, ',') // Clean up commas
            .replace(/\s*:\s*/g, ':') // Clean up colons
            .trim();
        
        fs.writeFileSync(config.outputCriticalCss, minifiedCritical);
        
        console.log(`✅ Critical CSS built: ${(minifiedCritical.length / 1024).toFixed(2)}KB`);
        
        return minifiedCritical;
    } catch (error) {
        console.error('❌ Error building critical CSS:', error);
        process.exit(1);
    }
}

/**
 * Step 2: Build main CSS with PostCSS
 */
function buildMainCSS() {
    console.log('🎨 Building main CSS...');
    
    try {
        execSync('npm run build:css', { stdio: 'inherit' });
        
        // Get file size
        const stats = fs.statSync(config.outputMainCss);
        console.log(`✅ Main CSS built: ${(stats.size / 1024).toFixed(2)}KB`);
    } catch (error) {
        console.error('❌ Error building main CSS:', error);
        process.exit(1);
    }
}

/**
 * Step 3: Build optimized JavaScript
 */
function buildOptimizedJS() {
    console.log('⚡ Building optimized JavaScript...');
    
    try {
        execSync('npm run build:js:optimized', { stdio: 'inherit' });
        
        // Get bundle sizes
        const jsDir = path.join(config.publicDir, 'js');
        const files = fs.readdirSync(jsDir).filter(file => file.endsWith('.js'));
        
        let totalSize = 0;
        files.forEach(file => {
            const filePath = path.join(jsDir, file);
            const stats = fs.statSync(filePath);
            totalSize += stats.size;
            console.log(`  📄 ${file}: ${(stats.size / 1024).toFixed(2)}KB`);
        });
        
        console.log(`✅ JavaScript built: ${(totalSize / 1024).toFixed(2)}KB total`);
    } catch (error) {
        console.error('❌ Error building JavaScript:', error);
        process.exit(1);
    }
}

/**
 * Step 4: Generate optimized HTML
 */
function generateOptimizedHTML() {
    console.log('📄 Generating optimized HTML...');
    
    try {
        const htmlPath = path.join(config.publicDir, 'index.html');
        let html = fs.readFileSync(htmlPath, 'utf8');
        
        // Read critical CSS
        const criticalCss = fs.readFileSync(config.outputCriticalCss, 'utf8');
        
        // Inline critical CSS
        html = html.replace(
            /<style>[\s\S]*?<\/style>/,
            `<style>${criticalCss}</style>`
        );
        
        // Add preload for main CSS
        html = html.replace(
            '<link rel="stylesheet" href="/css/main.css">',
            `<link rel="preload" href="/css/main.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
            <noscript><link rel="stylesheet" href="/css/main.css"></noscript>`
        );
        
        // Update script to use optimized bundle
        html = html.replace(
            'src="/js/app.js"',
            'src="/js/app.js"'
        );
        
        // Write optimized HTML
        const optimizedHtmlPath = path.join(config.publicDir, 'index-optimized.html');
        fs.writeFileSync(optimizedHtmlPath, html);
        
        console.log('✅ Optimized HTML generated');
    } catch (error) {
        console.error('❌ Error generating optimized HTML:', error);
        process.exit(1);
    }
}

/**
 * Step 5: Generate performance report
 */
function generatePerformanceReport() {
    console.log('📊 Generating performance report...');
    
    try {
        const report = {
            buildTime: new Date().toISOString(),
            assets: {},
            recommendations: []
        };
        
        // Analyze CSS files
        const criticalCssStats = fs.statSync(config.outputCriticalCss);
        const mainCssStats = fs.statSync(config.outputMainCss);
        
        report.assets.css = {
            critical: {
                size: criticalCssStats.size,
                sizeKB: (criticalCssStats.size / 1024).toFixed(2)
            },
            main: {
                size: mainCssStats.size,
                sizeKB: (mainCssStats.size / 1024).toFixed(2)
            }
        };
        
        // Analyze JS files
        const jsDir = path.join(config.publicDir, 'js');
        const jsFiles = fs.readdirSync(jsDir).filter(file => file.endsWith('.js'));
        
        report.assets.js = {};
        let totalJSSize = 0;
        
        jsFiles.forEach(file => {
            const filePath = path.join(jsDir, file);
            const stats = fs.statSync(filePath);
            totalJSSize += stats.size;
            
            report.assets.js[file] = {
                size: stats.size,
                sizeKB: (stats.size / 1024).toFixed(2)
            };
        });
        
        // Performance recommendations
        if (criticalCssStats.size > 14 * 1024) { // 14KB threshold
            report.recommendations.push('Critical CSS is larger than 14KB. Consider reducing above-the-fold styles.');
        }
        
        if (totalJSSize > 170 * 1024) { // 170KB threshold for mobile
            report.recommendations.push('JavaScript bundle is larger than 170KB. Consider code splitting.');
        }
        
        if (mainCssStats.size > 100 * 1024) { // 100KB threshold
            report.recommendations.push('Main CSS is larger than 100KB. Consider removing unused styles.');
        }
        
        // Calculate performance score
        let score = 100;
        if (criticalCssStats.size > 14 * 1024) score -= 10;
        if (totalJSSize > 170 * 1024) score -= 15;
        if (mainCssStats.size > 100 * 1024) score -= 10;
        
        report.performanceScore = Math.max(0, score);
        
        // Write report
        const reportPath = path.join(config.publicDir, 'performance-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log('✅ Performance report generated');
        console.log(`📊 Performance Score: ${report.performanceScore}/100`);
        
        if (report.recommendations.length > 0) {
            console.log('💡 Recommendations:');
            report.recommendations.forEach(rec => console.log(`  - ${rec}`));
        }
        
    } catch (error) {
        console.error('❌ Error generating performance report:', error);
    }
}

/**
 * Step 6: Validate build output
 */
function validateBuild() {
    console.log('🔍 Validating build output...');
    
    const requiredFiles = [
        'public/css/critical.css',
        'public/css/main.css',
        'public/index.html'
    ];
    
    // Check for JS files (may have hashes in production)
    const jsDir = path.join(__dirname, '..', 'public', 'js');
    const jsFiles = fs.readdirSync(jsDir).filter(file => file.endsWith('.js'));
    const hasAppJs = jsFiles.some(file => file.startsWith('app-') || file === 'app.js');
    
    let allValid = true;
    
    requiredFiles.forEach(file => {
        const filePath = path.join(__dirname, '..', file);
        if (!fs.existsSync(filePath)) {
            console.error(`❌ Missing required file: ${file}`);
            allValid = false;
        } else {
            console.log(`✅ ${file}`);
        }
    });
    
    if (!hasAppJs) {
        console.error(`❌ Missing required file: public/js/app.js (or app-*.js)`);
        allValid = false;
    } else {
        const appFile = jsFiles.find(file => file.startsWith('app-') || file === 'app.js');
        console.log(`✅ public/js/${appFile}`);
    }
    
    if (!allValid) {
        console.error('❌ Build validation failed');
        process.exit(1);
    }
    
    console.log('✅ Build validation passed');
}

/**
 * Main build process
 */
async function main() {
    const startTime = Date.now();
    
    try {
        // Run build steps
        buildCriticalCSS();
        buildMainCSS();
        buildOptimizedJS();
        generateOptimizedHTML();
        generatePerformanceReport();
        validateBuild();
        
        const buildTime = Date.now() - startTime;
        console.log(`🎉 Optimized build completed in ${buildTime}ms`);
        
        console.log('\n📋 Next steps:');
        console.log('  1. Test the optimized build locally');
        console.log('  2. Run lighthouse audit');
        console.log('  3. Deploy to production');
        
    } catch (error) {
        console.error('❌ Build failed:', error);
        process.exit(1);
    }
}

// Run the build
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main();
}

export {
    buildCriticalCSS,
    buildMainCSS,
    buildOptimizedJS,
    generateOptimizedHTML,
    generatePerformanceReport,
    validateBuild
};