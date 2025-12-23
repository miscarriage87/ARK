#!/usr/bin/env node

/**
 * ARK Diagnostic CLI
 * 
 * Command-line interface for running comprehensive diagnostics
 * on the KIRO Digital Calendar application.
 */

const DiagnosticEngine = require('./diagnostic-engine');
const path = require('path');

async function main() {
    console.log('🔍 ARK Digital Calendar - Diagnostic Engine');
    console.log('============================================\n');

    // Parse command line arguments
    const args = process.argv.slice(2);
    const options = {
        save: args.includes('--save') || args.includes('-s'),
        verbose: args.includes('--verbose') || args.includes('-v'),
        output: args.find(arg => arg.startsWith('--output='))?.split('=')[1] || 'diagnostic-report.json'
    };

    try {
        // Create diagnostic engine
        const diagnostic = new DiagnosticEngine({
            backendUrl: 'http://localhost:8000',
            frontendUrl: 'http://localhost:3000',
            timeout: 10000
        });

        // Run full diagnostic
        const report = await diagnostic.runFullDiagnostic();

        // Print report to console
        diagnostic.printReport(report);

        // Save report if requested
        if (options.save) {
            diagnostic.saveReport(report, options.output);
        }

        // Exit with appropriate code
        const exitCode = report.overallStatus === 'critical' ? 1 : 
                        report.overallStatus === 'issues' ? 2 : 0;
        
        console.log(`\n🏁 Diagnostic completed with status: ${report.overallStatus}`);
        console.log(`   Exit code: ${exitCode} (0=healthy, 1=critical, 2=issues)`);
        
        if (options.save) {
            console.log(`   Report saved to: ${options.output}`);
        }

        process.exit(exitCode);

    } catch (error) {
        console.error('\n❌ Diagnostic failed with error:');
        console.error(error.message);
        console.error('\nStack trace:');
        console.error(error.stack);
        process.exit(3);
    }
}

// Show help if requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
ARK Diagnostic Engine - Usage:

  node run-diagnostics.js [options]

Options:
  --save, -s              Save diagnostic report to file
  --output=<filename>     Specify output filename (default: diagnostic-report.json)
  --verbose, -v           Enable verbose output
  --help, -h              Show this help message

Exit Codes:
  0                       All systems healthy
  1                       Critical issues found
  2                       Non-critical issues found
  3                       Diagnostic engine error

Examples:
  node run-diagnostics.js                    # Run diagnostics and show results
  node run-diagnostics.js --save             # Run and save report
  node run-diagnostics.js --save --output=report.json  # Save with custom filename
`);
    process.exit(0);
}

// Run main function
main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(3);
});