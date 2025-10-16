import { extractInternalLinks, extractEmbedLinks, extractTags, parseNote, serializeNote, countWords } from '../markdown.js';

describe('Markdown Utils', () => {
  describe('extractInternalLinks', () => {
    it('should extract simple internal links', () => {
      const content = 'This is a [[link]] to another note.';
      const links = extractInternalLinks(content, 'source.md');
      
      expect(links).toHaveLength(1);
      expect(links[0]).toEqual({
        source: 'source.md',
        target: 'link',
        type: 'internal',
        text: 'link'
      });
    });

    it('should extract links with aliases', () => {
      const content = 'Check [[note|alias text]] here.';
      const links = extractInternalLinks(content, 'source.md');
      
      expect(links).toHaveLength(1);
      expect(links[0].target).toBe('note');
      expect(links[0].text).toBe('alias text');
    });

    it('should extract multiple links', () => {
      const content = '[[first]] and [[second]] notes.';
      const links = extractInternalLinks(content, 'source.md');
      
      expect(links).toHaveLength(2);
      expect(links[0].target).toBe('first');
      expect(links[1].target).toBe('second');
    });

    it('should handle empty content', () => {
      const links = extractInternalLinks('', 'source.md');
      expect(links).toHaveLength(0);
    });
  });

  describe('extractEmbedLinks', () => {
    it('should extract embed links', () => {
      const content = 'Embed: ![[image.png]]';
      const links = extractEmbedLinks(content, 'source.md');
      
      expect(links).toHaveLength(1);
      expect(links[0]).toEqual({
        source: 'source.md',
        target: 'image.png',
        type: 'embed'
      });
    });

    it('should extract multiple embeds', () => {
      const content = '![[image1.png]] and ![[image2.jpg]]';
      const links = extractEmbedLinks(content, 'source.md');
      
      expect(links).toHaveLength(2);
    });
  });

  describe('extractTags', () => {
    it('should extract tags from content', () => {
      const content = 'This has #tag1 and #tag2';
      const tags = extractTags(content);
      
      expect(tags).toContain('tag1');
      expect(tags).toContain('tag2');
      expect(tags).toHaveLength(2);
    });

    it('should extract nested tags', () => {
      const content = 'Nested #project/frontend and #project/backend';
      const tags = extractTags(content);
      
      expect(tags).toContain('project/frontend');
      expect(tags).toContain('project/backend');
    });

    it('should extract tags from frontmatter', () => {
      const frontmatter = { tags: ['yaml-tag1', 'yaml-tag2'] };
      const tags = extractTags('Content with #content-tag', frontmatter);
      
      expect(tags).toContain('yaml-tag1');
      expect(tags).toContain('yaml-tag2');
      expect(tags).toContain('content-tag');
    });

    it('should handle single tag in frontmatter', () => {
      const frontmatter = { tags: 'single-tag' };
      const tags = extractTags('', frontmatter);
      
      expect(tags).toContain('single-tag');
    });

    it('should remove duplicates', () => {
      const content = '#duplicate and #duplicate again';
      const tags = extractTags(content);
      
      expect(tags).toHaveLength(1);
      expect(tags[0]).toBe('duplicate');
    });
  });

  describe('parseNote', () => {
    it('should parse note with frontmatter', () => {
      const content = `---
title: Test Note
tags: [test, demo]
---

# Test Note

Content goes here.`;

      const note = parseNote('test.md', content);
      
      expect(note.path).toBe('test.md');
      expect(note.title).toBe('Test Note');
      expect(note.frontmatter?.title).toBe('Test Note');
      expect(note.tags).toContain('test');
      expect(note.tags).toContain('demo');
      expect(note.content).toContain('Content goes here');
    });

    it('should extract title from first heading', () => {
      const content = `# My Heading\n\nSome content`;
      const note = parseNote('test.md', content);
      
      expect(note.title).toBe('My Heading');
    });

    it('should fallback to filename for title', () => {
      const content = 'Just content, no heading';
      const note = parseNote('my-file.md', content);
      
      expect(note.title).toBe('my-file');
    });

    it('should extract links', () => {
      const content = 'Link to [[other-note]] here.';
      const note = parseNote('test.md', content);
      
      expect(note.links).toHaveLength(1);
      expect(note.links![0].target).toBe('other-note');
    });

    it('should include file stats', () => {
      const content = 'Test content';
      const stats = {
        mtime: new Date('2024-01-01'),
        birthtime: new Date('2023-01-01')
      };
      const note = parseNote('test.md', content, stats);
      
      expect(note.modifiedAt).toEqual(stats.mtime);
      expect(note.createdAt).toEqual(stats.birthtime);
    });
  });

  describe('serializeNote', () => {
    it('should serialize note with frontmatter', () => {
      const note = {
        path: 'test.md',
        title: 'Test',
        content: 'Content here',
        frontmatter: {
          title: 'Test',
          tags: ['tag1', 'tag2']
        }
      };

      const serialized = serializeNote(note);
      
      expect(serialized).toContain('---');
      expect(serialized).toContain('title: Test');
      expect(serialized).toContain('Content here');
    });

    it('should serialize note without frontmatter', () => {
      const note = {
        path: 'test.md',
        title: 'Test',
        content: 'Just content'
      };

      const serialized = serializeNote(note);
      
      expect(serialized).toBe('Just content');
      expect(serialized).not.toContain('---');
    });
  });

  describe('countWords', () => {
    it('should count words in plain text', () => {
      const content = 'This is a test with five words';
      expect(countWords(content)).toBe(7);
    });

    it('should ignore frontmatter', () => {
      const content = `---
title: Test
---

Five words in content`;
      
      expect(countWords(content)).toBe(4);
    });

    it('should ignore code blocks', () => {
      const content = `
Text here

\`\`\`
code code code
\`\`\`

More text`;
      
      const count = countWords(content);
      expect(count).toBeLessThan(10); // Should not count code
    });

    it('should handle empty content', () => {
      expect(countWords('')).toBe(0);
      expect(countWords('   ')).toBe(0);
    });

    it('should convert links to text', () => {
      const content = 'Link to [[other note]] here';
      const count = countWords(content);
      expect(count).toBeGreaterThan(0);
    });
  });
});
