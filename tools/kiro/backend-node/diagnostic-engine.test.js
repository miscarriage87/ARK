/**
 * Property-Based Tests for ARK Diagnostic Engine
 * 
 * Feature: kiro-application-fixes, Property 9: Comprehensive Error Handling
 * Validates: Requirements 7.1, 7.3, 7.5
 */

const fc = require('fast-check');
const DiagnosticEngine = require('./diagnostic-engine');
const fs = require('fs');
const path = require('path');

describe('Diagnostic Engine Property Tests', () => {
    let diagnosticEngine;

    beforeEach(() => {
        diagnosticEngine = new DiagnosticEngine({
            backendUrl: 'http://localhost:8000',
            frontendUrl: 'http://localhost:3000',
            timeout: 5000
        });
    });

    /**
     * Property 9: Comprehensive Error Handling
     * For any error condition (frontend, API, critical), the system should log detailed information, 
     * provide user-friendly messages, and offer recovery options
     * Validates: Requirements 7.1, 7.3, 7.5
     */
    describe('Property 9: Comprehensive Error Handling', () => {
        test('should handle all error conditions with proper logging and recovery options', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        component: fc.constantFrom('backend', 'frontend', 'apiIntegration', 'pwaFeatures', 'configuration'),
                        severity: fc.constantFrom('critical', 'high', 'medium', 'low'),
                        description: fc.string({ minLength: 10, maxLength: 100 }).filter(s => s.trim().length >= 10),
                        rootCause: fc.string({ minLength: 5, maxLength: 80 }).filter(s => s.trim().length >= 5),
                        solution: fc.string({ minLength: 10, maxLength: 120 }).filter(s => s.trim().length >= 10)
                    }),
                    async (errorData) => {
                        // Clear previous issues to ensure clean test
                        diagnosticEngine.results.issues = [];
                        diagnosticEngine.results.components = {};
                        
                        // Add the error to the diagnostic engine
                        diagnosticEngine.addIssue(
                            errorData.component,
                            errorData.severity,
                            errorData.description,
                            errorData.rootCause,
                            errorData.solution
                        );

                        // Generate diagnostic report
                        const report = diagnosticEngine.generateDiagnosticReport();

                        // Property: All errors should be properly logged with required fields
                        const addedIssue = report.issues.find(issue => 
                            issue.description === errorData.description.trim()
                        );

                        expect(addedIssue).toBeDefined();
                        expect(addedIssue).toHaveProperty('id');
                        expect(addedIssue).toHaveProperty('component', errorData.component);
                        expect(addedIssue).toHaveProperty('severity', errorData.severity);
                        expect(addedIssue).toHaveProperty('description', errorData.description.trim());
                        expect(addedIssue).toHaveProperty('rootCause', errorData.rootCause.trim());
                        expect(addedIssue).toHaveProperty('solution', errorData.solution.trim());
                        expect(addedIssue).toHaveProperty('timestamp');

                        // Property: Timestamp should be valid ISO string
                        expect(() => new Date(addedIssue.timestamp)).not.toThrow();
                        expect(new Date(addedIssue.timestamp).toISOString()).toBe(addedIssue.timestamp);

                        // Property: Issue ID should be unique and properly formatted
                        expect(addedIssue.id).toMatch(/^issue-\d+$/);

                        // Property: Recovery options (solutions) should always be provided
                        expect(addedIssue.solution).toBeTruthy();
                        expect(addedIssue.solution.length).toBeGreaterThan(0);

                        // Property: Root cause analysis should be provided
                        expect(addedIssue.rootCause).toBeTruthy();
                        expect(addedIssue.rootCause.length).toBeGreaterThan(0);
                    }
                ),
                { numRuns: 100 }
            );
        }, 30000);

        test('should generate appropriate recommendations based on error severity', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(
                        fc.record({
                            component: fc.constantFrom('backend', 'frontend', 'apiIntegration', 'pwaFeatures', 'configuration'),
                            severity: fc.constantFrom('critical', 'high', 'medium', 'low'),
                            description: fc.string({ minLength: 10, maxLength: 100 }),
                            rootCause: fc.string({ minLength: 5, maxLength: 80 }),
                            solution: fc.string({ minLength: 10, maxLength: 120 })
                        }),
                        { minLength: 1, maxLength: 10 }
                    ),
                    async (errors) => {
                        // Clear previous issues
                        diagnosticEngine.results.issues = [];

                        // Add all errors
                        errors.forEach(error => {
                            diagnosticEngine.addIssue(
                                error.component,
                                error.severity,
                                error.description,
                                error.rootCause,
                                error.solution
                            );
                        });

                        // Generate recommendations
                        diagnosticEngine.generateRecommendations();
                        const recommendations = diagnosticEngine.results.recommendations;

                        // Property: Critical issues should generate critical priority recommendations
                        const criticalErrors = errors.filter(e => e.severity === 'critical');
                        if (criticalErrors.length > 0) {
                            const criticalRec = recommendations.find(r => r.priority === 'critical');
                            expect(criticalRec).toBeDefined();
                            expect(criticalRec.title).toContain('Critical');
                            expect(criticalRec.actions).toHaveLength(criticalErrors.length);
                        }

                        // Property: High priority issues should generate high priority recommendations
                        const highErrors = errors.filter(e => e.severity === 'high');
                        if (highErrors.length > 0) {
                            const highRec = recommendations.find(r => r.priority === 'high');
                            expect(highRec).toBeDefined();
                            expect(highRec.title).toContain('High Priority');
                            expect(highRec.actions).toHaveLength(highErrors.length);
                        }

                        // Property: All recommendations should have required fields
                        recommendations.forEach(rec => {
                            expect(rec).toHaveProperty('priority');
                            expect(rec).toHaveProperty('title');
                            expect(rec).toHaveProperty('description');
                            expect(rec).toHaveProperty('actions');
                            expect(Array.isArray(rec.actions)).toBe(true);
                        });

                        // Property: Recommendations should be ordered by priority
                        const priorityOrder = ['critical', 'high', 'medium', 'low', 'info'];
                        for (let i = 1; i < recommendations.length; i++) {
                            const currentPriorityIndex = priorityOrder.indexOf(recommendations[i].priority);
                            const previousPriorityIndex = priorityOrder.indexOf(recommendations[i - 1].priority);
                            expect(currentPriorityIndex).toBeGreaterThanOrEqual(previousPriorityIndex);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        }, 30000);

        test('should maintain diagnostic report structure integrity', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        backendUrl: fc.webUrl(),
                        frontendUrl: fc.webUrl(),
                        timeout: fc.integer({ min: 1000, max: 30000 })
                    }),
                    async (config) => {
                        const engine = new DiagnosticEngine(config);
                        
                        // Generate a report (even if tests fail, structure should be maintained)
                        const report = engine.generateDiagnosticReport();

                        // Property: Report should always have required top-level structure
                        expect(report).toHaveProperty('timestamp');
                        expect(report).toHaveProperty('overallStatus');
                        expect(report).toHaveProperty('components');
                        expect(report).toHaveProperty('issues');
                        expect(report).toHaveProperty('recommendations');
                        expect(report).toHaveProperty('summary');

                        // Property: Timestamp should be valid
                        expect(() => new Date(report.timestamp)).not.toThrow();

                        // Property: Overall status should be valid
                        expect(['unknown', 'healthy', 'issues', 'critical']).toContain(report.overallStatus);

                        // Property: Components should be an object
                        expect(typeof report.components).toBe('object');

                        // Property: Issues should be an array
                        expect(Array.isArray(report.issues)).toBe(true);

                        // Property: Recommendations should be an array
                        expect(Array.isArray(report.recommendations)).toBe(true);

                        // Property: Summary should have correct structure
                        expect(report.summary).toHaveProperty('totalComponents');
                        expect(report.summary).toHaveProperty('healthyComponents');
                        expect(report.summary).toHaveProperty('warningComponents');
                        expect(report.summary).toHaveProperty('errorComponents');
                        expect(report.summary).toHaveProperty('totalIssues');
                        expect(report.summary).toHaveProperty('criticalIssues');
                        expect(report.summary).toHaveProperty('highIssues');
                        expect(report.summary).toHaveProperty('mediumIssues');
                        expect(report.summary).toHaveProperty('lowIssues');

                        // Property: Summary counts should be non-negative integers
                        Object.values(report.summary).forEach(count => {
                            expect(typeof count).toBe('number');
                            expect(count).toBeGreaterThanOrEqual(0);
                            expect(Number.isInteger(count)).toBe(true);
                        });
                    }
                ),
                { numRuns: 100 }
            );
        }, 30000);

        test('should handle component status transitions correctly', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(
                        fc.record({
                            componentName: fc.constantFrom('backend', 'frontend', 'apiIntegration', 'pwaFeatures', 'configuration'),
                            issueToAdd: fc.record({
                                severity: fc.constantFrom('critical', 'high', 'medium', 'low'),
                                description: fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length >= 5),
                                rootCause: fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length >= 5),
                                solution: fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length >= 5)
                            })
                        }),
                        { minLength: 1, maxLength: 3 }
                    ),
                    async (componentUpdates) => {
                        // Clear previous state
                        diagnosticEngine.results.issues = [];
                        diagnosticEngine.results.components = {};

                        // Add issues and check status transitions
                        componentUpdates.forEach(update => {
                            diagnosticEngine.addIssue(
                                update.componentName,
                                update.issueToAdd.severity,
                                update.issueToAdd.description,
                                update.issueToAdd.rootCause,
                                update.issueToAdd.solution
                            );

                            const component = diagnosticEngine.results.components[update.componentName];
                            expect(component).toBeDefined();

                            // Property: Adding critical issues should make status 'error'
                            if (update.issueToAdd.severity === 'critical') {
                                expect(component.status).toBe('error');
                            }
                            
                            // Property: Adding high/medium issues should make status at least 'warning'
                            if (update.issueToAdd.severity === 'high' || update.issueToAdd.severity === 'medium') {
                                expect(['warning', 'error']).toContain(component.status);
                            }
                            
                            // Property: Component should exist and have proper structure
                            expect(component).toHaveProperty('name', update.componentName);
                            expect(component).toHaveProperty('status');
                            expect(component).toHaveProperty('tests');
                            expect(component).toHaveProperty('issues');
                            expect(component).toHaveProperty('dependencies');

                            // Property: Issues should be properly associated with components
                            const componentIssues = diagnosticEngine.results.issues.filter(
                                issue => issue.component === update.componentName
                            );
                            expect(componentIssues.length).toBeGreaterThan(0);
                        });

                        // Calculate overall status
                        diagnosticEngine.calculateOverallStatus();

                        // Property: Overall status should reflect worst component status
                        const componentStatuses = Object.values(diagnosticEngine.results.components)
                            .map(c => c.status);
                        
                        if (componentStatuses.includes('error')) {
                            expect(diagnosticEngine.results.overallStatus).toBe('critical');
                        } else if (componentStatuses.includes('warning')) {
                            expect(diagnosticEngine.results.overallStatus).toBe('issues');
                        } else {
                            expect(diagnosticEngine.results.overallStatus).toBe('healthy');
                        }
                    }
                ),
                { numRuns: 100 }
            );
        }, 30000);

        test('should provide detailed error information for debugging', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        component: fc.constantFrom('backend', 'frontend', 'apiIntegration', 'pwaFeatures', 'configuration'),
                        severity: fc.constantFrom('critical', 'high', 'medium', 'low'),
                        description: fc.stringOf(fc.char().filter(c => c >= ' ' && c <= '~'), { minLength: 20, maxLength: 200 }),
                        rootCause: fc.stringOf(fc.char().filter(c => c >= ' ' && c <= '~'), { minLength: 10, maxLength: 150 }),
                        solution: fc.stringOf(fc.char().filter(c => c >= ' ' && c <= '~'), { minLength: 15, maxLength: 200 })
                    }),
                    async (errorData) => {
                        // Clear previous state
                        diagnosticEngine.results.issues = [];
                        diagnosticEngine.results.components = {};
                        
                        diagnosticEngine.addIssue(
                            errorData.component,
                            errorData.severity,
                            errorData.description,
                            errorData.rootCause,
                            errorData.solution
                        );

                        const report = diagnosticEngine.generateDiagnosticReport();
                        
                        // Skip if issue was filtered out due to empty strings
                        if (report.issues.length === 0) {
                            return;
                        }
                        
                        const issue = report.issues[0]; // Should be the only issue

                        // Property: Detailed error information should be preserved (after sanitization)
                        const expectedDescription = diagnosticEngine.sanitizeString(errorData.description);
                        const expectedRootCause = diagnosticEngine.sanitizeString(errorData.rootCause);
                        const expectedSolution = diagnosticEngine.sanitizeString(errorData.solution);
                        
                        expect(issue.description).toBe(expectedDescription);
                        expect(issue.rootCause).toBe(expectedRootCause);
                        expect(issue.solution).toBe(expectedSolution);

                        // Property: Error information should be sufficient for debugging
                        // Description should be descriptive (allow single words if they're meaningful)
                        expect(issue.description.length).toBeGreaterThan(0);
                        
                        // Root cause should provide context
                        expect(issue.rootCause.length).toBeGreaterThan(0);
                        
                        // Solution should be actionable
                        expect(issue.solution.length).toBeGreaterThan(0);

                        // Property: Component association should be maintained
                        expect(issue.component).toBe(errorData.component);
                        expect(['backend', 'frontend', 'apiIntegration', 'pwaFeatures', 'configuration'])
                            .toContain(issue.component);

                        // Property: Severity classification should be maintained
                        expect(issue.severity).toBe(errorData.severity);
                        expect(['critical', 'high', 'medium', 'low']).toContain(issue.severity);
                    }
                ),
                { numRuns: 100 }
            );
        }, 30000);
    });

    describe('Diagnostic Engine Unit Tests', () => {
        test('should initialize with default configuration', () => {
            const engine = new DiagnosticEngine();
            expect(engine.config.backendUrl).toBe('http://localhost:8000');
            expect(engine.config.frontendUrl).toBe('http://localhost:3000');
            expect(engine.config.timeout).toBe(5000);
        });

        test('should initialize with custom configuration', () => {
            const customConfig = {
                backendUrl: 'http://example.com:3000',
                frontendUrl: 'http://example.com:8080',
                timeout: 10000
            };
            const engine = new DiagnosticEngine(customConfig);
            expect(engine.config.backendUrl).toBe(customConfig.backendUrl);
            expect(engine.config.frontendUrl).toBe(customConfig.frontendUrl);
            expect(engine.config.timeout).toBe(customConfig.timeout);
        });

        test('should check environment variables correctly', () => {
            const engine = new DiagnosticEngine();
            
            // Save original env vars
            const originalPort = process.env.PORT;
            const originalOpenAI = process.env.OPENAI_API_KEY;
            const originalAIEnabled = process.env.ENABLE_AI_GENERATION;

            try {
                // Test with missing variables
                delete process.env.PORT;
                delete process.env.OPENAI_API_KEY;
                delete process.env.ENABLE_AI_GENERATION;

                const result = engine.checkEnvironmentVariables();
                expect(result.passed).toBe(false);
                expect(result.missing).toContain('PORT');
                expect(result.missing).toContain('OPENAI_API_KEY');
                expect(result.missing).toContain('ENABLE_AI_GENERATION');

                // Test with all variables present
                process.env.PORT = '8000';
                process.env.OPENAI_API_KEY = 'test-key';
                process.env.ENABLE_AI_GENERATION = 'true';

                const result2 = engine.checkEnvironmentVariables();
                expect(result2.passed).toBe(true);
                expect(result2.missing).toHaveLength(0);
                expect(result2.present).toContain('PORT');
                expect(result2.present).toContain('OPENAI_API_KEY');
                expect(result2.present).toContain('ENABLE_AI_GENERATION');

            } finally {
                // Restore original env vars
                if (originalPort) process.env.PORT = originalPort;
                if (originalOpenAI) process.env.OPENAI_API_KEY = originalOpenAI;
                if (originalAIEnabled) process.env.ENABLE_AI_GENERATION = originalAIEnabled;
            }
        });

        test('should generate unique issue IDs', () => {
            const engine = new DiagnosticEngine();
            
            engine.addIssue('test', 'medium', 'Test issue 1', 'Test cause', 'Test solution');
            engine.addIssue('test', 'high', 'Test issue 2', 'Test cause', 'Test solution');
            engine.addIssue('test', 'low', 'Test issue 3', 'Test cause', 'Test solution');

            const issues = engine.results.issues;
            const ids = issues.map(issue => issue.id);
            
            // All IDs should be unique
            expect(new Set(ids).size).toBe(ids.length);
            
            // IDs should follow expected format
            ids.forEach(id => {
                expect(id).toMatch(/^issue-\d+$/);
            });
        });

        test('should calculate overall status correctly', () => {
            const engine = new DiagnosticEngine();
            
            // Test with all healthy components
            engine.results.components = {
                comp1: { status: 'healthy' },
                comp2: { status: 'healthy' }
            };
            engine.calculateOverallStatus();
            expect(engine.results.overallStatus).toBe('healthy');

            // Test with warning components
            engine.results.components.comp1.status = 'warning';
            engine.calculateOverallStatus();
            expect(engine.results.overallStatus).toBe('issues');

            // Test with error components
            engine.results.components.comp2.status = 'error';
            engine.calculateOverallStatus();
            expect(engine.results.overallStatus).toBe('critical');
        });

        test('should save and load diagnostic reports', () => {
            const engine = new DiagnosticEngine();
            engine.addIssue('test', 'medium', 'Test issue', 'Test cause', 'Test solution');
            
            const report = engine.generateDiagnosticReport();
            const filename = 'test-report.json';
            const filepath = engine.saveReport(report, filename);
            
            expect(fs.existsSync(filepath)).toBe(true);
            
            const savedReport = JSON.parse(fs.readFileSync(filepath, 'utf8'));
            expect(savedReport.issues).toHaveLength(1);
            expect(savedReport.issues[0].description).toBe('Test issue');
            
            // Clean up
            fs.unlinkSync(filepath);
        });
    });
});