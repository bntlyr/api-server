import "dotenv/config";
import pg from "pg";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  console.log("🔄 Resetting and synchronizing all database sequences...");
  const pool = new pg.Pool({ connectionString });
  const client = await pool.connect();

  try {
    const res = await client.query(`
      SELECT 
        t.schemaname,
        t.tablename, 
        a.attname as colname
      FROM pg_tables t
      JOIN pg_attribute a ON a.attrelid = ('"' || t.schemaname || '"."' || t.tablename || '"')::regclass
      JOIN pg_index i ON i.indrelid = a.attrelid AND a.attnum = ANY(i.indkey)
      WHERE t.schemaname = 'public' AND i.indisprimary = true
    `);

    for (const row of res.rows) {
      const { tablename, colname } = row;
      const seqRes = await client.query(`SELECT pg_get_serial_sequence($1, $2) as seq`, [`"${tablename}"`, colname]);
      const seq = seqRes.rows[0]?.seq;
      if (seq) {
        const maxRes = await client.query(`SELECT COALESCE(MAX("${colname}"), 0) as max_val FROM "${tablename}"`);
        const maxVal = Number(maxRes.rows[0]?.max_val ?? 0);
        if (maxVal > 0) {
          await client.query(`SELECT setval($1, $2, true)`, [seq, maxVal]);
          console.log(`  ✓ Synced ${tablename}.${colname} (${seq}) -> ${maxVal}`);
        } else {
          await client.query(`SELECT setval($1, 1, false)`, [seq]);
          console.log(`  ✓ Reset ${tablename}.${colname} (${seq}) -> 1 (empty table)`);
        }
      }
    }

    console.log("✅ All sequences synchronized successfully!");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Error syncing sequences:", err);
  process.exit(1);
});
