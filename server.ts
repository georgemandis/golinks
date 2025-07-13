import { GoLinksDB } from "./db.ts";

const db = new GoLinksDB();
await db.init();

const HTML_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
    <title>Go Links Manager</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .form { background: #f5f5f5; padding: 1rem; border-radius: 5px; margin-bottom: 1rem; }
        .form input, .form button { padding: 10px; margin: 5px; border: 1px solid #ddd; border-radius: 3px; }
        .form button { background: #007cba; color: white; cursor: pointer; }
        .form button:hover { background: #005a8a; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f5f5f5; }
        .delete-btn { background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; }
        .delete-btn:hover { background: #c82333; }
        .stats { background: #e9ecef; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <h1>Go Links Manager</h1>

    <div class="form">
        <h2>Add New Link</h2>
        <form method="POST" action="/_/add">
            <input type="text" name="shortcut" placeholder="Shortcut (e.g., 'gh')" required>
            <input type="url" name="url" placeholder="URL (e.g., 'https://github.com')" required>
            <input type="text" name="description" placeholder="Description (optional)">
            <button type="submit">Add Link</button>
        </form>
    </div>

    <div class="stats">
        <h2>Statistics</h2>
        <p>Total Links: {{TOTAL_LINKS}}</p>
        <p>Total Clicks: {{TOTAL_CLICKS}}</p>
    </div>

    <div>
        <h2>Existing Links</h2>
        <table>
            <thead>
                <tr>
                    <th>Shortcut</th>
                    <th>URL</th>
                    <th>Description</th>
                    <th>Clicks</th>
                    <th>Created</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {{LINKS_TABLE}}
            </tbody>
        </table>
    </div>
</body>
</html>
`;

function generateLinksTable(links: any[], url): string {
  return links
    .map(
      (link) => `
        <tr>
            <td><a href="http://${url.hostname}/${link.shortcut}" target="_blank">http://${url.hostname}/${link.shortcut}</a></td>
            <td><a href="${link.url}" target="_blank">${link.url}</a></td>
            <td>${link.description || '-'}</td>
            <td>${link.click_count}</td>
            <td>${new Date(link.created_at).toLocaleDateString()}</td>
            <td>
                <form method="POST" action="/_/delete" style="display: inline;">
                    <input type="hidden" name="shortcut" value="${link.shortcut}">
                    <button type="submit" class="delete-btn" onclick="return confirm('Are you sure?')">Delete</button>
                </form>
            </td>
        </tr>
    `,
    )
    .join("");
}

export async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (pathname === "/_") {
    if (request.method === "GET") {
      const links = db.getAllLinks();
      const totalClicks = links.reduce(
        (sum, link) => sum + link.click_count,
        0,
      );

      const html = HTML_TEMPLATE.replace(
        "{{TOTAL_LINKS}}",
        links.length.toString(),
      )
        .replace("{{TOTAL_CLICKS}}", totalClicks.toString())
        .replace("{{LINKS_TABLE}}", generateLinksTable(links, url));

      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
    }
  }

  if (pathname === "/_/add" && request.method === "POST") {
    const formData = await request.formData();
    const shortcut = formData.get("shortcut")?.toString();
    const url = formData.get("url")?.toString();
    const description = formData.get("description")?.toString();

    if (shortcut && url) {
      try {
        db.addLink(shortcut, url, description);
        return new Response("", {
          status: 302,
          headers: { Location: "/_" },
        });
      } catch (error) {
        return new Response(`Error: ${error.message}`, { status: 400 });
      }
    }
    return new Response("Missing shortcut or URL", { status: 400 });
  }

  if (pathname === "/_/delete" && request.method === "POST") {
    const formData = await request.formData();
    const shortcut = formData.get("shortcut")?.toString();

    if (shortcut) {
      db.deleteLink(shortcut);
      return new Response("", {
        status: 302,
        headers: { Location: "/_" },
      });
    }
    return new Response("Missing shortcut", { status: 400 });
  }

  const shortcut = pathname.slice(1);
  if (shortcut) {
    const link = db.getLink(shortcut);
    if (link) {
      db.incrementClickCount(shortcut);
      return new Response("", {
        status: 302,
        headers: { Location: link.url },
      });
    }
  }

  return new Response("Not Found", { status: 404 });
}

if (import.meta.main) {
  console.log("Starting go links server on http://localhost:80");
  console.log("Management interface available at http://localhost/_");

  Deno.serve({ port: 80 }, handleRequest);
}
