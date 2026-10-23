/**
 * Opens an issue in this repository for every commit on algolia/docsearch's
 * `main`, so each upstream change can be triaged for porting. Upstream
 * squash-merges pull requests but sometimes pushes directly, so commits cover
 * both, and its `chore: release` commits mark releases. Run by
 * `.github/workflows/upstream-alerts.yml`.
 *
 * Env: `GITHUB_TOKEN` (required), `GITHUB_REPOSITORY` (the repository to open
 * issues in), `UPSTREAM_SINCE` (ISO date; only later changes are reported),
 * `ASSIGNEES` (comma-separated logins), `DRY_RUN=1` (print, don't create).
 */

import { existsSync } from 'node:fs';
import { dirname } from 'node:path';

const UPSTREAM = 'algolia/docsearch';
const LABEL = 'upstream-sync';
const DEFAULT_SINCE = '2026-10-05T20:30:00Z';
const INCIDENTAL_PATHS = ['.changeset/', 'bun.lock'];
const MAX_LISTED_FILES = 50;

const token = process.env.GITHUB_TOKEN;
const target =
  process.env.GITHUB_REPOSITORY ?? 'typesense/typesense-docsearch.js';
// Empty on scheduled runs, where the workflow's `since` input isn't set.
const since = new Date(process.env.UPSTREAM_SINCE || DEFAULT_SINCE);

if (Number.isNaN(since.getTime())) {
  throw new Error(`Invalid UPSTREAM_SINCE: ${process.env.UPSTREAM_SINCE}`);
}
const assignees = (process.env.ASSIGNEES ?? '').split(',').filter(Boolean);
const dryRun = process.env.DRY_RUN === '1';

if (!token) {
  throw new Error('GITHUB_TOKEN is required.');
}

type Commit = {
  sha: string;
  commit: {
    message: string;
    author: { name: string };
    committer: { date: string };
  };
  // The GitHub account behind the commit author, if their email maps to one.
  author: { login: string } | null;
  parents: Array<{ sha: string }>;
};

type CommitFile = {
  filename: string;
  previous_filename?: string;
  status: string;
  additions: number;
  deletions: number;
};

type Alert = { title: string; body: string };

async function request<T>(
  path: string,
  init: RequestInit = {}
): Promise<{ data: T; next: string | null }> {
  const response = await fetch(
    path.startsWith('https://') ? path : `https://api.github.com${path}`,
    {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...init.headers,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `${init.method ?? 'GET'} ${path}: ${response.status} ${await response.text()}`
    );
  }

  const next =
    response.headers.get('link')?.match(/<([^>]+)>;\s*rel="next"/)?.[1] ?? null;

  return { data: (await response.json()) as T, next };
}

async function paginate<T>(path: string): Promise<T[]> {
  const items: T[] = [];
  let next: string | null = path;

  while (next) {
    const page: { data: T[]; next: string | null } = await request<T[]>(next);
    items.push(...page.data);
    next = page.next;
  }

  return items;
}

/**
 * Whether the fork has the file the change touches, or for new files the folder
 * it lands in. Runs from the fork's checkout.
 */
function isInFork(file: CommitFile): boolean {
  return existsSync(
    file.status === 'added'
      ? dirname(file.filename)
      : (file.previous_filename ?? file.filename)
  );
}

function triageHint(files: CommitFile[]): string {
  const relevant = files.filter(
    (file) => !INCIDENTAL_PATHS.some((path) => file.filename.startsWith(path))
  );

  if (
    relevant.some((file) => file.filename.startsWith('packages/docsearch-css/'))
  ) {
    return 'Needs design review: touches `packages/docsearch-css`, which the fork styles itself.';
  }

  if (!relevant.some(isInFork)) {
    return "Likely skip: only touches files the fork doesn't have.";
  }

  return 'Port candidate: touches code the fork still ships.';
}

