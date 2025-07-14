import { DatabaseSync } from "node:sqlite";
import { ensureDir } from "@std/fs";
import { join } from "@std/path";

/**
 * Represents a Go Link entry in the database.
 */
export interface GoLink {
  /** Unique identifier for the link */
  id: number;
  /** Short alias for the link (e.g., "gh" for GitHub) */
  shortcut: string;
  /** Target URL that the shortcut redirects to */
  url: string;
  /** Optional description of what the link is for */
  description?: string;
  /** ISO timestamp when the link was created */
  created_at: string;
  /** ISO timestamp when the link was last updated */
  updated_at: string;
  /** Number of times this link has been clicked */
  click_count: number;
}

/**
 * A database class for managing Go Links - short aliases for URLs.
 *
 * This class provides methods to create, read, update, and delete go links,
 * as well as track click statistics. The database is stored as a SQLite file
 * in the user's home directory.
 *
 * @example
 * ```ts
 * const db = new GoLinksDB();
 * await db.init();
 *
 * // Add a new link
 * db.addLink("gh", "https://github.com", "GitHub homepage");
 *
 * // Get a link
 * const link = db.getLink("gh");
 *
 * // Clean up
 * db.close();
 * ```
 */
export class GoLinksDB {
  private db!: DatabaseSync;
  private dbPath: string;

  /**
   * Creates a new GoLinksDB instance.
   * The database file will be located at `~/.golinks/db.sqlite`.
   */
  constructor() {
    const homeDir = Deno.env.get("HOME") || Deno.env.get("USERPROFILE") || "";
    this.dbPath = join(homeDir, ".golinks", "db.sqlite");
  }

  /**
   * Initializes the database connection and creates the necessary tables.
   * This method must be called before using any other database methods.
   *
   * @throws {Error} If the database cannot be initialized
   *
   * @example
   * ```ts
   * const db = new GoLinksDB();
   * await db.init();
   * ```
   */
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

  /**
   * Adds a new go link to the database.
   *
   * @param shortcut - The short alias for the link (must be unique)
   * @param url - The target URL to redirect to
   * @param description - Optional description of the link
   *
   * @throws {Error} If the shortcut already exists or if the database operation fails
   *
   * @example
   * ```ts
   * db.addLink("gh", "https://github.com", "GitHub homepage");
   * db.addLink("docs", "https://docs.example.com");
   * ```
   */
  addLink(shortcut: string, url: string, description?: string): void {
    this.db
      .prepare(
        `INSERT INTO links (shortcut, url, description) VALUES (?, ?, ?)`,
      )
      .run(shortcut, url, description || null);
  }

  /**
   * Retrieves a go link by its shortcut.
   *
   * @param shortcut - The shortcut to look up
   * @returns The go link if found, null otherwise
   *
   * @example
   * ```ts
   * const link = db.getLink("gh");
   * if (link) {
   *   console.log(`Found: ${link.url}`);
   * }
   * ```
   */
  getLink(shortcut: string): GoLink | null {
    const result = this.db
      .prepare(`SELECT * FROM links WHERE shortcut = ?`)
      .get(shortcut);
    return result ? this.mapRowToLink(result) : null;
  }

  /**
   * Retrieves all go links from the database.
   *
   * @returns Array of all go links, ordered by creation date (newest first)
   *
   * @example
   * ```ts
   * const links = db.getAllLinks();
   * console.log(`Found ${links.length} links`);
   * ```
   */
  getAllLinks(): GoLink[] {
    const result = this.db
      .prepare(`SELECT * FROM links ORDER BY created_at DESC`)
      .all();
    return result.map((row: unknown) => this.mapRowToLink(row));
  }

  /**
   * Updates an existing go link.
   *
   * @param shortcut - The shortcut of the link to update
   * @param url - The new target URL
   * @param description - The new description (optional)
   * @returns True if the link was updated, false if the shortcut wasn't found
   *
   * @example
   * ```ts
   * const updated = db.updateLink("gh", "https://github.com/user", "My GitHub");
   * if (updated) {
   *   console.log("Link updated successfully");
   * }
   * ```
   */
  updateLink(shortcut: string, url: string, description?: string): boolean {
    const result = this.db
      .prepare(
        `UPDATE links SET url = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE shortcut = ?`,
      )
      .run(url, description || null, shortcut);
    return result.changes > 0;
  }

  /**
   * Deletes a go link from the database.
   *
   * @param shortcut - The shortcut of the link to delete
   * @returns True if the link was deleted, false if the shortcut wasn't found
   *
   * @example
   * ```ts
   * const deleted = db.deleteLink("gh");
   * if (deleted) {
   *   console.log("Link deleted successfully");
   * }
   * ```
   */
  deleteLink(shortcut: string): boolean {
    const result = this.db
      .prepare(`DELETE FROM links WHERE shortcut = ?`)
      .run(shortcut);
    return result.changes > 0;
  }

  /**
   * Increments the click count for a go link.
   * This is typically called when a link is accessed.
   *
   * @param shortcut - The shortcut of the link to increment
   *
   * @example
   * ```ts
   * db.incrementClickCount("gh");
   * ```
   */
  incrementClickCount(shortcut: string): void {
    this.db
      .prepare(
        `UPDATE links SET click_count = click_count + 1 WHERE shortcut = ?`,
      )
      .run(shortcut);
  }

  /**
   * Maps a raw database row to a GoLink object.
   *
   * @private
   * @param row - Raw database row
   * @returns Typed GoLink object
   */
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

  /**
   * Closes the database connection.
   * This should be called when you're done using the database.
   *
   * @example
   * ```ts
   * db.close();
   * ```
   */
  close(): void {
    this.db.close();
  }
}
