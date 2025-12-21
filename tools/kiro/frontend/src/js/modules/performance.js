/**
 * Performance monitoring module for ARK Digital Calendar
 * 
 * Measures and tracks application performance metrics.
 */

/**
 * Performance metrics collector
 */
export class PerformanceMonitor {
    constructor() {
        this.metrics = {};
        this.observers = [];
        this.isSupported = 'performance' in window;
        
        if (this.isSupported) {
            this.initializeObservers();
        }
    }

    /**
     * Initialize performance observers
     */
    initializeObservers() {
        // Observe navigation timing
        if ('PerformanceObserver' in window) {
            try {
                // Observe navigation entries
                const navObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        this.recordNavigationMetrics(entry);
                    }
                });
                navObserver.observe({ entryTypes: ['navigation'] });
                this.observers.push(navObserver);

                // Observe paint timing
                const paintObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        this.recordPaintMetrics(entry);
                    }
                });
                paintObserver.observe({ entryTypes: ['paint'] });
                this.observers.push(paintObserver);

                // Observe largest contentful paint
                const lcpObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        this.recordLCPMetrics(entry);
                    }
                });
                lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
                this.observers.push(lcpObserver);

                // Observe layout shifts
                const clsObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        this.recordCLSMetrics(entry);
                    }
                });
                clsObserver.observe({ entryTypes: ['layout-shift'] });
                this.observers.push(clsObserver);

            } catch (error) {
                console.warn('ARK: Performance observers not fully supported:', error);
            }
        }
    }

    /**
     * Record navigation timing metrics
     */
    recordNavigationMetrics(entry) {
        this.metrics.navigation = {
            // DNS lookup time
            dnsLookup: entry.domainLookupEnd - entry.domainLookupStart,
            
            // TCP connection time
            tcpConnection: entry.connectEnd - entry.connectStart,
            
            // Request/response time
            requestResponse: entry.responseEnd - entry.requestStart,
            
            // DOM processing time
            domProcessing: entry.domContentLoadedEventEnd - entry.responseEnd,
            
            // Total load time
            totalLoad: entry.loadEventEnd - entry.navigationStart,
            
            // Time to Interactive (approximation)
            timeToInteractive: entry.domContentLoadedEventEnd - entry.navigationStart,
            
            // First Byte
            timeToFirstByte: entry.responseStart - entry.navigationStart
        };

        console.log('ARK Performance - Navigation:', this.metrics.navigation);
    }

    /**
     * Record paint timing metrics
     */
    recordPaintMetrics(entry) {
        if (!this.metrics.paint) {
            this.metrics.paint = {};
        }

        this.metrics.paint[entry.name] = {
            startTime: entry.startTime,
            duration: entry.duration
        };

        if (entry.name === 'first-contentful-paint') {
            console.log(`ARK Performance - First Contentful Paint: ${entry.startTime.toFixed(2)}ms`);
        }
    }

    /**
     * Record Largest Contentful Paint metrics
     */
    recordLCPMetrics(entry) {
        this.metrics.largestContentfulPaint = {
            startTime: entry.startTime,
            size: entry.size,
            element: entry.element?.tagName || 'unknown'
        };

        console.log(`ARK Performance - Largest Contentful Paint: ${entry.startTime.toFixed(2)}ms`);
    }

    /**
     * Record Cumulative Layout Shift metrics
     */
    recordCLSMetrics(entry) {
        if (!this.metrics.cumulativeLayoutShift) {
            this.metrics.cumulativeLayoutShift = 0;
        }

        // Only count layout shifts that are not user-initiated
        if (!entry.hadRecentInput) {
            this.metrics.cumulativeLayoutShift += entry.value;
        }
    }

    /**
     * Measure custom timing
     */
    startTiming(name) {
        if (this.isSupported) {
            performance.mark(`${name}-start`);
        }
    }

    /**
     * End custom timing measurement
     */
    endTiming(name) {
        if (this.isSupported) {
            performance.mark(`${name}-end`);
            performance.measure(name, `${name}-start`, `${name}-end`);
            
            const measure = performance.getEntriesByName(name, 'measure')[0];
            if (measure) {
                console.log(`ARK Performance - ${name}: ${measure.duration.toFixed(2)}ms`);
                
                if (!this.metrics.custom) {
                    this.metrics.custom = {};
                }
                this.metrics.custom[name] = measure.duration;
            }
        }
    }

    /**
     * Measure resource loading times
     */
    measureResourceTiming() {
        if (!this.isSupported) return;

        const resources = performance.getEntriesByType('resource');
        const resourceMetrics = {
            scripts: [],
            stylesheets: [],
            images: [],
            other: []
        };

        resources.forEach(resource => {
            const timing = {
                name: resource.name,
                duration: resource.duration,
                size: resource.transferSize || 0,
                cached: resource.transferSize === 0 && resource.decodedBodySize > 0
            };

            if (resource.name.includes('.js')) {
                resourceMetrics.scripts.push(timing);
            } else if (resource.name.includes('.css')) {
                resourceMetrics.stylesheets.push(timing);
            } else if (resource.name.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) {
                resourceMetrics.images.push(timing);
            } else {
                resourceMetrics.other.push(timing);
            }
        });

        this.metrics.resources = resourceMetrics;
        return resourceMetrics;
    }

    /**
     * Get Core Web Vitals
     */
    getCoreWebVitals() {
        const vitals = {};

        // First Contentful Paint
        if (this.metrics.paint && this.metrics.paint['first-contentful-paint']) {
            vitals.fcp = this.metrics.paint['first-contentful-paint'].startTime;
        }

        // Largest Contentful Paint
        if (this.metrics.largestContentfulPaint) {
            vitals.lcp = this.metrics.largestContentfulPaint.startTime;
        }

        // Cumulative Layout Shift
        if (this.metrics.cumulativeLayoutShift !== undefined) {
            vitals.cls = this.metrics.cumulativeLayoutShift;
        }

        // First Input Delay (would need to be measured separately)
        // This is typically measured when user first interacts

        return vitals;
    }

    /**
     * Get performance score based on Core Web Vitals
     */
    getPerformanceScore() {
        const vitals = this.getCoreWebVitals();
        let score = 100;
        let details = [];

        // FCP scoring (good: <1.8s, needs improvement: 1.8-3s, poor: >3s)
        if (vitals.fcp) {
            if (vitals.fcp > 3000) {
                score -= 30;
                details.push('First Contentful Paint is slow (>3s)');
            } else if (vitals.fcp > 1800) {
                score -= 15;
                details.push('First Contentful Paint needs improvement (>1.8s)');
            }
        }

        // LCP scoring (good: <2.5s, needs improvement: 2.5-4s, poor: >4s)
        if (vitals.lcp) {
            if (vitals.lcp > 4000) {
                score -= 35;
                details.push('Largest Contentful Paint is slow (>4s)');
            } else if (vitals.lcp > 2500) {
                score -= 20;
                details.push('Largest Contentful Paint needs improvement (>2.5s)');
            }
        }

        // CLS scoring (good: <0.1, needs improvement: 0.1-0.25, poor: >0.25)
        if (vitals.cls !== undefined) {
            if (vitals.cls > 0.25) {
                score -= 25;
                details.push('Cumulative Layout Shift is high (>0.25)');
            } else if (vitals.cls > 0.1) {
                score -= 10;
                details.push('Cumulative Layout Shift needs improvement (>0.1)');
            }
        }

        return {
            score: Math.max(0, score),
            details,
            vitals
        };
    }

    /**
     * Generate performance report
     */
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            connection: this.getConnectionInfo(),
            metrics: this.metrics,
            coreWebVitals: this.getCoreWebVitals(),
            performanceScore: this.getPerformanceScore(),
            resources: this.measureResourceTiming()
        };

        return report;
    }

    /**
     * Get connection information
     */
    getConnectionInfo() {
        if ('connection' in navigator) {
            const conn = navigator.connection;
            return {
                effectiveType: conn.effectiveType,
                downlink: conn.downlink,
                rtt: conn.rtt,
                saveData: conn.saveData
            };
        }
        return null;
    }

    /**
     * Log performance summary to console
     */
    logSummary() {
        const report = this.generateReport();
        
        console.group('ARK Performance Summary');
        console.log('Performance Score:', report.performanceScore.score + '/100');
        
        if (report.performanceScore.details.length > 0) {
            console.warn('Issues found:', report.performanceScore.details);
        }
        
        console.log('Core Web Vitals:', report.coreWebVitals);
        
        if (report.navigation) {
            console.log('Load Time:', report.metrics.navigation.totalLoad + 'ms');
            console.log('Time to Interactive:', report.metrics.navigation.timeToInteractive + 'ms');
        }
        
        if (report.connection) {
            console.log('Connection:', report.connection);
        }
        
        console.groupEnd();
    }

    /**
     * Send performance data to analytics (placeholder)
     */
    sendToAnalytics(report = null) {
        if (!report) {
            report = this.generateReport();
        }

        // In a real implementation, this would send to your analytics service
        console.log('ARK: Performance data ready for analytics:', {
            score: report.performanceScore.score,
            fcp: report.coreWebVitals.fcp,
            lcp: report.coreWebVitals.lcp,
            cls: report.coreWebVitals.cls,
            loadTime: report.metrics.navigation?.totalLoad
        });

        // Store locally for debugging
        localStorage.setItem('ark-performance-report', JSON.stringify(report));
    }

    /**
     * Cleanup observers
     */
    cleanup() {
        this.observers.forEach(observer => {
            try {
                observer.disconnect();
            } catch (error) {
                console.warn('Error disconnecting performance observer:', error);
            }
        });
        this.observers = [];
    }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Measure First Input Delay
 */
