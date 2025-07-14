import { DatabaseSync } from "node:sqlite";
import { ensureDir } from "@std/fs";
import { join } from "@std/path";

export interface GoLink {
  id: number;
  shortcut: string;
  url: string;
  description?: string;
  created_at: string;
  updated_at: string;
  click_count: number;
}

export class GoLinksDB {
  private db!: DatabaseSync;
  private dbPath: string;

  constructor() {
    const homeDir = Deno.env.get("HOME") || Deno.env.get("USERPROFILE") || "";
    this.dbPath = join(homeDir, ".golinks", "db.sqlite");
  }

  async init(): Promise<void> {
    await ensureDir(join(this.dbPath, ".."));
    this.db = new DatabaseSync(this.dbPath);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shortcut TEXT UNIQUE NOT NULL,
        url TEXT NOT NULL,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        click_count INTEGER DEFAULT 0
      )
    `);

    // Add description column if it doesn't exist (for existing databases)
    try {
      this.db.exec(`ALTER TABLE links ADD COLUMN description TEXT`);
    } catch {
      // Column already exists, ignore error
    }
  }

  addLink(shortcut: string, url: string, description?: string): void {
    this.db
      .prepare(
        `INSERT INTO links (shortcut, url, description) VALUES (?, ?, ?)`,
      )
      .run(shortcut, url, description || null);
  }

  getLink(shortcut: string): GoLink | null {
    const result = this.db
      .prepare(`SELECT * FROM links WHERE shortcut = ?`)
      .get(shortcut);
    return result ? this.mapRowToLink(result) : null;
  }

  getAllLinks(): GoLink[] {
    const result = this.db
      .prepare(`SELECT * FROM links ORDER BY created_at DESC`)
      .all();
    return result.map((row: unknown) => this.mapRowToLink(row));
  }

  updateLink(shortcut: string, url: string, description?: string): boolean {
    const result = this.db
      .prepare(
        `UPDATE links SET url = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE shortcut = ?`,
      )
      .run(url, description || null, shortcut);
    return result.changes > 0;
  }

  deleteLink(shortcut: string): boolean {
    const result = this.db
      .prepare(`DELETE FROM links WHERE shortcut = ?`)
      .run(shortcut);
    return result.changes > 0;
  }

  incrementClickCount(shortcut: string): void {
    this.db
      .prepare(
        `UPDATE links SET click_count = click_count + 1 WHERE shortcut = ?`,
      )
      .run(shortcut);
  }

  private mapRowToLink(row: unknown): GoLink {
    const r = row as GoLink;
    return {
      id: r.id,
      shortcut: r.shortcut,
      url: r.url,
      description: r.description,
      created_at: r.created_at,
      updated_at: r.updated_at,
      click_count: r.click_count,
    };
  }

  close(): void {
    this.db.close();
  }
}
