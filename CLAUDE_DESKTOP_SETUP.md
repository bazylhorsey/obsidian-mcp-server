# Claude Desktop Setup Guide

## Step-by-Step Instructions

### 1. Build the MCP Server

First, make sure your server is built:

```bash
cd ~/Projects/obsidian-mcp
npm install
npm run build
```

This creates the compiled server in `dist/index.js`.

### 2. Create Your Vault Configuration

Create `obsidian-mcp.json` in the project root:

```json
{
  "vaults": [
    {
      "name": "documents",
      "type": "local",
      "path": "~/Documents"
    }
  ]
}
```

**Important:** Use the ABSOLUTE path to your vault folder!

### 3. Configure Claude Desktop

Claude Desktop's config location depends on your OS:

- **Linux:** `~/.config/Claude/claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

For you on Linux, edit:
```bash
nano ~/.config/Claude/claude_desktop_config.json
```

Or create it if it doesn't exist:
```bash
mkdir -p ~/.config/Claude
```

### 4. Add MCP Server Configuration

Edit `~/.config/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "node",
      "args": [
        "~/Projects/obsidian-mcp/dist/index.js"
      ]
    }
  }
}
```

**Key Points:**
- Use ABSOLUTE paths (not `~/` or `$HOME`)
- The config file is in your home directory, NOT in the project
- The server will read `obsidian-mcp.json` from its own directory

### 5. Alternative: Using Environment Variables

If you prefer environment variables over the config file:

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "node",
      "args": [
        "~/Projects/obsidian-mcp/dist/index.js"
      ],
      "env": {
        "OBSIDIAN_VAULT_PATH": "~/Documents",
        "OBSIDIAN_VAULT_NAME": "documents"
      }
    }
  }
}
```

### 6. Restart Claude Desktop

After editing the config:

1. **Quit Claude Desktop completely** (not just close the window)
   - On Linux: `pkill -9 claude` or use your system tray to quit
2. **Restart Claude Desktop**
3. The MCP server will auto-start when Claude launches

### 7. Verify Connection

In Claude Desktop, you should see:

1. **MCP icon/indicator** showing the server is connected
2. **Available tools** - Claude will mention it has access to Obsidian tools
3. Try asking: **"What vaults do you have access to?"**

### 8. Test with a Simple Query

Try these prompts:

```
"Search my Obsidian vault for notes about projects"

"Show me vault statistics"

"List all tags in my vault"

"Create a new note called 'Test.md' with the content 'Hello World'"
```

---

## Troubleshooting

### Claude Desktop doesn't show the MCP server

**Check the logs:**
```bash
# Linux
tail -f ~/.config/Claude/logs/mcp*.log

# Or check Claude's developer console
# Menu: View > Toggle Developer Tools > Console tab
```

**Common issues:**
1. ❌ Used relative paths instead of absolute paths
2. ❌ `dist/index.js` doesn't exist (run `npm run build`)
3. ❌ `obsidian-mcp.json` is missing or has wrong vault path
4. ❌ Didn't restart Claude Desktop after config change

### Server starts but can't access vault

**Check:**
1. Vault path is correct and absolute
2. Path exists: `ls -la ~/Documents`
3. You have read permissions: `ls -la ~/Documents/*.md`

**View server logs:**
The server logs go to stderr, which Claude Desktop captures. Check the developer console.

### Node version issues

Make sure you have Node.js 18+ installed:
```bash
node --version  # Should be v18.0.0 or higher
```

If using nvm:
```bash
nvm use 22
which node  # Get the full path
```

Then use the full node path in your config:
```json
{
  "mcpServers": {
    "obsidian": {
      "command": "~/.nvm/versions/node/v22.x.x/bin/node",
      "args": ["~/Projects/obsidian-mcp/dist/index.js"]
    }
  }
}
```

---

## Complete Example Configuration

### Your obsidian-mcp.json
```json
{
  "vaults": [
    {
      "name": "documents",
      "type": "local",
      "path": "~/Documents"
    }
  ],
  "server": {
    "name": "obsidian-mcp-server",
    "version": "1.0.0"
  }
}
```

### Your ~/.config/Claude/claude_desktop_config.json
```json
{
  "mcpServers": {
    "obsidian": {
      "command": "node",
      "args": [
        "~/Projects/obsidian-mcp/dist/index.js"
      ]
    }
  }
}
```

---

## Multiple Vaults Example

If you have multiple Obsidian vaults:

### obsidian-mcp.json
```json
{
  "vaults": [
    {
      "name": "personal",
      "type": "local",
      "path": "~/Documents/PersonalVault"
    },
    {
      "name": "work",
      "type": "local",
      "path": "~/Documents/WorkVault"
    }
  ]
}
```

Then in Claude, you can specify which vault:
```
"Search the 'work' vault for project notes"
"Create a note in the 'personal' vault"
```

---

## What You Can Do After Setup

Once connected, Claude will have access to these capabilities:

### 📝 Note Operations
- Read, create, update, delete notes
- Search by content, tags, folders
- Parse markdown and frontmatter

### 🔗 Knowledge Graph
- Analyze relationships between notes
- Find related notes
- Suggest potential links
- Identify orphan notes

### 📊 Analytics
- Vault statistics
- Tag usage analysis
- Link density

### 🎨 Canvas Support
- Read and create canvas files
- Add nodes and edges
- Visualize connections

### 📅 Periodic Notes
- Create daily/weekly/monthly/yearly notes
- Template support

### 🔍 Dataview-Style Queries
- SQL-like querying
- Filter by metadata
- Group and sort results

---

## Advanced: NPM Global Installation

If you want to install globally:

```bash
cd ~/Projects/obsidian-mcp
npm install -g .
```

Then in Claude config:
```json
{
  "mcpServers": {
    "obsidian": {
      "command": "obsidian-mcp"
    }
  }
}
```

---

## Need Help?

1. Check Claude Desktop developer console for errors
2. Verify `dist/index.js` exists and is executable
3. Test the server manually: `node dist/index.js` (it should wait for input)
4. Check file permissions on your vault folder
5. Make sure all paths are absolute, not relative
