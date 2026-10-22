/**
 * Opens an issue in this repository for every pull request merged into
 * algolia/docsearch's `main` and for every upstream release, so each change can
 * be triaged for porting. Run by `.github/workflows/upstream-alerts.yml`.
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

type PullRequest = {
  number: number;
  title: string;
  merged_at: string | null;
  updated_at: string;
  merge_commit_sha: string;
  user: { login: string };
};

type PullRequestFile = {
  filename: string;
  previous_filename?: string;
  status: string;
  additions: number;
  deletions: number;
};

type Release = {
  tag_name: string;
  html_url: string;
  published_at: string | null;
  draft: boolean;
  prerelease: boolean;
};

type Alert = { key: string; date: string; title: string; body: string };

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

/** Follows pagination until `isDone` says the rest of the pages are older. */
async function paginate<T>(
  path: string,
  isDone: (page: T[]) => boolean = (): boolean => false
): Promise<T[]> {
  const items: T[] = [];
  let next: string | null = path;

  while (next) {
    const page: { data: T[]; next: string | null } = await request<T[]>(next);
    items.push(...page.data);
    next = isDone(page.data) ? null : page.next;
  }

  return items;
}

/**
 * Whether the fork has the file the change touches, or for new files the folder
 * it lands in. Runs from the fork's checkout.
 */
function isInFork(file: PullRequestFile): boolean {
  return existsSync(
    file.status === 'added'
      ? dirname(file.filename)
      : (file.previous_filename ?? file.filename)
  );
}

function triageHint(files: PullRequestFile[]): string {
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

async function pullRequestAlerts(known: Set<string>): Promise<Alert[]> {
  // Sorted by last update, which is never earlier than the merge, so paging
  // can stop at the first page that ends before `since`.
  const pulls = await paginate<PullRequest>(
    `/repos/${UPSTREAM}/pulls?state=closed&base=main&sort=updated&direction=desc&per_page=100`,
    (page) => new Date(page[page.length - 1]?.updated_at ?? 0) < since
  );
  const merged = pulls.filter(
    (pull) =>
      pull.merged_at &&
      new Date(pull.merged_at) > since &&
      !known.has(`pr:${pull.number}`) &&
      // Release PRs are covered by the release's own issue.
      !/^chore(\([^)]*\))?: release\b/i.test(pull.title)
  );

  return Promise.all(
    merged.map(async (pull) => {
      const files = await paginate<PullRequestFile>(
        `/repos/${UPSTREAM}/pulls/${pull.number}/files?per_page=100`
      );
      const commitUrl = `https://github.com/${UPSTREAM}/commit/${pull.merge_commit_sha}`;

      return {
        key: `pr:${pull.number}`,
        date: pull.merged_at!,
        title: `Upstream PR ${pull.number}: ${pull.title}`,
        body: [
          `Merged into \`${UPSTREAM}\` \`main\` on ${pull.merged_at!.slice(0, 10)} as [\`${pull.merge_commit_sha.slice(0, 8)}\`](${commitUrl}) (upstream PR \`${pull.number}\`, author \`${pull.user.login}\`).`,
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
          `git fetch https://github.com/${UPSTREAM}.git ${pull.merge_commit_sha} && git cherry-pick -x ${pull.merge_commit_sha}`,
          '```',
        ].join('\n'),
      };
    })
  );
}

async function releaseAlerts(): Promise<Alert[]> {
  const releases = await paginate<Release>(
    `/repos/${UPSTREAM}/releases?per_page=100`,
    (page) => new Date(page[page.length - 1]?.published_at ?? 0) < since
  );
  // Upstream publishes one release per package (`@docsearch/react@5.1.2`);
  // group them into one alert per version.
  const byVersion = new Map<string, Release[]>();

  for (const release of releases) {
    if (
      release.draft ||
      !release.published_at ||
      new Date(release.published_at) <= since
    ) {
      continue;
    }

    const version = release.tag_name.replace(/^.*@|^v/, '');
    byVersion.set(version, [...(byVersion.get(version) ?? []), release]);
  }

  return Array.from(byVersion, ([version, packages]) => ({
    key: `release:${version}`,
    date: packages[0]!.published_at!,
    title: `Upstream release ${version}${packages.some((r) => r.prerelease) ? ' (prerelease)' : ''}`,
    body: [
      `\`${UPSTREAM}\` published ${version} on ${packages[0]!.published_at!.slice(0, 10)}:`,
      '',
      ...packages.map(
        (release) => `- [\`${release.tag_name}\`](${release.html_url})`
      ),
      '',
      `Each pull request in this release has its own \`${LABEL}\` issue.`,
    ].join('\n'),
  }));
}

async function existingKeys(): Promise<Set<string>> {
  const issues = await paginate<{ body: string | null }>(
    `/repos/${target}/issues?labels=${LABEL}&state=all&per_page=100`
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
const fresh = (await Promise.all([pullRequestAlerts(known), releaseAlerts()]))
  .flat()
  .filter((alert) => !known.has(alert.key))
  .sort((a, b) => a.date.localeCompare(b.date));

if (!dryRun && fresh.length > 0) {
  await ensureLabel();
}

// Oldest first, so issue numbers follow upstream's order.
for (const alert of fresh) {
  const body = `<!-- upstream-sync:${alert.key} -->\n${alert.body}`;

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
