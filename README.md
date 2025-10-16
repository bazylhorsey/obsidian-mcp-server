# Obsidian MCP Server

[![Tests](https://github.com/YOUR_USERNAME/obsidian-mcp/actions/workflows/test.yml/badge.svg)](https://github.com/YOUR_USERNAME/obsidian-mcp/actions/workflows/test.yml)

A comprehensive Model Context Protocol (MCP) server for [Obsidian](https://obsidian.md/) that provides powerful vault access, knowledge graph analysis, and advanced integration features.

## 📚 Documentation

- **[Quick Start Guide](./QUICKSTART.md)** - Get up and running in 5 minutes
- **[Claude Desktop Setup](./CLAUDE_DESKTOP_SETUP.md)** - Connect to Claude Desktop
- **[Vault Types Explained](./VAULT_TYPES.md)** - Understanding local/remote/API configurations
- **[Testing Guide](./TESTING.md)** - Running tests and contributing
- **[API Documentation](./README.md#available-tools)** - Complete tool reference

## Features

### 🗂️ Multi-Vault Support
- **Local Vaults**: Direct file system access with real-time file watching
- **Remote Vaults**: HTTP/REST API integration with automatic sync
- Seamless switching between multiple vaults

### 🔗 Knowledge Graph
- Build and analyze complete knowledge graphs from your notes
- Find related notes based on links, tags, and content similarity
- Analyze graph structure (hubs, orphan notes, clusters)
- Suggest potential links between related notes
- Path finding between notes

### 🔍 Advanced Search
- Full-text search across all notes
- Filter by tags, folders, and metadata
- Server-side and client-side search strategies

### 📝 Note Operations
- Read, create, update, and delete notes
- Parse Obsidian-flavored markdown with frontmatter
- Extract and track internal links, embeds, and tags
- Automatic backlink generation

### 📊 Analytics
- Vault statistics (note count, word count, link count)
- Tag usage analysis
- Folder structure insights

### 🎯 Obsidian Integration
- Optional integration with community "Local REST API" plugin
- Open notes directly in Obsidian app
- Execute Obsidian commands
- Create daily notes
- Access to Obsidian URI protocol
- **Note:** Requires plugin installation and app running locally

### 🎨 Canvas Support
- Read and manipulate Obsidian Canvas files
- Create and edit canvas nodes (file, text, link, group)
- Manage canvas edges and connections
- Full graph visualization support
- Programmatic canvas generation

### 📊 Dataview Queries
- SQL-like querying over your notes
- Filter by frontmatter metadata and inline fields
- Sort and group results
- Field selection and aggregation
- Support for complex WHERE clauses
- Extract metadata from notes (frontmatter + inline fields)

### 📝 Template System
- Dynamic template rendering with variable substitution
- Built-in date/time variables (`{{date}}`, `{{time}}`, `{{weekday}}`, etc.)
- Custom variable support
- Default values (`{{variable|default}}`)
- Date formatting (`{{date:YYYY-MM-DD}}`)
- Frontmatter merging
- Create notes from templates programmatically

### 📅 Periodic Notes
- Daily, weekly, monthly, and yearly notes
- Automatic date-based naming and organization
- Custom templates for each note type
- Date range calculations
- List and query periodic notes
- Configurable folder structure and formats

## Architecture

The server is built with a clean, modular architecture:

```
┌─────────────────────────────────────────┐
│           MCP Server Layer              │
│  (Tools, Resources, Protocol Handling)  │
└──────────────┬──────────────────────────┘
               │
┌──────────────┴──────────────────────────┐
│        Service Layer                     │
│  • Knowledge Graph Service               │
│  • Canvas Service                        │
│  • Dataview Service                      │
│  • Template Service                      │
│  • Periodic Notes Service                │
│  • Configuration Management              │
└──────────────┬──────────────────────────┘
               │
┌──────────────┴──────────────────────────┐
│        Connector Layer (Adapters)        │
│  • Local Vault Connector (File System)  │
│  • Remote Vault Connector (HTTP API)    │
└──────────────┬──────────────────────────┘
               │
┌──────────────┴──────────────────────────┐
│        Integration Layer                 │
│  • Obsidian API Client                   │
│  • Markdown Parser                       │
└──────────────────────────────────────────┘
```

### Key Design Patterns

- **Adapter Pattern**: Abstract `BaseConnector` interface allows seamless switching between local and remote vaults
- **Service Layer**: Separates business logic (knowledge graph) from data access
- **Configuration Management**: Flexible config from files, environment, or defaults
- **Real-time Updates**: File watchers for local vaults, periodic sync for remote

## Installation

```bash
npm install
npm run build
```

## Configuration

Create a `obsidian-mcp.json` configuration file:

```json
{
  "vaults": [
    {
      "name": "my-local-vault",
      "type": "local",
      "path": "/path/to/obsidian/vault"
    },
    {
      "name": "my-cloud-vault",
      "type": "remote",
      "url": "https://your-sync-server.com/api",
      "apiKey": "your-api-key",
      "syncInterval": 60000
    }
  ],
  "obsidianApi": {
    "restApiUrl": "http://localhost:27124",
    "apiKey": "your-api-key",
    "vaultName": "my-local-vault"
  },
  "server": {
    "name": "obsidian-mcp-server",
    "version": "1.0.0"
  }
}
```

### Vault Types Explained

**Local Vault (`type: "local"`)**
- Direct filesystem access to your Obsidian vault folder
- Fastest performance, real-time file watching
- Use this for vaults stored on your computer or mounted network drives

**Remote Vault (`type: "remote"`)**
- Connects to a self-hosted sync server via HTTP/REST API
- For vaults hosted on your own cloud infrastructure (not Obsidian's sync service)
- Examples: Custom REST API, CouchDB, WebDAV wrapper, etc.
- Requires you to implement or use a compatible sync server

**Obsidian API (Optional)**
- Only needed if you want to control the Obsidian desktop app
- Requires the "Local REST API" community plugin in Obsidian
- Enables: Opening notes in app, executing commands, accessing app features
- NOT used for reading/writing vault content (use local/remote vaults for that)

### Configuration via Environment Variables

Alternatively, use environment variables:

```bash
# Local vault
export OBSIDIAN_VAULT_PATH="/path/to/vault"
export OBSIDIAN_VAULT_NAME="my-vault"

# Remote vault
export OBSIDIAN_REMOTE_URL="https://your-sync-server.com/api"
export OBSIDIAN_REMOTE_NAME="cloud"
export OBSIDIAN_REMOTE_API_KEY="your-key"
export OBSIDIAN_SYNC_INTERVAL="60000"

# Obsidian API (optional)
export OBSIDIAN_API_URL="http://localhost:27124"
export OBSIDIAN_API_KEY="your-key"
```

### Common Configuration Scenarios

**Scenario 1: Just a local vault (most common)**
```json
{
  "vaults": [
    {
      "name": "personal",
      "type": "local",
      "path": "/home/user/Documents/ObsidianVault"
    }
  ]
}
```

**Scenario 2: Local vault + iCloud/Dropbox (also use local type)**
```json
{
  "vaults": [
    {
      "name": "synced",
      "type": "local",
      "path": "/home/user/iCloud/ObsidianVault"
    }
  ]
}
```
Note: iCloud/Dropbox sync is handled by the cloud service itself - just point to the synced folder.

**Scenario 3: Multiple local vaults**
```json
{
  "vaults": [
    {
      "name": "personal",
      "type": "local",
      "path": "/home/user/Documents/PersonalVault"
    },
    {
      "name": "work",
      "type": "local",
      "path": "/home/user/Documents/WorkVault"
    }
  ]
}
```

**Scenario 4: Self-hosted remote server (advanced)**
```json
{
  "vaults": [
    {
      "name": "cloud",
      "type": "remote",
      "url": "https://your-server.com/obsidian-api",
      "apiKey": "your-api-key",
      "syncInterval": 60000
    }
  ]
}
```
Note: Requires you to implement or deploy a compatible REST API server.

## Usage

### Start the Server

```bash
npm start
```

Or use the binary:

```bash
node dist/index.js
```

### Available MCP Tools

The server exposes the following tools through the MCP protocol:

#### Note Operations
- `get_note` - Retrieve a note by path
- `search_notes` - Search notes with filters
- `create_note` - Create a new note
- `update_note` - Update existing note
- `delete_note` - Delete a note

#### Vault Information
- `get_vault_stats` - Get vault statistics
- `list_tags` - List all tags
- `list_folders` - List all folders

#### Knowledge Graph
- `get_knowledge_graph` - Get complete graph structure
- `get_related_notes` - Find related notes
- `analyze_graph` - Analyze graph structure
- `suggest_links` - Suggest potential links

#### Canvas Operations
- `get_canvas` - Read a canvas file
- `create_canvas` - Create a new empty canvas
- `list_canvas_files` - List all canvas files in vault
- `add_canvas_node` - Add a node (file, text, link, or group)
- `add_canvas_edge` - Add an edge/connection between nodes
- `delete_canvas_node` - Delete a node from canvas
- `delete_canvas_edge` - Delete an edge from canvas

#### Dataview Queries
- `dataview_query` - Execute Dataview-style queries on notes
- `get_note_metadata` - Get metadata for a specific note
- `get_unique_values` - Get all unique values for a field

#### Template System
- `list_templates` - List all available templates
- `render_template` - Render a template with variables
- `create_from_template` - Create a new note from a template

#### Periodic Notes
- `create_daily_note` - Create or get daily note
- `create_weekly_note` - Create or get weekly note
- `create_monthly_note` - Create or get monthly note
- `create_yearly_note` - Create or get yearly note
- `get_periodic_note_info` - Get info about a periodic note
- `list_periodic_notes` - List periodic notes in a date range

### MCP Resources

All notes are exposed as resources with URIs:
```
obsidian://{vault-name}/{note-path}
```

## Development

### Project Structure

```
src/
├── index.ts                      # Main MCP server
├── types/                        # TypeScript type definitions
│   ├── index.ts                 # Core types
│   ├── canvas.ts                # Canvas types
│   ├── dataview.ts              # Dataview types
│   ├── template.ts              # Template types
│   └── periodic.ts              # Periodic notes types
├── connectors/                   # Vault connectors (adapters)
│   ├── BaseConnector.ts
│   ├── LocalConnector.ts
│   └── RemoteConnector.ts
├── services/                     # Business logic services
│   ├── KnowledgeGraph.ts        # Knowledge graph analysis
│   ├── CanvasService.ts         # Canvas file operations
│   ├── DataviewService.ts       # Dataview query processing
│   ├── TemplateService.ts       # Template rendering
│   └── PeriodicNotesService.ts  # Periodic notes management
├── api/                          # External API integrations
│   └── ObsidianAPI.ts
└── utils/                        # Utilities
    ├── config.ts
    └── markdown.ts
```

### Build

```bash
npm run build
```

### Watch Mode

```bash
npm run watch
```

## Integration with Obsidian

For advanced features, install the [Obsidian Local REST API](https://github.com/coddingtonbear/obsidian-local-rest-api) plugin:

1. Install the plugin from Obsidian Community Plugins
2. Enable the plugin and note the API key
3. Configure the `obsidianApi` section in your config

## Use Cases

### For AI Assistants
- Access and navigate your Obsidian knowledge base
- Create and update notes based on conversations
- Find related information across notes
- Suggest connections between ideas

### For Automation
- Automated note creation and organization
- Batch processing of notes
- Knowledge graph analysis and visualization
- Link maintenance and suggestions

### For Integrations
- Connect Obsidian with other tools via MCP
- Build custom workflows
- Create dashboards and reports
- Sync with external systems

## Advanced Features

### Canvas Support

Obsidian Canvas is a powerful visual workspace. This server provides full programmatic access to create and manipulate canvas files:

**Example: Create a visual mind map**
```typescript
// Create a new canvas
await mcp.callTool('create_canvas', { canvasPath: 'diagrams/mindmap.canvas' });

// Add nodes
await mcp.callTool('add_canvas_node', {
  canvasPath: 'diagrams/mindmap.canvas',
  nodeType: 'file',
  file: 'notes/central-idea.md',
  x: 0, y: 0, width: 400, height: 200
});

await mcp.callTool('add_canvas_node', {
  canvasPath: 'diagrams/mindmap.canvas',
  nodeType: 'text',
  text: '# Key Concept',
  x: 500, y: 0, width: 300, height: 150,
  color: '1'  // Red
});

// Connect nodes with edges
await mcp.callTool('add_canvas_edge', {
  canvasPath: 'diagrams/mindmap.canvas',
  fromNode: 'node-id-1',
  toNode: 'node-id-2',
  label: 'relates to'
});
```

### Dataview Queries

Query your notes like a database with SQL-like syntax:

**Example: Find recent project notes**
```typescript
await mcp.callTool('dataview_query', {
  query: {
    from: '#project',
    where: [
      { field: 'status', operator: 'eq', value: 'active' },
      { field: 'modified', operator: 'gte', value: '2024-01-01' }
    ],
    sort: [{ field: 'modified', direction: 'desc' }],
    limit: 10
  }
});
```

**Example: Group notes by tag**
```typescript
await mcp.callTool('dataview_query', {
  query: {
    from: 'projects/',
    groupBy: 'status',
    select: ['title', 'modified', 'tags']
  }
});
```

**Example: Get metadata from inline fields**
```typescript
// Note content: "Status:: In Progress\nPriority:: High"
const metadata = await mcp.callTool('get_note_metadata', {
  notePath: 'projects/my-project.md'
});
// Returns: { status: 'In Progress', priority: 'High', ... }
```

### Template System

Create reusable templates with variable substitution and automatic date handling:

**Example: Create a meeting note template**
```markdown
---
tags: [meeting]
templateVariables:
  - name: attendees
    type: string
    description: Meeting attendees
---

# Meeting: {{title}}

**Date:** {{date}}
**Time:** {{time}}
**Attendees:** {{attendees|TBD}}

## Agenda

-

## Notes

## Action Items

- [ ]
```

**Example: Use the template**
```typescript
await mcp.callTool('create_from_template', {
  templatePath: 'Templates/meeting.md',
  targetPath: 'Meetings/2024-01-15-team-sync.md',
  variables: {
    attendees: 'Alice, Bob, Charlie'
  },
  frontmatter: {
    project: 'Q1 Planning'
  }
});
```

**Built-in Variables:**
- `{{date}}` - Current date (YYYY-MM-DD)
- `{{time}}` - Current time (HH:mm)
- `{{datetime}}` - Current datetime
- `{{year}}`, `{{month}}`, `{{day}}` - Date components
- `{{weekday}}` - Day of week (Monday, Tuesday, etc.)
- `{{week}}` - Week number (01-53)
- `{{title}}`, `{{filename}}`, `{{folder}}` - File context

### Periodic Notes

Automatically create and organize daily, weekly, monthly, and yearly notes:

**Example: Create today's daily note**
```typescript
await mcp.callTool('create_daily_note', {
  vault: 'my-vault'
});
// Creates: Daily Notes/2024-01-15.md
```

**Example: Create this week's note**
```typescript
await mcp.callTool('create_weekly_note', {
  vault: 'my-vault',
  variables: {
    goals: 'Complete project proposal'
  }
});
// Creates: Weekly Notes/2024-W03.md
```

**Example: List all monthly notes**
```typescript
await mcp.callTool('list_periodic_notes', {
  vault: 'my-vault',
  type: 'monthly',
  startDate: '2024-01-01',
  endDate: '2024-12-31'
});
```

**Configuration:**
Periodic notes can be configured with custom folders, formats, and templates:
```json
{
  "periodicNotes": {
    "daily": {
      "folder": "Journal/Daily",
      "format": "YYYY-MM-DD",
      "template": "Templates/daily-note.md"
    },
    "weekly": {
      "folder": "Journal/Weekly",
      "format": "YYYY-[W]WW"
    }
  }
}
```

## Technical Highlights

### Markdown Parsing
- Full support for Obsidian-flavored markdown
- Frontmatter extraction (YAML)
- Internal link parsing (`[[link]]`, `[[link|alias]]`)
- Embed detection (`![[embed]]`)
- Tag extraction (`#tag`, `#nested/tag`)
- Inline field parsing (`key:: value` pattern)

### Canvas Operations
- Complete Canvas file format support (JSON-based)
- All node types: file, text, link, group
- Edge/connection management with customization
- Color and styling support
- Programmatic canvas generation

### Dataview Integration
- SQL-like query language for notes
- Multiple filter operators (eq, neq, gt, gte, lt, lte, contains, startsWith, endsWith, exists)
- Sorting and grouping capabilities
- Field selection and projection
- Support for frontmatter and inline fields
- Nested field access with dot notation

### Template System
- Variable substitution with `{{variable}}` syntax
- Built-in date/time variables with formatting
- Default values: `{{variable|default}}`
- Date formatting: `{{date:YYYY-MM-DD}}`
- Frontmatter merging and manipulation
- Template discovery and listing

### Periodic Notes
- Automatic date-based note generation
- Configurable folder structure and naming
- Template integration for custom layouts
- Date range calculations (daily, weekly, monthly, yearly)
- ISO week number support
- Flexible date format patterns

### Link Resolution
- Smart link resolution (title-based and path-based)
- Automatic backlink generation
- Bidirectional link tracking

### Performance
- Efficient caching strategies
- File watching for instant updates
- Lazy loading and pagination support

## Security Considerations

- Local vaults: Requires file system access to vault directory
- Remote vaults: Use HTTPS and secure API keys
- API keys: Never commit to version control
- File watching: Only monitors `.md` files

## Requirements

- Node.js 18 or higher
- TypeScript 5.x
- Access to Obsidian vault(s)

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## Related Projects

- [Obsidian](https://obsidian.md/) - The knowledge base application
- [Obsidian Local REST API](https://github.com/coddingtonbear/obsidian-local-rest-api) - REST API plugin
- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP specification

## Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/yourusername/obsidian-mcp/issues)
- Documentation: See this README

---

Built with ❤️ for the Obsidian and MCP communities
