import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { parse } from "csv-parse/sync";
import fs from "fs/promises";
import path from "path";

export async function POST() {
    return NextResponse.json({}, {status: 404})
    try {
        const filePath = path.join(process.cwd(), "public", "data.csv");

        const file = await fs.readFile(filePath, "utf-8");

        const rows = parse(file, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
        });

        console.log(`Found ${rows.length} rows`);

        const BATCH_SIZE = 500;

        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
            const batch = rows.slice(i, i + BATCH_SIZE);

            const values: any[] = [];

            const placeholders = batch.map((row: any, index: number) => {
                const offset = index * 12;
                
                values.push(
                    Number(row.external_id || 0).toFixed(0),
                    row.date,
                    row.employee_name,
                    row.department,
                    Number(row.pieces || 0).toFixed(0),
                    Number(row.value || 0).toFixed(0),
                    Number(row.hours || 0).toFixed(0),
                    Number(row.ppoh || 0).toFixed(0),
                    Number(row.target_ppoh || 0).toFixed(0),
                    Number(row.delta_ppoh || 0).toFixed(0),
                    Number(row.efficiency || 0).toFixed(0),
                    row.notes || null
                );

                return `(
                    $${offset + 1},
                    $${offset + 2},
                    $${offset + 3},
                    $${offset + 4},
                    $${offset + 5},
                    $${offset + 6},
                    $${offset + 7},
                    $${offset + 8},
                    $${offset + 9},
                    $${offset + 10},
                    $${offset + 11},
                    $${offset + 12}
                )`;
            });

            await sql.query(
                `
                INSERT INTO ppoh_master (
                    external_id,
                    date,
                    employee_name,
                    department,
                    pieces,
                    value,
                    hours,
                    ppoh,
                    target_ppoh,
                    delta_ppoh,
                    efficiency,
                    notes
                )
                VALUES ${placeholders.join(",")}
                `,
                values
            );

            console.log(
                `Imported ${Math.min(i + BATCH_SIZE, rows.length)} / ${rows.length}`
            );
        }

        return NextResponse.json({
            success: true,
            imported: rows.length,
        });

    } catch (error) {
        console.error(error);

        return NextResponse.json(
            {
                success: false,
                error: String(error),
            },
            { status: 500 }
        );
    }
}