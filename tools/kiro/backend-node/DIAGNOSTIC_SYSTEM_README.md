# ARK Diagnostic System

## Overview

The ARK Diagnostic System is a comprehensive diagnostic engine designed to identify and report issues across all components of the KIRO Digital Calendar application. It provides automated testing, detailed error reporting, and actionable recommendations for fixing identified problems.

## Components

### 1. DiagnosticEngine (`diagnostic-engine.js`)

The core diagnostic engine that performs comprehensive system health checks across:

- **Backend Server**: Tests server startup, API endpoints, environment configuration, and static file serving
- **Frontend Application**: Validates DOM elements, file structure, and CSS resources
- **API Integration**: Checks OpenAI configuration, API response formats, and CORS setup
- **PWA Features**: Verifies manifest files, service workers, and app icons
- **Configuration**: Audits environment variables, package dependencies, and file structure

### 2. CLI Interface (`run-diagnostics.js`)

Command-line interface for running diagnostics with options for:
- Saving reports to files
- Verbose output
- Custom output filenames
- Exit codes indicating system health status

### 3. Property-Based Tests (`diagnostic-engine.test.js`)

Comprehensive test suite using fast-check for property-based testing that validates:
- **Property 9: Comprehensive Error Handling** - Ensures all error conditions are properly logged with detailed information and recovery options
- Error handling across all severity levels (critical, high, medium, low)
- Component status transitions and overall system status calculation
- Diagnostic report structure integrity
- Recommendation generation based on issue severity

## Features

### Automated Issue Detection

The diagnostic engine automatically identifies:
- Server connectivity issues
- Missing configuration files
- Environment variable problems
- API endpoint failures
- Missing frontend resources
- PWA configuration issues

### Detailed Error Reporting

Each identified issue includes:
- **Component**: Which part of the system is affected
- **Severity**: Critical, High, Medium, or Low priority
- **Description**: Clear explanation of the problem
- **Root Cause**: Technical details about why the issue occurred
- **Solution**: Actionable steps to fix the problem
- **Timestamp**: When the issue was detected

### Intelligent Recommendations

The system generates prioritized recommendations:
- Critical issues that prevent application startup
- High priority issues that break major functionality
- Medium priority issues that limit features
- Low priority issues for optimization

### Comprehensive Reporting

Diagnostic reports include:
- Overall system health status
- Component-by-component breakdown
- Issue summary with counts by severity
- Detailed test results for each component
- Actionable recommendations with step-by-step solutions

## Usage

### Basic Diagnostic Run

```bash
node run-diagnostics.js
```

### Save Report to File

```bash
node run-diagnostics.js --save
```

### Custom Output File

```bash
node run-diagnostics.js --save --output=my-report.json
```

### Using npm Scripts

```bash
npm run diagnostics
```

## Exit Codes

- `0`: All systems healthy
- `1`: Critical issues found (application cannot run)
- `2`: Non-critical issues found (some features may be limited)
- `3`: Diagnostic engine error

## Example Output

```
ARK DIAGNOSTIC REPORT
================================================================================

Timestamp: 2025-12-21T19:33:56.668Z
Overall Status: ISSUES

SUMMARY
--------------------------------------------------------------------------------
Total Components: 5
  ✅ Healthy: 2
  ⚠️  Warning: 3
  ❌ Error: 0

Total Issues: 3
  🔴 Critical: 0
  🟠 High: 0
  🟡 Medium: 3
  🟢 Low: 0

ISSUES FOUND
--------------------------------------------------------------------------------

🟡 [MEDIUM] Environment configuration incomplete
   Component: backend
   Root Cause: Missing: PORT, OPENAI_API_KEY, ENABLE_AI_GENERATION
   Solution: Check .env file and ensure all required variables are set
```

## Integration with Repair Process

The diagnostic system is designed to be the first step in the comprehensive repair process:

1. **Diagnostic Phase**: Identify all current issues
2. **Prioritization**: Sort issues by severity and dependencies
3. **Repair Planning**: Generate step-by-step repair recommendations
4. **Validation**: Re-run diagnostics after each repair to verify fixes

## Property-Based Testing

The diagnostic engine includes comprehensive property-based tests that validate:

- **Error Handling Properties**: All errors are properly logged with required fields, timestamps, and recovery options
- **Component Status Logic**: Status transitions work correctly when issues are added
- **Report Structure**: Diagnostic reports maintain consistent structure regardless of input
- **Recommendation Generation**: Appropriate recommendations are generated based on issue severity
- **Data Integrity**: All diagnostic data is preserved accurately throughout the process

The property-based tests run 100 iterations per property to ensure robust validation across a wide range of inputs and edge cases.

## Requirements Validation

This diagnostic system validates the following requirements:

- **Requirement 7.4**: Provides diagnostic endpoints and status information for debugging
- **Requirement 7.5**: Identifies missing dependencies and provides clear error reporting
- **Requirement 7.1**: Logs detailed error information for frontend issues
- **Requirement 7.3**: Displays user-friendly error messages and recovery options

## Future Enhancements

Potential improvements for the diagnostic system:

1. **Real-time Monitoring**: Continuous health monitoring with alerts
2. **Performance Metrics**: Response time and resource usage analysis
3. **Dependency Mapping**: Visual representation of component dependencies
4. **Automated Repair**: Self-healing capabilities for common issues
5. **Integration Testing**: End-to-end workflow validation
6. **Historical Tracking**: Trend analysis of system health over time

## Files Created

- `diagnostic-engine.js` - Core diagnostic engine implementation
- `run-diagnostics.js` - CLI interface for running diagnostics
- `diagnostic-engine.test.js` - Property-based test suite
- `package.json` - Updated with testing dependencies and scripts
- `DIAGNOSTIC_SYSTEM_README.md` - This documentation file

The diagnostic system provides a solid foundation for identifying and resolving issues across the entire KIRO Digital Calendar application stack.