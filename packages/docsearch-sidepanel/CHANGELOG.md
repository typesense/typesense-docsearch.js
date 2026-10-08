# typesense-docsearch-sidepanel

## 5.0.2-2

### Patch Changes

- Updated dependencies [d7a7937]
  - typesense-docsearch-react@5.0.2-2
  - typesense-docsearch-css@5.0.2-2
  - typesense-docsearch-core@5.0.2-2

## 5.0.2-1

### Patch Changes

- Updated dependencies
  - typesense-docsearch-react@5.0.2-1
  - typesense-docsearch-css@5.0.2-1
  - typesense-docsearch-core@5.0.2-1

## 5.0.2

### Patch Changes

- Updated dependencies [1508196]
- Updated dependencies [59c575f]
  - typesense-docsearch-react@5.0.2
  - typesense-docsearch-css@5.0.2
  - typesense-docsearch-core@5.0.2

## 5.0.1

### Patch Changes

- Updated dependencies [4ac53c4]
  - typesense-docsearch-react@5.0.1
  - typesense-docsearch-css@5.0.1
  - typesense-docsearch-core@5.0.1

## 5.0.0

### Major Changes

- ecd905d: # DocSearch v5-beta

  DocSearch v5 is a major release that introduces AI-powered answers via Agent
  Studio, a refreshed search UI, and a modernized package architecture.

  ## Ask AI & Agent Studio

  - Agent Studio integration with core tools and dynamic tool calls
  - Conversation memory support
  - Compatibility with the Algolia MCP search tool, with aggregated MCP search
    tool calls
  - Dynamic index selection for Agent Studio
  - Feedback integration, including feedback notes and tags
  - Prompt suggestions in keyword search and follow-up prompt suggestions
  - Ask AI modal split into its own component and Ask AI transport layer removed

  ## Search UI

  - Refreshed v5 UI with improved dark theme, sources panel, and accessibility
  - Faceted search with filter chips
  - Hit breadcrumbs and result badges

  ## Packaging & architecture

  - New `typesense-docsearch-cli` package for MCP setup and search
  - MCP plugin support
  - Split JS bundles for search-only usage and JS-based hybrid mode
  - Migrated the build system to tsdown
  - Migrated CSS building to LightningCSS

  ## Breaking changes

  - Ask AI related props are now nested under a single root `askai` option
  - The Ask AI transport layer has been removed

### Patch Changes

- ecd905d: feat(v5): UI and DX updates

  - Rename the Ask AI assistantId option to agentId (adapter theme.SearchModal.askAi.assistantId → agentId)
  - appId and apiKey moved up into typesense-docsearch-core, so they're configured once and shared
  - Removed the indexName prop from the Sidepanel
  - Facet defaults can now be read from the index searchParameters
  - Restored nested grouping of search results

- Updated dependencies [ecd905d]
- Updated dependencies [ecd905d]
- Updated dependencies [ecd905d]
- Updated dependencies [ecd905d]
- Updated dependencies [ecd905d]
- Updated dependencies [ecd905d]
- Updated dependencies [ecd905d]
- Updated dependencies [ecd905d]
- Updated dependencies [ecd905d]
- Updated dependencies [ecd905d]
- Updated dependencies [ecd905d]
- Updated dependencies [ecd905d]
- Updated dependencies [ecd905d]
  - typesense-docsearch-react@5.0.0
  - typesense-docsearch-css@5.0.0
  - typesense-docsearch-core@5.0.0

## 5.0.0-beta.4

### Patch Changes

- Updated dependencies [ee9fddb]
  - typesense-docsearch-css@5.0.0-beta.4
  - typesense-docsearch-react@5.0.0-beta.4
  - typesense-docsearch-core@5.0.0-beta.4

## 5.0.0-beta.3

### Patch Changes

- Updated dependencies [3f74c33]
- Updated dependencies [b33a7f7]
- Updated dependencies [fe4d0c2]
- Updated dependencies [4e44b55]
- Updated dependencies [9a1b3e4]
- Updated dependencies [b28bc84]
  - typesense-docsearch-core@5.0.0-beta.3
  - typesense-docsearch-react@5.0.0-beta.3
  - typesense-docsearch-css@5.0.0-beta.3

## 5.0.0-beta.2

### Patch Changes

- 4f6b5b1: feat(v5): UI and DX updates

  - Rename the Ask AI assistantId option to agentId (adapter theme.SearchModal.askAi.assistantId → agentId)
  - appId and apiKey moved up into typesense-docsearch-core, so they're configured once and shared
  - Removed the indexName prop from the Sidepanel
  - Facet defaults can now be read from the index searchParameters
  - Restored nested grouping of search results

- Updated dependencies [5eac1fd]
- Updated dependencies [4f6b5b1]
- Updated dependencies [9fe6738]
  - typesense-docsearch-react@5.0.0-beta.2
  - typesense-docsearch-css@5.0.0-beta.2
  - typesense-docsearch-core@5.0.0-beta.2

## 5.0.0-beta.1

### Patch Changes

- Updated dependencies [f8e0678]
- Updated dependencies [09861c8]
  - typesense-docsearch-react@5.0.0-beta.1
  - typesense-docsearch-css@5.0.0-beta.1
  - typesense-docsearch-core@5.0.0-beta.1

## 5.0.0-beta.0

### Major Changes

- a8ed1ea: # DocSearch v5-beta

  DocSearch v5 is a major release that introduces AI-powered answers via Agent
  Studio, a refreshed search UI, and a modernized package architecture.

  ## Ask AI & Agent Studio

  - Agent Studio integration with core tools and dynamic tool calls
  - Conversation memory support
  - Compatibility with the Algolia MCP search tool, with aggregated MCP search
    tool calls
  - Dynamic index selection for Agent Studio
  - Feedback integration, including feedback notes and tags
  - Prompt suggestions in keyword search and follow-up prompt suggestions
  - Ask AI modal split into its own component and Ask AI transport layer removed

  ## Search UI

  - Refreshed v5 UI with improved dark theme, sources panel, and accessibility
  - Faceted search with filter chips
  - Hit breadcrumbs and result badges

  ## Packaging & architecture

  - New `typesense-docsearch-cli` package for MCP setup and search
  - MCP plugin support
  - Split JS bundles for search-only usage and JS-based hybrid mode
  - Migrated the build system to tsdown
  - Migrated CSS building to LightningCSS

  ## Breaking changes

  - Ask AI related props are now nested under a single root `askai` option
  - The Ask AI transport layer has been removed

### Patch Changes

- Updated dependencies [a8ed1ea]
  - typesense-docsearch-core@5.0.0-beta.0
  - typesense-docsearch-css@5.0.0-beta.0
  - typesense-docsearch-react@5.0.0-beta.0
