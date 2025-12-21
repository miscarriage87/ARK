/**
 * PostCSS configuration for ARK Digital Calendar
 * 
 * Processes CSS with autoprefixer for browser compatibility.
 */

import autoprefixer from 'autoprefixer';

export default {
    plugins: [
        autoprefixer({
            overrideBrowserslist: [
                '> 1%',
                'last 2 versions',
                'not dead'
            ]
        })
    ]
};