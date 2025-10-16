/**
 * Markdown parsing utilities for Obsidian notes
 */

import matter from 'gray-matter';
import type { Note, Link } from '../types/index.js';

/**
 * Extract internal links from markdown content
 * Matches [[link]] and [[link|alias]] patterns
 */
export function extractInternalLinks(content: string, sourcePath: string): Link[] {
  const links: Link[] = [];
  const linkRegex = /\[\[([^\]|]+)(\|([^\]]+))?\]\]/g;

  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    const target = match[1].trim();
    const text = match[3]?.trim() || target;

    links.push({
      source: sourcePath,
      target,
      type: 'internal',
      text
    });
  }

  return links;
}

/**
 * Extract embed links from markdown content
 * Matches ![[embed]] patterns
 */
export function extractEmbedLinks(content: string, sourcePath: string): Link[] {
  const links: Link[] = [];
  const embedRegex = /!\[\[([^\]]+)\]\]/g;

  let match;
  while ((match = embedRegex.exec(content)) !== null) {
    const target = match[1].trim();

    links.push({
      source: sourcePath,
      target,
      type: 'embed'
    });
  }

  return links;
}

/**
 * Extract tags from markdown content
 * Matches #tag patterns (including nested tags like #tag/subtag)
 */
export function extractTags(content: string, frontmatter?: Record<string, any>): string[] {
  const tags = new Set<string>();

  // Extract from frontmatter
  if (frontmatter?.tags) {
    const fmTags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [frontmatter.tags];
    fmTags.forEach(tag => tags.add(String(tag)));
  }

  // Extract from content
  const tagRegex = /#([a-zA-Z0-9_\-\/]+)/g;
  let match;
  while ((match = tagRegex.exec(content)) !== null) {
    tags.add(match[1]);
  }

  return Array.from(tags);
}

/**
 * Parse markdown note with frontmatter
 */
export function parseNote(path: string, rawContent: string, stats?: { mtime?: Date; birthtime?: Date }): Note {
  const { data: frontmatter, content } = matter(rawContent);

  // Extract title from frontmatter or first heading
  let title = frontmatter.title || path.split('/').pop()?.replace('.md', '') || 'Untitled';

  const firstHeadingMatch = content.match(/^#\s+(.+)$/m);
  if (firstHeadingMatch && !frontmatter.title) {
    title = firstHeadingMatch[1].trim();
  }

  const links = [
    ...extractInternalLinks(content, path),
    ...extractEmbedLinks(content, path)
  ];

  const tags = extractTags(content, frontmatter);

  return {
    path,
    title,
    content,
    frontmatter: Object.keys(frontmatter).length > 0 ? frontmatter : undefined,
    tags: tags.length > 0 ? tags : undefined,
    links: links.length > 0 ? links : undefined,
    modifiedAt: stats?.mtime,
    createdAt: stats?.birthtime
  };
}

/**
 * Parse markdown with frontmatter
 * Returns frontmatter, content, and tags
 */
export function parseMarkdown(rawContent: string): {
  frontmatter?: Record<string, any>;
  content: string;
  tags: string[];
} {
  const { data: frontmatter, content } = matter(rawContent);
  const tags = extractTags(content, frontmatter);

  return {
    frontmatter: Object.keys(frontmatter).length > 0 ? frontmatter : undefined,
    content,
    tags
  };
}

/**
 * Convert a note back to markdown with frontmatter
 */
export function serializeNote(note: Note): string {
  if (!note.frontmatter || Object.keys(note.frontmatter).length === 0) {
    return note.content;
  }

  return matter.stringify(note.content, note.frontmatter);
}

/**
 * Extract all words from content for statistics
 */
export function countWords(content: string): number {
  // Remove frontmatter, code blocks, and other non-prose content
  const cleaned = content
    .replace(/^---[\s\S]*?---/, '') // Remove frontmatter
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`[^`]+`/g, '') // Remove inline code
    .replace(/\[\[([^\]]+)\]\]/g, '$1') // Convert links to text
    .replace(/[#*_~`]/g, ''); // Remove markdown syntax

  const words = cleaned.trim().split(/\s+/).filter(word => word.length > 0);
  return words.length;
}
