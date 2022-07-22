import type { DocSearchHit } from './DocSearchHit';

export type StoredDocSearchHit = Omit<DocSearchHit, '_snippetResult'>;
