import fs from "fs";
import path from "path";
import Fuse, { IFuseOptions } from "fuse.js";

export class CardFinder {
    private fuse: Fuse<{ fullPath: string; displayName: string }>;
    private files: { fullPath: string; displayName: string }[] = [];
    private fuseOptions: IFuseOptions<{ fullPath: string; displayName: string }> = {
        keys: ["displayName"],
        threshold: 0.1,
        ignoreLocation: true,
        shouldSort: true,
        distance: 100,
        includeScore: true,
        includeMatches: true,
        findAllMatches: true,
    };
    private assetsDir = path.join(process.cwd(), 'assets', 'card_images');

    constructor() {
        this.files = this.loadAllPngFiles(this.assetsDir);
        this.fuse = new Fuse(this.files, this.fuseOptions);
    }

    private loadAllPngFiles(dir: string): { fullPath: string; displayName: string }[] {
        const results: { fullPath: string; displayName: string }[] = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                results.push(...this.loadAllPngFiles(fullPath));
            } else if (entry.name.endsWith(".png")) {
                let displayName = entry.name
                    .replace(/_/g, " ")
                    .replace(/\.[^/.]+$/, "")
                    .toLowerCase();

                if (path.basename(dir).toLowerCase().startsWith("set"))
                    displayName = displayName.replace(/^\d+ /, "");

                results.push({
                    fullPath,
                    displayName,
                });
            }
        }

        return results;
    }

    find(query: string): string | null {
        const result = this.fuse.search(query.toLowerCase());
        console.log(result)
        return result.length > 0 ? result[0].item.fullPath : null;
    }

    refresh(): void {
        this.files = this.loadAllPngFiles(this.assetsDir);
        this.fuse = new Fuse(this.files, this.fuseOptions);
    }
}

export const cardFinder = new CardFinder();
