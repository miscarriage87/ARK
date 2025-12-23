/**
 * Jest test setup for ARK Digital Calendar frontend
 * 
 * Global test configuration and mocks for the frontend test suite.
 */

// Mock Response constructor for PWA tests
global.Response = class Response {
    constructor(body, init = {}) {
        this.body = body;
        this.status = init.status || 200;
        this.statusText = init.statusText || 'OK';
        this.headers = new Map(Object.entries(init.headers || {}));
        this.ok = this.status >= 200 && this.status < 300;
    }
    
    async json() {
        return JSON.parse(this.body);
    }
    
    async text() {
        return this.body;
    }
    
    clone() {
        return new Response(this.body, {
            status: this.status,
            statusText: this.statusText,
            headers: Object.fromEntries(this.headers)
        });
    }
};

// Mock Request constructor
global.Request = class Request {
    constructor(url, init = {}) {
        this.url = url;
        this.method = init.method || 'GET';
        this.headers = new Map(Object.entries(init.headers || {}));
    }
};

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock navigator
Object.defineProperty(window, 'navigator', {
    value: {
        onLine: true,
        serviceWorker: {
            register: jest.fn(() => Promise.resolve()),
        },
        userAgent: 'test-agent',
    },
    writable: true,
});

// Mock fetch
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
    })
);

// Mock console methods to reduce noise in tests
global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};

// Mock alert
global.alert = jest.fn();

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
};

// Clean up after each test
afterEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    sessionStorageMock.clear();
});