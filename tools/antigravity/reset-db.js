const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dbPath = path.join(__dirname, 'dev.db');
const journalPath = path.join(__dirname, 'dev.db-journal');
const shmPath = path.join(__dirname, 'dev.db-shm');
const walPath = path.join(__dirname, 'dev.db-wal');

console.log("Cleaning up database files...");

[dbPath, journalPath, shmPath, walPath].forEach(file => {
    if (fs.existsSync(file)) {
        try {
            fs.unlinkSync(file);
            console.log(`Deleted ${path.basename(file)}`);
        } catch (e) {
            console.error(`Failed to delete ${path.basename(file)}:`, e.message);
        }
    }
});

console.log("Initializing fresh database...");
try {
    execSync('npx prisma db push', { stdio: 'inherit' });
    console.log("Database initialized successfully.");
} catch (e) {
    console.error("Prisma push failed.");
    process.exit(1);
}
