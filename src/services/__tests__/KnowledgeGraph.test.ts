import { KnowledgeGraphService } from '../KnowledgeGraph.js';
import type { Note } from '../../types/index.js';

describe('KnowledgeGraphService', () => {
  let service: KnowledgeGraphService;
  let testNotes: Note[];

  beforeEach(() => {
    service = new KnowledgeGraphService();
    
    testNotes = [
      {
        path: 'note1.md',
        title: 'Note 1',
        content: 'Content with [[note2]] link',
        tags: ['tag1', 'tag2'],
        links: [
          { source: 'note1.md', target: 'note2', type: 'internal' }
        ]
      },
      {
        path: 'note2.md',
        title: 'Note 2',
        content: 'Content with [[note3]] link',
        tags: ['tag2', 'tag3'],
        links: [
          { source: 'note2.md', target: 'note3', type: 'internal' }
        ]
      },
      {
        path: 'note3.md',
        title: 'Note 3',
        content: 'No links',
        tags: ['tag3']
      },
      {
        path: 'orphan.md',
        title: 'Orphan',
        content: 'Isolated note',
        tags: []
      }
    ];

    service.updateNotes(testNotes);
  });

  describe('updateNotes', () => {
    it('should store notes', () => {
      const graph = service.buildGraph();
      expect(graph.nodes.length).toBeGreaterThan(0);
    });
  });

  describe('buildGraph', () => {
    it('should create nodes for all notes', () => {
      const graph = service.buildGraph();
      const noteNodes = graph.nodes.filter(n => n.type === 'note');
      expect(noteNodes).toHaveLength(4);
    });

    it('should create edges for links', () => {
      const graph = service.buildGraph();
      const linkEdges = graph.edges.filter(e => e.type === 'internal');
      expect(linkEdges.length).toBeGreaterThan(0);
    });

    it('should create tag nodes', () => {
      const graph = service.buildGraph();
      const tagNodes = graph.nodes.filter(n => n.type === 'tag');
      expect(tagNodes.length).toBeGreaterThan(0);
    });

    it('should create folder nodes', () => {
      const notesWithFolders: Note[] = [
        {
          path: 'folder1/note.md',
          title: 'Note in Folder',
          content: 'Content'
        }
      ];
      service.updateNotes(notesWithFolders);
      
      const graph = service.buildGraph();
      const folderNodes = graph.nodes.filter(n => n.type === 'folder');
      expect(folderNodes.length).toBeGreaterThan(0);
    });
  });

  describe('getRelatedNotes', () => {
    it('should find directly linked notes', () => {
      const related = service.getRelatedNotes('note1.md', 1);
      const paths = related.map(n => n.path);
      expect(paths).toContain('note2.md');
    });

    it('should find notes at depth 2', () => {
      const related = service.getRelatedNotes('note1.md', 2);
      const paths = related.map(n => n.path);
      expect(paths).toContain('note2.md');
      expect(paths).toContain('note3.md');
    });

    it('should not include the source note', () => {
      const related = service.getRelatedNotes('note1.md', 2);
      const paths = related.map(n => n.path);
      expect(paths).not.toContain('note1.md');
    });

    it('should return empty for non-existent note', () => {
      const related = service.getRelatedNotes('nonexistent.md', 2);
      expect(related).toHaveLength(0);
    });

    it('should respect max depth', () => {
      const depth1 = service.getRelatedNotes('note1.md', 1);
      const depth2 = service.getRelatedNotes('note1.md', 2);
      expect(depth2.length).toBeGreaterThanOrEqual(depth1.length);
    });
  });

  describe('findPath', () => {
    it('should find direct path', () => {
      const path = service.findPath('note1.md', 'note2.md');
      expect(path).not.toBeNull();
      expect(path).toContain('note1.md');
      expect(path).toContain('note2.md');
    });

    it('should find indirect path', () => {
      const path = service.findPath('note1.md', 'note3.md');
      expect(path).not.toBeNull();
      expect(path).toContain('note1.md');
      expect(path).toContain('note3.md');
    });

    it('should return null for unreachable notes', () => {
      const path = service.findPath('note1.md', 'orphan.md');
      expect(path).toBeNull();
    });

    it('should return single-item path for same note', () => {
      const path = service.findPath('note1.md', 'note1.md');
      expect(path).toEqual(['note1.md']);
    });
  });

  describe('analyzeGraph', () => {
    it('should count total nodes', () => {
      const analysis = service.analyzeGraph();
      expect(analysis.totalNodes).toBe(4);
    });

    it('should count edges', () => {
      const analysis = service.analyzeGraph();
      expect(analysis.totalEdges).toBeGreaterThan(0);
    });

    it('should identify orphan notes', () => {
      const analysis = service.analyzeGraph();
      expect(analysis.orphanNotes).toContain('orphan.md');
    });

    it('should find most connected nodes', () => {
      const analysis = service.analyzeGraph();
      expect(analysis.mostConnectedNodes).toBeDefined();
      expect(analysis.mostConnectedNodes.length).toBeGreaterThan(0);
    });
  });

  describe('getNotesByTag', () => {
    it('should find notes with specific tag', () => {
      const notes = service.getNotesByTag('tag2');
      expect(notes).toHaveLength(2);
    });

    it('should return empty for non-existent tag', () => {
      const notes = service.getNotesByTag('nonexistent');
      expect(notes).toHaveLength(0);
    });
  });

  describe('getNotesByFolder', () => {
    it('should find notes in folder', () => {
      const notesWithFolders: Note[] = [
        { path: 'folder1/note1.md', title: 'Note 1', content: 'Content' },
        { path: 'folder1/note2.md', title: 'Note 2', content: 'Content' },
        { path: 'folder2/note3.md', title: 'Note 3', content: 'Content' }
      ];
      service.updateNotes(notesWithFolders);
      
      const notes = service.getNotesByFolder('folder1');
      expect(notes).toHaveLength(2);
    });
  });

  describe('getAllTags', () => {
    it('should return all tags with counts', () => {
      const tags = service.getAllTags();
      expect(tags.length).toBeGreaterThan(0);
      expect(tags[0]).toHaveProperty('tag');
      expect(tags[0]).toHaveProperty('count');
    });

    it('should sort by count descending', () => {
      const tags = service.getAllTags();
      if (tags.length > 1) {
        expect(tags[0].count).toBeGreaterThanOrEqual(tags[1].count);
      }
    });
  });

  describe('suggestRelatedNotes', () => {
    it('should suggest notes with shared tags', () => {
      const suggestions = service.suggestRelatedNotes('note1.md', 5);
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should return limited results', () => {
      const suggestions = service.suggestRelatedNotes('note1.md', 2);
      expect(suggestions.length).toBeLessThanOrEqual(2);
    });

    it('should not suggest the note itself', () => {
      const suggestions = service.suggestRelatedNotes('note1.md', 5);
      expect(suggestions.map(s => s.path)).not.toContain('note1.md');
    });

    it('should return empty for non-existent note', () => {
      const suggestions = service.suggestRelatedNotes('nonexistent.md', 5);
      expect(suggestions).toHaveLength(0);
    });

    it('should have scores', () => {
      const suggestions = service.suggestRelatedNotes('note1.md', 5);
      if (suggestions.length > 0) {
        expect(suggestions[0]).toHaveProperty('score');
        expect(typeof suggestions[0].score).toBe('number');
      }
    });
  });
});
