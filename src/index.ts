#!/usr/bin/env node

/**
 * Obsidian MCP Server
 * Provides access to Obsidian vaults through the Model Context Protocol
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { LocalConnector } from './connectors/LocalConnector.js';
import { RemoteConnector } from './connectors/RemoteConnector.js';
import { BaseConnector } from './connectors/BaseConnector.js';
import { ObsidianAPI } from './api/ObsidianAPI.js';
import { KnowledgeGraphService } from './services/KnowledgeGraph.js';
import { CanvasService } from './services/CanvasService.js';
import { DataviewService } from './services/DataviewService.js';
import { TemplateService } from './services/TemplateService.js';
import { PeriodicNotesService } from './services/PeriodicNotesService.js';
import { loadConfig } from './utils/config.js';
import type { ServerConfig } from './utils/config.js';

class ObsidianMCPServer {
  private server: Server;
  private connectors: Map<string, BaseConnector> = new Map();
  private obsidianApi?: ObsidianAPI;
  private knowledgeGraph: KnowledgeGraphService;
  private canvasService: CanvasService;
  private dataviewService: DataviewService;
  private templateService: TemplateService;
  private periodicNotesService: PeriodicNotesService;
  private config!: ServerConfig;

  constructor() {
    this.server = new Server(
      {
        name: 'obsidian-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.knowledgeGraph = new KnowledgeGraphService();
    this.canvasService = new CanvasService();
    this.dataviewService = new DataviewService();
    this.templateService = new TemplateService();
    this.periodicNotesService = new PeriodicNotesService(undefined, this.templateService);

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'get_note',
          description: 'Get a note by its path',
          inputSchema: {
            type: 'object',
            properties: {
              vault: { type: 'string', description: 'Vault name' },
              path: { type: 'string', description: 'Path to the note' },
            },
            required: ['vault', 'path'],
          },
        },
        {
          name: 'search_notes',
          description: 'Search for notes in a vault',
          inputSchema: {
            type: 'object',
            properties: {
              vault: { type: 'string', description: 'Vault name' },
              query: { type: 'string', description: 'Search query' },
              tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags' },
              folder: { type: 'string', description: 'Filter by folder' },
              limit: { type: 'number', description: 'Maximum number of results' },
            },
            required: ['vault', 'query'],
          },
        },
        {
          name: 'create_note',
          description: 'Create a new note',
          inputSchema: {
            type: 'object',
            properties: {
              vault: { type: 'string', description: 'Vault name' },
              path: { type: 'string', description: 'Path for the new note' },
              content: { type: 'string', description: 'Note content' },
              frontmatter: { type: 'object', description: 'Frontmatter metadata' },
            },
            required: ['vault', 'path', 'content'],
          },
        },
        {
          name: 'update_note',
          description: 'Update an existing note',
          inputSchema: {
            type: 'object',
            properties: {
              vault: { type: 'string', description: 'Vault name' },
              path: { type: 'string', description: 'Path to the note' },
              content: { type: 'string', description: 'New content' },
              frontmatter: { type: 'object', description: 'Updated frontmatter' },
            },
            required: ['vault', 'path', 'content'],
          },
        },
        {
          name: 'delete_note',
          description: 'Delete a note',
          inputSchema: {
            type: 'object',
            properties: {
              vault: { type: 'string', description: 'Vault name' },
              path: { type: 'string', description: 'Path to the note' },
            },
            required: ['vault', 'path'],
          },
        },
        {
          name: 'get_vault_stats',
          description: 'Get statistics about a vault',
          inputSchema: {
            type: 'object',
            properties: {
              vault: { type: 'string', description: 'Vault name' },
            },
            required: ['vault'],
          },
        },
        {
          name: 'list_tags',
          description: 'List all tags in a vault',
          inputSchema: {
            type: 'object',
            properties: {
              vault: { type: 'string', description: 'Vault name' },
            },
            required: ['vault'],
          },
        },
        {
          name: 'list_folders',
          description: 'List all folders in a vault',
          inputSchema: {
            type: 'object',
            properties: {
              vault: { type: 'string', description: 'Vault name' },
            },
            required: ['vault'],
          },
        },
        {
          name: 'get_knowledge_graph',
          description: 'Get the complete knowledge graph for a vault',
          inputSchema: {
            type: 'object',
            properties: {
              vault: { type: 'string', description: 'Vault name' },
            },
            required: ['vault'],
          },
        },
        {
          name: 'get_related_notes',
          description: 'Get notes related to a specific note',
          inputSchema: {
            type: 'object',
            properties: {
              vault: { type: 'string', description: 'Vault name' },
              path: { type: 'string', description: 'Path to the note' },
              maxDepth: { type: 'number', description: 'Maximum link depth (default: 2)' },
            },
            required: ['vault', 'path'],
          },
        },
        {
          name: 'analyze_graph',
          description: 'Analyze the knowledge graph structure',
          inputSchema: {
            type: 'object',
            properties: {
              vault: { type: 'string', description: 'Vault name' },
            },
            required: ['vault'],
          },
        },
        {
          name: 'suggest_links',
          description: 'Suggest related notes for linking',
          inputSchema: {
            type: 'object',
            properties: {
              vault: { type: 'string', description: 'Vault name' },
              path: { type: 'string', description: 'Path to the note' },
              limit: { type: 'number', description: 'Maximum suggestions (default: 5)' },
            },
            required: ['vault', 'path'],
          },
        },
        // Canvas tools
        {
          name: 'get_canvas',
          description: 'Get canvas file contents',
          inputSchema: {
            type: 'object',
            properties: {
              vault: { type: 'string', description: 'Vault name' },
              path: { type: 'string', description: 'Path to canvas file' },
            },
            required: ['vault', 'path'],
          },
        },
        {
          name: 'create_canvas',
          description: 'Create a new canvas file',
          inputSchema: {
            type: 'object',
            properties: {
              vault: { type: 'string', description: 'Vault name' },
              path: { type: 'string', description: 'Path for new canvas' },
            },
            required: ['vault', 'path'],
          },
        },
        {
          name: 'add_canvas_node',
          description: 'Add a node to canvas (file, text, link, or group)',
          inputSchema: {
            type: 'object',
            properties: {
              vault: { type: 'string', description: 'Vault name' },
              canvasPath: { type: 'string', description: 'Path to canvas file' },
              nodeType: { type: 'string', enum: ['file', 'text', 'link', 'group'], description: 'Type of node' },
              x: { type: 'number', description: 'X coordinate' },
              y: { type: 'number', description: 'Y coordinate' },
              width: { type: 'number', description: 'Node width' },
              height: { type: 'number', description: 'Node height' },
              file: { type: 'string', description: 'File path (for file nodes)' },
              text: { type: 'string', description: 'Text content (for text nodes)' },
              url: { type: 'string', description: 'URL (for link nodes)' },
              label: { type: 'string', description: 'Label (for group nodes)' },
              color: { type: 'string', description: 'Node color (1-6)' },
            },
            required: ['vault', 'canvasPath', 'nodeType', 'x', 'y', 'width', 'height'],
          },
        },
        {
          name: 'add_canvas_edge',
          description: 'Add an edge between nodes in canvas',
          inputSchema: {
            type: 'object',
            properties: {
              vault: { type: 'string', description: 'Vault name' },
              canvasPath: { type: 'string', description: 'Path to canvas file' },
              fromNode: { type: 'string', description: 'Source node ID' },
              toNode: { type: 'string', description: 'Target node ID' },
              label: { type: 'string', description: 'Edge label' },
              color: { type: 'string', description: 'Edge color (1-6)' },
            },
            required: ['vault', 'canvasPath', 'fromNode', 'toNode'],
          },
        },
        {
          name: 'list_canvas_files',
          description: 'List all canvas files in vault',
          inputSchema: {
            type: 'object',
            properties: {
              vault: { type: 'string', description: 'Vault name' },
            },
            required: ['vault'],
          },
        },
        // Dataview tools
        {
          name: 'dataview_query',
          description: 'Execute a Dataview-style query on notes',
          inputSchema: {
            type: 'object',
            properties: {
              vault: { type: 'string', description: 'Vault name' },
              from: { type: 'string', description: 'Source filter (folder path or #tag)' },
              where: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string' },
                    operator: { type: 'string', enum: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'startsWith', 'endsWith', 'exists'] },
                    value: { type: 'string' }
                  }
                },
                description: 'Filter conditions'
              },
              sort: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string' },
                    direction: { type: 'string', enum: ['asc', 'desc'] }
                  }
                },
                description: 'Sort order'
              },
              groupBy: { type: 'string', description: 'Field to group by' },
              select: { type: 'array', items: { type: 'string' }, description: 'Fields to select' },
              limit: { type: 'number', description: 'Maximum results' }
            },
            required: ['vault'],
          },
        },
        {
          name: 'get_note_metadata',
          description: 'Get metadata for a specific note',
          inputSchema: {
            type: 'object',
            properties: {
              vault: { type: 'string', description: 'Vault name' },
              path: { type: 'string', description: 'Note path' },
            },
            required: ['vault', 'path'],
          },
        },
        {
          name: 'get_unique_values',
          description: 'Get all unique values for a metadata field',
          inputSchema: {
            type: 'object',
            properties: {
              vault: { type: 'string', description: 'Vault name' },
              field: { type: 'string', description: 'Metadata field name' },
            },
            required: ['vault', 'field'],
          },
        },
        // Template tools
        {
          name: 'list_templates',
          description: 'List all available templates',
          inputSchema: {
            type: 'object',
            properties: {
              vault: { type: 'string', description: 'Vault name' },
            },
            required: ['vault'],
          },
        },
        {
          name: 'render_template',
          description: 'Render a template with variables',
          inputSchema: {
            type: 'object',
            properties: {
              vault: { type: 'string', description: 'Vault name' },
              templatePath: { type: 'string', description: 'Path to template file' },
              variables: { type: 'object', description: 'Template variables' },
              frontmatter: { type: 'object', description: 'Additional frontmatter' },
              targetPath: { type: 'string', description: 'Target note path (for context)' },
            },
            required: ['vault', 'templatePath'],
          },
        },
        {
          name: 'create_from_template',
          description: 'Create a new note from a template',
          inputSchema: {
            type: 'object',
            properties: {
              vault: { type: 'string', description: 'Vault name' },
              templatePath: { type: 'string', description: 'Path to template file' },
              targetPath: { type: 'string', description: 'Path for new note' },
              variables: { type: 'object', description: 'Template variables' },
              frontmatter: { type: 'object', description: 'Additional frontmatter' },
            },
            required: ['vault', 'templatePath', 'targetPath'],
          },
        },
        // Periodic notes tools
        {
          name: 'create_daily_note',
          description: 'Create a daily note for a specific date',
          inputSchema: {
            type: 'object',
            properties: {
              vault: { type: 'string', description: 'Vault name' },
              date: { type: 'string', description: 'Date (YYYY-MM-DD), defaults to today' },
              variables: { type: 'object', description: 'Additional template variables' },
            },
            required: ['vault'],
          },
        },
        {
          name: 'create_weekly_note',
          description: 'Create a weekly note for a specific date',
          inputSchema: {
            type: 'object',
            properties: {
              vault: { type: 'string', description: 'Vault name' },
              date: { type: 'string', description: 'Date in the week (YYYY-MM-DD), defaults to this week' },
              variables: { type: 'object', description: 'Additional template variables' },
            },
            required: ['vault'],
          },
        },
        {
          name: 'create_monthly_note',
          description: 'Create a monthly note for a specific date',
          inputSchema: {
            type: 'object',
            properties: {
              vault: { type: 'string', description: 'Vault name' },
              date: { type: 'string', description: 'Date in the month (YYYY-MM-DD), defaults to this month' },
              variables: { type: 'object', description: 'Additional template variables' },
            },
            required: ['vault'],
          },
        },
        {
          name: 'create_yearly_note',
          description: 'Create a yearly note for a specific year',
          inputSchema: {
            type: 'object',
            properties: {
              vault: { type: 'string', description: 'Vault name' },
              date: { type: 'string', description: 'Date in the year (YYYY-MM-DD), defaults to this year' },
              variables: { type: 'object', description: 'Additional template variables' },
            },
            required: ['vault'],
          },
        },
        {
          name: 'get_periodic_note_info',
          description: 'Get info about a periodic note',
          inputSchema: {
            type: 'object',
            properties: {
              vault: { type: 'string', description: 'Vault name' },
              type: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'yearly'], description: 'Note type' },
              date: { type: 'string', description: 'Date (YYYY-MM-DD), defaults to today' },
            },
            required: ['vault', 'type'],
          },
        },
        {
          name: 'list_periodic_notes',
          description: 'List periodic notes of a specific type',
          inputSchema: {
            type: 'object',
            properties: {
              vault: { type: 'string', description: 'Vault name' },
              type: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'yearly'], description: 'Note type' },
              startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
              endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
            },
            required: ['vault', 'type'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_note': {
            const connector = this.connectors.get(args?.vault as string);
            if (!connector) {
              throw new Error(`Vault "${args?.vault}" not found`);
            }
            const result = await connector.getNote(args?.path as string);
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          case 'search_notes': {
            const connector = this.connectors.get(args?.vault as string);
            if (!connector) {
              throw new Error(`Vault "${args?.vault}" not found`);
            }
            const result = await connector.searchNotes({
              query: args?.query as string,
              tags: args?.tags as string[] | undefined,
              folder: args?.folder as string | undefined,
              limit: args?.limit as number | undefined,
              includeContent: true,
            });
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          case 'create_note': {
            const connector = this.connectors.get(args?.vault as string);
            if (!connector) {
              throw new Error(`Vault "${args?.vault}" not found`);
            }
            const result = await connector.createNote(args?.path as string, args?.content as string, args?.frontmatter as Record<string, any> | undefined);
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          case 'update_note': {
            const connector = this.connectors.get(args?.vault as string);
            if (!connector) {
              throw new Error(`Vault "${args?.vault}" not found`);
            }
            const result = await connector.updateNote(args?.path as string, args?.content as string, args?.frontmatter as Record<string, any> | undefined);
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          case 'delete_note': {
            const connector = this.connectors.get(args?.vault as string);
            if (!connector) {
              throw new Error(`Vault "${args?.vault}" not found`);
            }
            const result = await connector.deleteNote(args?.path as string);
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          case 'get_vault_stats': {
            const connector = this.connectors.get(args?.vault as string);
            if (!connector) {
              throw new Error(`Vault "${args?.vault}" not found`);
            }
            const result = await connector.getStats();
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          case 'list_tags': {
            const connector = this.connectors.get(args?.vault as string);
            if (!connector) {
              throw new Error(`Vault "${args?.vault}" not found`);
            }
            const result = await connector.listTags();
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          case 'list_folders': {
            const connector = this.connectors.get(args?.vault as string);
            if (!connector) {
              throw new Error(`Vault "${args?.vault}" not found`);
            }
            const result = await connector.listFolders();
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          case 'get_knowledge_graph': {
            const connector = this.connectors.get(args?.vault as string);
            if (!connector) {
              throw new Error(`Vault "${args?.vault}" not found`);
            }
            const notesResult = await connector.getAllNotes();
            if (notesResult.success && notesResult.data) {
              this.knowledgeGraph.updateNotes(notesResult.data);
              const graph = this.knowledgeGraph.buildGraph();
              return {
                content: [{ type: 'text', text: JSON.stringify(graph, null, 2) }],
              };
            }
            throw new Error('Failed to build knowledge graph');
          }

          case 'get_related_notes': {
            const connector = this.connectors.get(args?.vault as string);
            if (!connector) {
              throw new Error(`Vault "${args?.vault}" not found`);
            }
            const notesResult = await connector.getAllNotes();
            if (notesResult.success && notesResult.data) {
              this.knowledgeGraph.updateNotes(notesResult.data);
              const related = this.knowledgeGraph.getRelatedNotes(args?.path as string, (args?.maxDepth as number) || 2);
              return {
                content: [{ type: 'text', text: JSON.stringify(related, null, 2) }],
              };
            }
            throw new Error('Failed to get related notes');
          }

          case 'analyze_graph': {
            const connector = this.connectors.get(args?.vault as string);
            if (!connector) {
              throw new Error(`Vault "${args?.vault}" not found`);
            }
            const notesResult = await connector.getAllNotes();
            if (notesResult.success && notesResult.data) {
              this.knowledgeGraph.updateNotes(notesResult.data);
              const analysis = this.knowledgeGraph.analyzeGraph();
              return {
                content: [{ type: 'text', text: JSON.stringify(analysis, null, 2) }],
              };
            }
            throw new Error('Failed to analyze graph');
          }

          case 'suggest_links': {
            const connector = this.connectors.get(args?.vault as string);
            if (!connector) {
              throw new Error(`Vault "${args?.vault}" not found`);
            }
            const notesResult = await connector.getAllNotes();
            if (notesResult.success && notesResult.data) {
              this.knowledgeGraph.updateNotes(notesResult.data);
              const suggestions = this.knowledgeGraph.suggestRelatedNotes(args?.path as string, (args?.limit as number) || 5);
              return {
                content: [{ type: 'text', text: JSON.stringify(suggestions, null, 2) }],
              };
            }
            throw new Error('Failed to suggest links');
          }

          // Canvas tools
          case 'get_canvas': {
            const connector = this.connectors.get(args?.vault as string);
            if (!connector || !connector.vaultPath) {
              throw new Error(`Vault "${args?.vault}" not found or not a local vault`);
            }
            const result = await this.canvasService.readCanvas(connector.vaultPath, args?.path as string);
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          case 'create_canvas': {
            const connector = this.connectors.get(args?.vault as string);
            if (!connector || !connector.vaultPath) {
              throw new Error(`Vault "${args?.vault}" not found or not a local vault`);
            }
            const result = await this.canvasService.createCanvas(connector.vaultPath, args?.path as string);
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          case 'add_canvas_node': {
            const connector = this.connectors.get(args?.vault as string);
            if (!connector || !connector.vaultPath) {
              throw new Error(`Vault "${args?.vault}" not found or not a local vault`);
            }

            const nodeType = args?.nodeType as string;
            const canvasPath = args?.canvasPath as string;
            const commonOpts = {
              x: args?.x as number,
              y: args?.y as number,
              width: args?.width as number,
              height: args?.height as number,
              color: args?.color as any,
            };

            let result;
            switch (nodeType) {
              case 'file':
                result = await this.canvasService.addFileNode(connector.vaultPath, canvasPath, {
                  ...commonOpts,
                  file: args?.file as string,
                  subpath: args?.subpath as string | undefined,
                });
                break;
              case 'text':
                result = await this.canvasService.addTextNode(connector.vaultPath, canvasPath, {
                  ...commonOpts,
                  text: args?.text as string,
                });
                break;
              case 'link':
                result = await this.canvasService.addLinkNode(connector.vaultPath, canvasPath, {
                  ...commonOpts,
                  url: args?.url as string,
                });
                break;
              case 'group':
                result = await this.canvasService.addGroupNode(connector.vaultPath, canvasPath, {
                  ...commonOpts,
                  label: args?.label as string | undefined,
                });
                break;
              default:
                throw new Error(`Unknown node type: ${nodeType}`);
            }

            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          case 'add_canvas_edge': {
            const connector = this.connectors.get(args?.vault as string);
            if (!connector || !connector.vaultPath) {
              throw new Error(`Vault "${args?.vault}" not found or not a local vault`);
            }

            const result = await this.canvasService.addEdge(connector.vaultPath, args?.canvasPath as string, {
              fromNode: args?.fromNode as string,
              toNode: args?.toNode as string,
              label: args?.label as string | undefined,
              color: args?.color as any,
            });

            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          case 'list_canvas_files': {
            const connector = this.connectors.get(args?.vault as string);
            if (!connector || !connector.vaultPath) {
              throw new Error(`Vault "${args?.vault}" not found or not a local vault`);
            }

            const result = await this.canvasService.listCanvasFiles(connector.vaultPath);
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          // Dataview tools
          case 'dataview_query': {
            const connector = this.connectors.get(args?.vault as string);
            if (!connector) {
              throw new Error(`Vault "${args?.vault}" not found`);
            }

            const notesResult = await connector.getAllNotes();
            if (!notesResult.success || !notesResult.data) {
              throw new Error('Failed to get notes');
            }

            this.dataviewService.updateNotes(notesResult.data);

            const query: any = {};
            if (args?.from) query.from = args.from;
            if (args?.where) query.where = args.where;
            if (args?.sort) query.sort = args.sort;
            if (args?.groupBy) query.groupBy = args.groupBy;
            if (args?.select) query.select = args.select;
            if (args?.limit) query.limit = args.limit;

            const result = await this.dataviewService.executeQuery(query);

            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          case 'get_note_metadata': {
            const connector = this.connectors.get(args?.vault as string);
            if (!connector) {
              throw new Error(`Vault "${args?.vault}" not found`);
            }

            const notesResult = await connector.getAllNotes();
            if (!notesResult.success || !notesResult.data) {
              throw new Error('Failed to get notes');
            }

            this.dataviewService.updateNotes(notesResult.data);

            const metadata = this.dataviewService.getMetadata(args?.path as string);
            if (!metadata) {
              throw new Error(`Note not found: ${args?.path}`);
            }

            return {
              content: [{ type: 'text', text: JSON.stringify(metadata, null, 2) }],
            };
          }

          case 'get_unique_values': {
            const connector = this.connectors.get(args?.vault as string);
            if (!connector) {
              throw new Error(`Vault "${args?.vault}" not found`);
            }

            const notesResult = await connector.getAllNotes();
            if (!notesResult.success || !notesResult.data) {
              throw new Error('Failed to get notes');
            }

            this.dataviewService.updateNotes(notesResult.data);

            const values = this.dataviewService.getUniqueValues(args?.field as string);

            return {
              content: [{ type: 'text', text: JSON.stringify(values, null, 2) }],
            };
          }

          // Template tools
          case 'list_templates': {
            const connector = this.connectors.get(args?.vault as string);
            if (!connector || !connector.vaultPath) {
              throw new Error(`Vault "${args?.vault}" not found or not a local vault`);
            }

            const result = await this.templateService.listTemplates(connector.vaultPath);

            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          case 'render_template': {
            const connector = this.connectors.get(args?.vault as string);
            if (!connector || !connector.vaultPath) {
              throw new Error(`Vault "${args?.vault}" not found or not a local vault`);
            }

            const result = await this.templateService.renderTemplate(
              connector.vaultPath,
              args?.templatePath as string,
              {
                variables: args?.variables as Record<string, any> | undefined,
                frontmatter: args?.frontmatter as Record<string, any> | undefined,
                targetPath: args?.targetPath as string | undefined,
              }
            );

            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          case 'create_from_template': {
            const connector = this.connectors.get(args?.vault as string);
            if (!connector || !connector.vaultPath) {
              throw new Error(`Vault "${args?.vault}" not found or not a local vault`);
            }

            const result = await this.templateService.createFromTemplate(
              connector.vaultPath,
              args?.templatePath as string,
              args?.targetPath as string,
              {
                variables: args?.variables as Record<string, any> | undefined,
                frontmatter: args?.frontmatter as Record<string, any> | undefined,
              }
            );

            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          // Periodic notes tools
          case 'create_daily_note': {
            const connector = this.connectors.get(args?.vault as string);
            if (!connector || !connector.vaultPath) {
              throw new Error(`Vault "${args?.vault}" not found or not a local vault`);
            }

            const date = args?.date ? new Date(args.date as string) : undefined;
            const result = await this.periodicNotesService.createPeriodicNote(
              connector.vaultPath,
              'daily',
              date,
              args?.variables as Record<string, any> | undefined
            );

            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          case 'create_weekly_note': {
            const connector = this.connectors.get(args?.vault as string);
            if (!connector || !connector.vaultPath) {
              throw new Error(`Vault "${args?.vault}" not found or not a local vault`);
            }

            const date = args?.date ? new Date(args.date as string) : undefined;
            const result = await this.periodicNotesService.createPeriodicNote(
              connector.vaultPath,
              'weekly',
              date,
              args?.variables as Record<string, any> | undefined
            );

            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          case 'create_monthly_note': {
            const connector = this.connectors.get(args?.vault as string);
            if (!connector || !connector.vaultPath) {
              throw new Error(`Vault "${args?.vault}" not found or not a local vault`);
            }

            const date = args?.date ? new Date(args.date as string) : undefined;
            const result = await this.periodicNotesService.createPeriodicNote(
              connector.vaultPath,
              'monthly',
              date,
              args?.variables as Record<string, any> | undefined
            );

            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          case 'create_yearly_note': {
            const connector = this.connectors.get(args?.vault as string);
            if (!connector || !connector.vaultPath) {
              throw new Error(`Vault "${args?.vault}" not found or not a local vault`);
            }

            const date = args?.date ? new Date(args.date as string) : undefined;
            const result = await this.periodicNotesService.createPeriodicNote(
              connector.vaultPath,
              'yearly',
              date,
              args?.variables as Record<string, any> | undefined
            );

            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          case 'get_periodic_note_info': {
            const connector = this.connectors.get(args?.vault as string);
            if (!connector || !connector.vaultPath) {
              throw new Error(`Vault "${args?.vault}" not found or not a local vault`);
            }

            const type = args?.type as 'daily' | 'weekly' | 'monthly' | 'yearly';
            const date = args?.date ? new Date(args.date as string) : undefined;
            const result = await this.periodicNotesService.getPeriodicNoteInfo(
              connector.vaultPath,
              type,
              date
            );

            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          case 'list_periodic_notes': {
            const connector = this.connectors.get(args?.vault as string);
            if (!connector || !connector.vaultPath) {
              throw new Error(`Vault "${args?.vault}" not found or not a local vault`);
            }

            const type = args?.type as 'daily' | 'weekly' | 'monthly' | 'yearly';
            const startDate = args?.startDate ? new Date(args.startDate as string) : undefined;
            const endDate = args?.endDate ? new Date(args.endDate as string) : undefined;
            const result = await this.periodicNotesService.listPeriodicNotes(
              connector.vaultPath,
              type,
              startDate,
              endDate
            );

            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: error instanceof Error ? error.message : String(error),
              }),
            },
          ],
          isError: true,
        };
      }
    });

    // List resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const resources = [];

      for (const [vaultName, connector] of this.connectors.entries()) {
        const notesResult = await connector.getAllNotes();
        if (notesResult.success && notesResult.data) {
          for (const note of notesResult.data) {
            resources.push({
              uri: `obsidian://${vaultName}/${note.path}`,
              name: note.title,
              mimeType: 'text/markdown',
              description: `Note from ${vaultName} vault`,
            });
          }
        }
      }

      return { resources };
    });

    // Read resource
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;
      const match = uri.match(/^obsidian:\/\/([^\/]+)\/(.+)$/);

      if (!match) {
        throw new Error('Invalid resource URI');
      }

      const [, vaultName, notePath] = match;
      const connector = this.connectors.get(vaultName);

      if (!connector) {
        throw new Error(`Vault "${vaultName}" not found`);
      }

      const result = await connector.getNote(notePath);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to read note');
      }

      return {
        contents: [
          {
            uri,
            mimeType: 'text/markdown',
            text: result.data.content,
          },
        ],
      };
    });
  }

  async initialize(): Promise<void> {
    // Load configuration
    this.config = await loadConfig();

    // Initialize connectors for each vault
    for (const vaultConfig of this.config.vaults) {
      let connector: BaseConnector;

      if (vaultConfig.type === 'local') {
        connector = new LocalConnector(vaultConfig);
      } else if (vaultConfig.type === 'remote') {
        connector = new RemoteConnector(vaultConfig);
      } else {
        console.error(`Unknown vault type: ${vaultConfig.type}`);
        continue;
      }

      const result = await connector.initialize();
      if (result.success) {
        this.connectors.set(vaultConfig.name, connector);
        console.error(`Initialized ${vaultConfig.type} vault: ${vaultConfig.name}`);
      } else {
        console.error(`Failed to initialize vault ${vaultConfig.name}: ${result.error}`);
      }
    }

    // Initialize Obsidian API if configured
    if (this.config.obsidianApi) {
      this.obsidianApi = new ObsidianAPI(this.config.obsidianApi);
      const available = await this.obsidianApi.isAvailable();
      if (available) {
        console.error('Obsidian API connected');
      } else {
        console.error('Obsidian API not available');
      }
    }

    console.error(`Server initialized with ${this.connectors.size} vault(s)`);
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Obsidian MCP server running on stdio');
  }

  async shutdown(): Promise<void> {
    for (const connector of this.connectors.values()) {
      await connector.close();
    }

    if (this.obsidianApi) {
      this.obsidianApi.close();
    }
  }
}

// Main execution
const server = new ObsidianMCPServer();

async function main() {
  try {
    await server.initialize();
    await server.run();
  } catch (error) {
    console.error('Server error:', error);
    process.exit(1);
  }
}

// Handle shutdown
process.on('SIGINT', async () => {
  console.error('Shutting down...');
  await server.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('Shutting down...');
  await server.shutdown();
  process.exit(0);
});

main();
