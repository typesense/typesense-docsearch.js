import React, { type JSX } from 'react';
import { createRoot } from 'react-dom/client';
import { DocSearch as DocSearchProvider } from 'typesense-docsearch-core';
import {
  DocSearchAskAiModal,
  DocSearchButton,
} from 'typesense-docsearch-modal';
import { DocSearch, DocSearchAI } from 'typesense-docsearch-react';
import { Sidepanel, SidepanelButton } from 'typesense-docsearch-sidepanel';

import { askAi, collectionName, facets, typesenseServerConfig } from './config';
import { getDocPageRecords } from './docs';

type Theme = 'dark' | 'light';

// Each route mounts exactly one search experience so the fixtures' locators
// match a single element.
function Search({ path, theme }: { path: string; theme: Theme }): JSX.Element {
  if (path === '/keyword') {
    return (
      <DocSearch
        typesenseCollectionName={collectionName}
        typesenseServerConfig={typesenseServerConfig}
        facets={facets}
        theme={theme}
      />
    );
  }

  if (path === '/hybrid') {
    return (
      <DocSearchProvider theme={theme}>
        <DocSearchButton />
        <DocSearchAskAiModal
          typesenseCollectionName={collectionName}
          typesenseServerConfig={typesenseServerConfig}
          askAi={askAi}
        />
        <SidepanelButton />
        <Sidepanel
          typesenseCollectionName={collectionName}
          typesenseServerConfig={typesenseServerConfig}
          askAi={askAi}
        />
      </DocSearchProvider>
    );
  }

  return (
    <DocSearchAI
      typesenseCollectionName={collectionName}
      typesenseServerConfig={typesenseServerConfig}
      askAi={askAi}
      facets={facets}
      theme={theme}
    />
  );
}

function DocPage({ path }: { path: string }): JSX.Element {
  const records = getDocPageRecords(path);

  if (records.length === 0) {
    return <h1>Home</h1>;
  }

  return (
    <article>
      <p>{records[0]!.hierarchy.lvl0}</p>
      {records.map((record) => {
        if (record.type === 'lvl1') {
          return <h1 key={record.id}>{record.hierarchy.lvl1}</h1>;
        }

        if (record.type === 'lvl2') {
          return (
            <h2 key={record.id} id={record.anchor}>
              {record.hierarchy.lvl2}
            </h2>
          );
        }

        return <p key={record.id}>{record.content}</p>;
      })}
    </article>
  );
}

function App(): JSX.Element {
  const path = window.location.pathname;
  const [theme, setTheme] = React.useState<Theme>('light');

  React.useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <>
      <header>
        <a href="/">DocSearch e2e</a>
        <Search path={path} theme={theme} />
        <button
          type="button"
          className="ThemeToggle"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          Toggle theme
        </button>
      </header>
      <main>
        <DocPage path={path} />
      </main>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