async function alertFor({ sha, commit, author }: Commit): Promise<Alert> {
  const subject = commit.message.split('\n')[0]!;
  // Squash merges end their subject with the pull request number.
  const pr = subject.match(/ \(#(\d+)\)$/)?.[1];
  const title = pr ? subject.slice(0, subject.lastIndexOf(' (#')) : subject;
  const date = commit.committer.date.slice(0, 10);
  const committed = `[\`${sha.slice(0, 8)}\`](https://github.com/${UPSTREAM}/commit/${sha}) (${pr ? `upstream PR \`${pr}\`` : 'no pull request'}, author \`${author?.login ?? commit.author.name}\`)`;
  const release = title.match(/^chore(\([^)]*\))?: release v?(\d\S*)/i)?.[2];

  if (release) {
    return {
      title: `Upstream release ${release}`,
      body: `\`${UPSTREAM}\` released ${release} on ${date} in ${committed}. Each change in it has its own \`${LABEL}\` issue.`,
    };
  }

  const { data } = await request<{ files: CommitFile[] }>(
    `/repos/${UPSTREAM}/commits/${sha}`
  );
  const { files } = data;

  return {
    title: pr
      ? `Upstream PR ${pr}: ${title}`
      : `Upstream commit ${sha.slice(0, 8)}: ${title}`,
    body: [
      `Committed to \`${UPSTREAM}\` \`main\` on ${date} as ${committed}.`,
      '',
      `**Triage hint:** ${triageHint(files)}`,
      '',
      `<details><summary>Changed files (${files.length})</summary>`,
      '',
      ...files
        .slice(0, MAX_LISTED_FILES)
        .map(
          (file) =>
            `- \`${file.filename}\` (+${file.additions} −${file.deletions})`
        ),
      ...(files.length > MAX_LISTED_FILES
        ? [`- …and ${files.length - MAX_LISTED_FILES} more`]
        : []),
      '',
      '</details>',
      '',
      'To port it:',
      '',
      '```sh',
      `git fetch https://github.com/${UPSTREAM}.git ${sha} && git cherry-pick -x ${sha}`,
      '```',
    ].join('\n'),
  };
}

async function existingKeys(): Promise<Set<string>> {
  // Every issue rather than only labelled ones, so removing the label from an
  // issue can't get it opened again.
  const issues = await paginate<{ body: string | null }>(
    `/repos/${target}/issues?state=all&per_page=100`
  );

  return new Set(
    issues.flatMap((issue) =>
      Array.from(
        (issue.body ?? '').matchAll(/<!-- upstream-sync:(\S+) -->/g),
        (match) => match[1]!
      )
    )
  );
}

async function ensureLabel(): Promise<void> {
  try {
    await request(`/repos/${target}/labels/${LABEL}`);
  } catch {
    await request(`/repos/${target}/labels`, {
      method: 'POST',
      body: JSON.stringify({
        name: LABEL,
        color: '1d76db',
        description: 'Change made upstream in algolia/docsearch',
      }),
    });
  }
}

const known = await existingKeys();
// `since` filters on the commit date, which for a squash merge is the merge.
const commits = await paginate<Commit>(
  `/repos/${UPSTREAM}/commits?sha=main&since=${since.toISOString()}&per_page=100`
);
// Oldest first, so issue numbers follow upstream's order. Merge commits are
// skipped because the commits they bring in are listed too.
const fresh = commits
  .filter(
    (commit) =>
      commit.parents.length === 1 && !known.has(`commit:${commit.sha}`)
  )
  .reverse();

if (!dryRun && fresh.length > 0) {
  await ensureLabel();
}

for (const commit of fresh) {
  const alert = await alertFor(commit);
  const body = `<!-- upstream-sync:commit:${commit.sha} -->\n${alert.body}`;

  if (dryRun) {
    // eslint-disable-next-line no-console
    console.info(`--- ${alert.title}\n${body}\n`);
    continue;
  }

  const { data } = await request<{ html_url: string }>(
    `/repos/${target}/issues`,
    {
      method: 'POST',
      body: JSON.stringify({
        title: alert.title,
        body,
        labels: [LABEL],
        assignees,
      }),
    }
  );
  // eslint-disable-next-line no-console
  console.info(`Opened ${data.html_url}`);
}

// eslint-disable-next-line no-console
console.info(
  `${fresh.length} new upstream change(s) since ${since.toISOString()}${dryRun ? ' (dry run)' : ''}.`
);
