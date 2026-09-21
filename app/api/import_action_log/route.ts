import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { parse } from "csv-parse/sync";
import fs from "fs/promises";
import path from "path";
import { parse as parse_date, format } from "date-fns";

export async function POST() {
    try {
        const filePath = path.join(process.cwd(), "public", "action_log.csv");

        const file = await fs.readFile(filePath, "utf-8");

        const rows = parse(file, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
        });


        const BATCH_SIZE = 500;

        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
            const batch = rows.slice(i, i + BATCH_SIZE);

            const values: any[] = [];

            const placeholders = batch.map((row: any, index: number) => {
                const offset = index * 10;

                const date = row.date
                    ? format(
                          parse_date(row.date, "M/d/yyyy", new Date()),
                          "yyyy-MM-dd"
                      )
                    : null;

                const dateResolved = row.date_resolved
                    ? format(
                          parse_date(
                              row.date_resolved,
                              "M/d/yyyy",
                              new Date()
                          ),
                          "yyyy-MM-dd"
                      )
                    : null;

                const shift =
                    row.shift && row.shift !== "-"
                        ? row.shift
                        : null;

                const status = row.status
                    ? row.status
                          .replace(/<br\s*\/?>/gi, "")
                          .trim()
                    : null;

                let actions = [];

                if (row.actions) {
                    try {
                        actions = JSON.parse(row.actions);
                    } catch {
                        console.warn(
                            `Invalid actions JSON:`,
                            row.actions
                        );
                        actions = [];
                    }
                }

                values.push(
                    date,
                    row.user_id || null,
                    row.department_id || null,
                    shift,
                    row.category || null,
                    row.severity || null,
                    row.text || null,
                    dateResolved,
                    status,
                    JSON.stringify(actions)
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
                    $${offset + 10}
                )`;
            });

            await sql.query(
                `
                INSERT INTO daily_log (
                    date,
                    user_id,
                    department_id,
                    shift,
                    category,
                    severity,
                    text,
                    date_resolved,
                    status,
                    actions
                )
                VALUES ${placeholders.join(",")}
                `,
                values
            );

            console.log(
                `Imported ${Math.min(
                    i + BATCH_SIZE,
                    rows.length
                )} / ${rows.length}`
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