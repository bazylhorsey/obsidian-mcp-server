# Quick Start Guide

## Installation

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

## Configuration

### Option 1: Using a Config File

Create `obsidian-mcp.json` in the project root:

```json
{
  "vaults": [
    {
      "name": "my-vault",
      "type": "local",
      "path": "/absolute/path/to/your/obsidian/vault"
    }
  ]
}
```

### Option 2: Using Environment Variables

```bash
export OBSIDIAN_VAULT_PATH="/path/to/your/vault"
export OBSIDIAN_VAULT_NAME="my-vault"
```

## Running the Server

```bash
npm start
```

Or directly:
```bash
node dist/index.js
```

The server will output initialization messages to stderr and wait for MCP protocol messages on stdin/stdout.

## Testing with Claude Desktop

Add to your Claude Desktop MCP configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "node",
      "args": ["/absolute/path/to/obsidian-mcp/dist/index.js"],
      "env": {
        "OBSIDIAN_VAULT_PATH": "/path/to/your/vault",
        "OBSIDIAN_VAULT_NAME": "my-vault"
      }
    }
  }
}
```

## Available Tools

Once connected, you can use these tools:

- `get_note` - Get a specific note
- `search_notes` - Search notes by query, tags, or folder
- `create_note` - Create a new note
- `update_note` - Update an existing note
- `delete_note` - Delete a note
- `get_vault_stats` - Get vault statistics
- `list_tags` - List all tags
- `list_folders` - List all folders
- `get_knowledge_graph` - Get the complete knowledge graph
- `get_related_notes` - Find related notes
- `analyze_graph` - Analyze graph structure
- `suggest_links` - Suggest potential links

## Example Prompts

Once configured with Claude Desktop, you can ask:

- "Show me all notes tagged with #project"
- "Create a new note called 'Meeting Notes.md' with today's date"
- "Find notes related to 'Architecture Design'"
- "Analyze my knowledge graph and show me orphan notes"
- "Suggest potential links for my note about machine learning"

## Advanced Configuration

### Using Remote Vaults

For remote vaults (requires Obsidian Local REST API plugin):

```json
{
  "vaults": [
    {
      "name": "remote-vault",
      "type": "remote",
      "url": "http://localhost:27124",
      "apiKey": "your-api-key",
      "syncInterval": 60000
    }
  ]
}
```

### Multiple Vaults

You can configure multiple vaults:

```json
{
  "vaults": [
    {
      "name": "personal",
      "type": "local",
      "path": "/path/to/personal/vault"
    },
    {
      "name": "work",
      "type": "local",
      "path": "/path/to/work/vault"
    }
  ]
}
```

When using tools, specify which vault:
- `vault: "personal"` or `vault: "work"`

## Troubleshooting

### Server won't start
- Check that your vault path exists and is accessible
- Verify Node.js version is 18 or higher
- Run `npm run build` to ensure compilation succeeded

### No notes found
- Verify the vault path is correct
- Ensure there are `.md` files in the vault
- Check stderr output for error messages

### Permission errors
- Ensure the vault directory has read/write permissions
- On Unix systems, check with `ls -la /path/to/vault`

## Development

Watch mode for development:
```bash
npm run watch
```

This will automatically recompile when you make changes.

## Next Steps

- See [README.md](README.md) for full documentation
- Check [obsidian-mcp.example.json](obsidian-mcp.example.json) for configuration examples
- Explore the source code in `src/` for customization
