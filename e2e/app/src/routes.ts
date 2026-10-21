// Routes of the test app, rendered as the header nav. Each mounts one search
// experience (see `react.tsx` and `vanilla.ts`).
export const ROUTES = [
  { path: '/', title: 'DocSearchAI with facets' },
  { path: '/keyword', title: 'DocSearch (keyword only)' },
  { path: '/hybrid', title: 'Modal + Sidepanel (hybrid)' },
  { path: '/js', title: 'Vanilla JS wrappers' },
];

export function getRouteTitle(path: string): string | undefined {
  return ROUTES.find((route) => route.path === path)?.title;
}
