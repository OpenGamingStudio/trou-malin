import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { VERSION } from '../src/version';

describe('version', () => {
  it('alignée entre version.ts, package.json et CHANGELOG.md', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(pkg.version).toBe(VERSION);
    expect(readFileSync('CHANGELOG.md', 'utf8')).toContain(`## ${VERSION}`);
  });
});
