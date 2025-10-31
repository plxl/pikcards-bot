import { writeFileSync } from 'fs';
import { join } from 'path';
import * as XLSX from 'xlsx';

function main() {
    const workbook = XLSX.read("PikiCards-Data.xlsx", { type: "file" });
    const sheetName = workbook.SheetNames[0]!;
    const worksheet = workbook.Sheets[sheetName]!;

    const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
    const trimmed = rows.slice(7);
    const [headers, ...dataRows] = trimmed;
    const data = dataRows.map(r => {
        const obj: Record<string, any> = {};
        headers!.forEach((h, i) => {
            let val = r[i];

            // convert multispace lists to arrays
            if (typeof val === "string") {
                if (val.trim().toLowerCase() === "none") {
                    val = [];
                } else if (/\s{2,}/.test(val)) {
                    val = val
                        .trim()
                        .split(/\s{2,}/)
                        .filter(Boolean);
                }
            }

            obj[h] = val;
        });
        return obj;
    });

    for (const row of data) {
        const set = String(row["Set"] ?? "0").replace(/[^\w-]+/g, "_");
        const num = String(row["No."] ?? "0").replace(/[^\w-]+/g, "_");
        const name = String(row["Name"] ?? "NoName").replace(/[^\w-]+/g, "_");

        const fileName = `${set}_${num}_${name}.json`;
        const filePath = join("data", "cards", "json", fileName);

        writeFileSync(filePath, JSON.stringify(row, null, 4));
    }
}

main();