export function measureFirstInputDelay() {
    if ('PerformanceObserver' in window) {
        try {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    // First Input Delay is the delay between when the user first interacted
                    // and when the browser was able to respond to that interaction
                    const fid = entry.processingStart - entry.startTime;
                    
                    console.log(`ARK Performance - First Input Delay: ${fid.toFixed(2)}ms`);
                    
                    // Store FID in performance monitor
                    if (!performanceMonitor.metrics.firstInputDelay) {
                        performanceMonitor.metrics.firstInputDelay = fid;
                    }
                    
                    // Disconnect after first measurement
                    observer.disconnect();
                }
            });
            
            observer.observe({ entryTypes: ['first-input'] });
        } catch (error) {
            console.warn('ARK: First Input Delay measurement not supported:', error);
        }
    }
}

/**
 * Initialize performance monitoring
 */
export function initPerformanceMonitoring() {
    // Start measuring FID
    measureFirstInputDelay();
    
    // Log summary after page load
    window.addEventListener('load', () => {
        setTimeout(() => {
            performanceMonitor.logSummary();
            performanceMonitor.sendToAnalytics();
        }, 1000); // Wait a bit for all metrics to be collected
    });
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        performanceMonitor.cleanup();
    });
}

/**
 * Measure specific application operations
 */
export const measureOperation = {
    quoteLoad: () => {
        performanceMonitor.startTiming('quote-load');
        return () => performanceMonitor.endTiming('quote-load');
    },
    
    archiveLoad: () => {
        performanceMonitor.startTiming('archive-load');
        return () => performanceMonitor.endTiming('archive-load');
    },
    
    navigation: (viewName) => {
        performanceMonitor.startTiming(`navigation-${viewName}`);
        return () => performanceMonitor.endTiming(`navigation-${viewName}`);
    },
    
    apiCall: (endpoint) => {
        performanceMonitor.startTiming(`api-${endpoint}`);
        return () => performanceMonitor.endTiming(`api-${endpoint}`);
    }
};