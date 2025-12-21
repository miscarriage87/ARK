/**
 * Simple icon generator for ARK Digital Calendar PWA
 * Creates placeholder icons for development purposes
 */

const fs = require('fs');
const path = require('path');

// Icon sizes needed for the PWA
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Simple SVG template for ARK icon
const createIconSVG = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#007bff" rx="${size * 0.1}"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.4}" 
        font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">
    ARK
  </text>
  <circle cx="${size * 0.8}" cy="${size * 0.2}" r="${size * 0.05}" fill="white" opacity="0.8"/>
</svg>
`;

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('Generating placeholder PWA icons...');

// Generate SVG icons for each size
iconSizes.forEach(size => {
    const svgContent = createIconSVG(size);
    const filename = `icon-${size}x${size}.svg`;
    const filepath = path.join(iconsDir, filename);
    
    fs.writeFileSync(filepath, svgContent.trim());
    console.log(`Created ${filename}`);
});

// Create a simple favicon
const faviconSVG = createIconSVG(32);
fs.writeFileSync(path.join(iconsDir, 'favicon.svg'), faviconSVG.trim());
console.log('Created favicon.svg');

// Create additional sizes for HTML meta tags
const additionalSizes = [16, 32];
additionalSizes.forEach(size => {
    const svgContent = createIconSVG(size);
    const filename = `icon-${size}x${size}.svg`;
    const filepath = path.join(iconsDir, filename);
    
    fs.writeFileSync(filepath, svgContent.trim());
    console.log(`Created ${filename}`);
});

console.log('\nPlaceholder icons generated successfully!');
console.log('Note: For production, replace these with professionally designed PNG icons.');
console.log('You can use tools like:');
console.log('- PWA Builder Icon Generator: https://www.pwabuilder.com/imageGenerator');
console.log('- Favicon.io: https://favicon.io/');
console.log('- RealFaviconGenerator: https://realfavicongenerator.net/');