# Go Links Server & CLI Tool

A simple go link redirect server built with Deno that allows you to create short
links accessible via a local hostname (e.g. `go/<shortcut>`) or CLI interface.

If have Deno installed and you don't want to pull down the code you can install
the script like so:

```bash
deno install --global --allow-read --allow-write --allow-env --allow-net --allow-run --config deno.json --name golinks https://raw.githubusercontent.com/georgemandis/golinks/refs/heads/main/cli.ts
```

Run `golinks`

## Features

- **HTTP Server**: Binds to port 80 (default)
- **Web Management**: Accessible at `http://go/_` (or whatever hostname you
  choose)
- **Command Line Interface**: Manage links from the terminal (see below)
- **SQLite Storage**: Links stored in `~/.golinks/db.sqlite`
- **Click Tracking**: Monitor link usage statistics

## Setup

### Quick Start (Development)

1. **Add `go` to your hosts file**:

   ```bash
   echo "127.0.0.1 go" | sudo tee -a /etc/hosts
   ```

2. **Install and run**:
   ```bash
   # Start the server (requires sudo for port 80)
   deno task start
   ```

### Global Installation

Use
[Deno's install command](https://docs.deno.com/runtime/reference/cli/install/#deno-install---global-%5Bpackage_or_url%5D)
with the `--global` flag to install it globally.

1. **Install globally**:
   ```bash
   deno install --global --allow-read --allow-write --allow-env --allow-net --allow-run --config deno.json --name golinks cli.ts
   ```
   You can rename it to something else if you like.
2. **Add `go` to your hosts file** (if not already done):

   ```bash
   echo "127.0.0.1 go" | sudo tee -a /etc/hosts
   ```
   This step is very optional and you can change `go` to something else if you
   like.

3. **Start the server**:
   ```bash
   golinks --server
   ```
   Or, if you pulled down the source and opted not ot install it locally:
   ```bash
   deno task start
   ```

## Usage

### Web Interface

Visit `http://go/_` to:

- Add new links
- View existing links
- Delete links
- View statistics

### Command Line

#### Development Usage

```bash
# Add a new link
deno task cli --shortcut gh --url https://github.com

# List all links
deno task cli --list

# Delete a link
deno task cli --delete --shortcut gh

# Show statistics
deno task cli --stats

# Show help
deno task cli --help
```

#### Global CLI Usage (after global installation)

```bash
# Add a new link
golinks --shortcut gh --url https://github.com

# List all links
golinks --list

# Delete a link
golinks --delete --shortcut gh

# Show statistics
golinks --stats

# Start the server
golinks --server

# Open a shortcut directly in your browser
golinks gh

# Show help
golinks --help
```

### Using Links

Once created, access your links at:

- `http://go/gh` → redirects to GitHub
- `http://go/docs` → redirects to your documentation
- etc.

Or manage and use them via the CLI

- `golinks gh` → redirects to GitHub
- `golinks docs` → redirects to your documentation
- etc.

## Database Location

Links are stored in `~/.golinks/db.sqlite`

## Requirements

- Deno 1.40+
- sudo access (for binding to port 80)
- `go` added to your hosts file (Optionally)
