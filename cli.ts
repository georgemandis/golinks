import { parseArgs } from "@std/cli/parse-args";
import { GoLinksDB } from "./db.ts";

const db = new GoLinksDB();
await db.init();

const args = parseArgs(Deno.args, {
  string: ["shortcut", "url", "description"],
  boolean: ["help", "list", "delete", "stats", "server"],
  alias: {
    h: "help",
    l: "list",
    d: "delete",
    s: "shortcut",
    u: "url",
    desc: "description",
  },
});

const firstArg = args._[0];

function printHelp() {
  console.log(`
Go Links CLI

Usage:
  golinks --help                                    Show this help message
  golinks --list                                    List all links
  golinks --stats                                   Show statistics
  golinks --server                                  Start the web server
  golinks --shortcut <name> --url <url> [--description <desc>]  Add a new link
  golinks --delete --shortcut <name>                Delete a link
  golinks <shortcut>                                Open shortcut in browser

Examples:
  golinks --shortcut gh --url https://github.com --description "GitHub homepage"
  golinks --shortcut gh --url https://github.com
  golinks --list
  golinks --delete --shortcut gh
  golinks --stats
  golinks --server
  golinks gh                                        Open the 'gh' shortcut
  `);
}

function formatTable(links: any[]) {
  if (links.length === 0) {
    console.log("No links found.");
    return;
  }

  const headers = ["Shortcut", "URL", "Description", "Clicks", "Created"];
  const rows = links.map((link) => [
    link.shortcut,
    link.url.length > 50 ? link.url.substring(0, 47) + "..." : link.url,
    link.description ? (link.description.length > 30 ? link.description.substring(0, 27) + "..." : link.description) : "-",
    link.click_count.toString(),
    new Date(link.created_at).toLocaleDateString(),
  ]);

  const columnWidths = headers.map((header, i) =>
    Math.max(header.length, ...rows.map((row) => row[i].length))
  );

  function printRow(row: string[]) {
    console.log(row.map((cell, i) => cell.padEnd(columnWidths[i])).join(" | "));
  }

  printRow(headers);
  console.log(columnWidths.map((w) => "-".repeat(w)).join("-|-"));
  rows.forEach(printRow);
}

if (args.help) {
  printHelp();
} else if (args.server) {
  const { handleRequest } = await import("./server.ts");

  Deno.serve({
    port: 80,
    onListen({ port, hostname }) {
      console.log(`Starting go links server on port ${port}`);
      console.log(`Management interface available at http://localhost/_`);
    },
  }, handleRequest);
} else if (args.list) {
  const links = db.getAllLinks();
  formatTable(links);
} else if (args.stats) {
  const links = db.getAllLinks();
  const totalClicks = links.reduce((sum, link) => sum + link.click_count, 0);
  const mostClicked = links.sort((a, b) => b.click_count - a.click_count)[0];

  console.log(`
Statistics:
  Total Links: ${links.length}
  Total Clicks: ${totalClicks}
  Most Clicked: ${
    mostClicked
      ? `${mostClicked.shortcut} (${mostClicked.click_count} clicks)`
      : "None"
  }
  `);
} else if (args.delete && args.shortcut) {
  const success = db.deleteLink(args.shortcut);
  if (success) {
    console.log(`✓ Deleted link: ${args.shortcut}`);
  } else {
    console.log(`✗ Link not found: ${args.shortcut}`);
  }
} else if (args.shortcut && args.url) {
  try {
    db.addLink(args.shortcut, args.url, args.description);
    const desc = args.description ? ` (${args.description})` : "";
    console.log(`✓ Added link: ${args.shortcut} -> ${args.url}${desc}`);
  } catch (error) {
    console.log(`✗ Error adding link: ${error.message}`);
  }
} else if (firstArg && typeof firstArg === "string") {
  const link = db.getLink(firstArg);
  if (link) {
    db.incrementClickCount(firstArg);
    console.log(`Opening: ${link.url}`);
    try {
      const command = new Deno.Command(
        Deno.build.os === "windows" ? "cmd" : "open",
        {
          args: Deno.build.os === "windows"
            ? ["/c", "start", link.url]
            : [link.url],
          stdout: "null",
          stderr: "null",
        },
      );
      await command.output();
    } catch (error) {
      console.log(`✗ Failed to open browser: ${error.message}`);
      console.log(`URL: ${link.url}`);
    }
  } else {
    console.log(`✗ Shortcut not found: ${firstArg}`);
  }
} else {
  console.log("Invalid arguments. Use --help for usage information.");
  printHelp();
}

db.close();
