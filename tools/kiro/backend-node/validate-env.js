#!/usr/bin/env node

/**
 * Environment Variable Validation Script
 * Validates that all required environment variables are loaded correctly
 * Uses the new ConfigManager for comprehensive validation
 */

const { configManager } = require('./config-manager');

console.log('🔍 Validating Environment Variables...\n');

try {
    // Load and validate configuration
    const result = configManager.loadConfiguration();
    
    if (!result.success) {
        console.log('❌ Configuration loading FAILED');
        result.errors.forEach(error => {
            const icon = error.type === 'critical' ? '❌' : error.type === 'warning' ? '⚠️' : 'ℹ️';
            console.log(`  ${icon} ${error.message} (${error.code})`);
        });
        process.exit(1);
    }

    // Display configuration summary
    const summary = configManager.getSummary();
    
    console.log('📋 Configuration Summary:');
    console.log(`  🚀 Server: Port ${summary.server.port}, Environment: ${summary.server.nodeEnv}`);
    console.log(`  🤖 OpenAI: ${summary.openai.enabled ? 'Enabled' : 'Disabled'}, Model: ${summary.openai.model}`);
    console.log(`  🔑 API Key: ${summary.openai.hasApiKey ? 'Configured' : 'Missing'}`);
    
    console.log('\n🎯 Feature Flags:');
    Object.entries(summary.features).forEach(([feature, enabled]) => {
        const icon = enabled ? '✅' : '❌';
        console.log(`  ${icon} ${feature}: ${enabled ? 'Enabled' : 'Disabled'}`);
    });

    // Display validation results
    console.log('\n🔧 Validation Results:');
    
    if (summary.errors.critical > 0) {
        console.log(`  ❌ Critical Errors: ${summary.errors.critical}`);
    }
    
    if (summary.errors.warnings > 0) {
        console.log(`  ⚠️  Warnings: ${summary.errors.warnings}`);
    }
    
    if (summary.errors.info > 0) {
        console.log(`  ℹ️  Info Messages: ${summary.errors.info}`);
    }

    // Display detailed errors if any
    if (summary.validationErrors.length > 0) {
        console.log('\n📝 Detailed Validation Messages:');
        summary.validationErrors.forEach(error => {
            const icon = error.type === 'critical' ? '❌' : error.type === 'warning' ? '⚠️' : 'ℹ️';
            console.log(`  ${icon} ${error.message} (${error.code})`);
        });
    }

    console.log('\n' + '='.repeat(50));

    if (summary.status === 'invalid') {
        console.log('❌ Environment validation FAILED');
        console.log('Critical configuration errors must be resolved before starting the application.');
        process.exit(1);
    } else {
        console.log('✅ Environment validation PASSED');
        if (summary.errors.warnings > 0 || summary.errors.info > 0) {
            console.log('Configuration is valid but has warnings or info messages above.');
        } else {
            console.log('All configuration is properly set and validated.');
        }
        process.exit(0);
    }

} catch (error) {
    console.error('❌ Fatal error during validation:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
}