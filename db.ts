import { DatabaseSync } from "node:sqlite";
import { ensureDir } from "@std/fs";
import { join } from "@std/path";

export interface GoLink {
  id: number;
  shortcut: string;
  url: string;
  created_at: string;
  updated_at: string;
  click_count: number;
}

export class GoLinksDB {
  private db: DatabaseSync;
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
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        click_count INTEGER DEFAULT 0
      )
    `);
  }

  addLink(shortcut: string, url: string): void {
    this.db
      .prepare(`INSERT INTO links (shortcut, url) VALUES (?, ?)`)
      .run(shortcut, url);
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
    return result.map((row) => this.mapRowToLink(row));
  }

  updateLink(shortcut: string, url: string): boolean {
    const result = this.db
      .prepare(
        `UPDATE links SET url = ?, updated_at = CURRENT_TIMESTAMP WHERE shortcut = ?`,
      )
      .run(url, shortcut);
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

  private mapRowToLink(row: any): GoLink {
    return {
      id: row.id,
      shortcut: row.shortcut,
      url: row.url,
      created_at: row.created_at,
      updated_at: row.updated_at,
      click_count: row.click_count,
    };
  }

  close(): void {
    this.db.close();
  }
}
