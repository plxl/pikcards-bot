import path from 'path';
import fs from 'fs/promises';

export async function getCardImage(name: string): Promise<string | null> {
    // replace whitespace with _
    const fileName = name.trim().replace(/\s+/g, '_').toLowerCase();
    const assetsDir = path.join(process.cwd(), 'assets', 'card_images');
    return await findPngFileRecursive(assetsDir, fileName);
}

async function findPngFileRecursive(dir: string, target: string): Promise<string | null> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            const result = findPngFileRecursive(fullPath, target);
            if (result) return result;
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith(`${target}.png`)) {
            return fullPath;
        }
    }

    return null;
}

export function toTitleCase(s: string) {
    return s.replace(
        /\w\S*/g,
        text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
    );
}
