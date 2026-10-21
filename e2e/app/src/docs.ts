import documents from '../../setup/docs.jsonl?raw';

type SeedRecord = {
  id: string;
  url_without_anchor: string;
  anchor?: string;
  type: 'content' | 'lvl1' | 'lvl2';
  content?: string;
  hierarchy: { lvl0: string; lvl1: string; lvl2: string | null };
};

const records = documents
  .trim()
  .split('\n')
  .map((line) => JSON.parse(line) as SeedRecord);

/** The seeded records for a page, in document order. */
export function getDocPageRecords(path: string): SeedRecord[] {
  return records.filter((record) => record.url_without_anchor === path);
}
