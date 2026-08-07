/* eslint-disable react/react-in-jsx-scope */
import { useEffect, useState, type JSX } from 'react';
import { version } from 'typesense-docsearch-react';
import { DocSearchSidepanel } from 'typesense-docsearch-react/sidepanel';

import './App.css';
import 'typesense-docsearch-css/dist/style.css';
import 'typesense-docsearch-css/dist/sidepanel.css';

import { defaultAskAi, defaultCollection, typesenseServerConfig } from './config';
import { AgentStudioExample } from './examples/agent-studio';
import Basic from './examples/basic';
import BasicAskAI from './examples/basic-askai';
import Composable from './examples/composable';
import Default from './examples/default';
import DynamicImportModal from './examples/dynamic-import-modal';
import BasicHybrid from './examples/hybrid';
import MultiIndex from './examples/multi-index';
import WHitComponent from './examples/w-hit-component';
import WTransformItems from './examples/w-hit-transformItems';
import WResultsFooter from './examples/w-results-footer';

function App(): JSX.Element {
  const [dark, setDark] = useState(false);
  return (
    <div className="body-container">
      <div className="app-container">
        <header className="app-header">
          <h1 className="app-title">DocSearch v{version}</h1>
          <p className="app-subtitle">Experience the power of intelligent documentation search</p>
          <button
            type="button"
            onClick={() => {
              setDark(!dark);
              document.documentElement.classList.toggle('dark', !dark);
            }}
          >
            {dark ? '☀️ Light' : '🌙 Dark'}
          </button>{' '}
        </header>

        <main>
          <section className="demo-section">
            <p className="section-description">default</p>
            <div className="default-wrapper">
              <Default />
            </div>
          </section>

          <section className="demo-section">
            <p className="section-description">basic search functionality</p>
            <div className="search-wrapper">
              <Basic />
            </div>
          </section>

          <section className="demo-section">
            <p className="section-description">search with ask ai integration</p>
            <div className="search-wrapper">
              <BasicAskAI />
            </div>
          </section>

          <section className="demo-section">
            <p className="section-description">custom hit rendering</p>
            <div className="search-wrapper">
              <WHitComponent />
            </div>
          </section>

          <section className="demo-section">
            <p className="section-description">transform items before rendering</p>
            <div className="search-wrapper">
              <WTransformItems />
            </div>
          </section>

          <section className="demo-section">
            <p className="section-description">multi index search</p>
            <div className="search-wrapper">
              <MultiIndex />
            </div>
          </section>

          <section className="demo-section">
            <p className="section-description">composable</p>
            <div className="search-wrapper">
              <Composable />
            </div>
          </section>

          <section className="demo-section">
            <p className="section-description">dynamically imported modal</p>
            <div className="search-wrapper">
              <DynamicImportModal />
            </div>
          </section>

          <section className="demo-section">
            <p className="section-description">results footer component</p>
            <div className="search-wrapper">
              <WResultsFooter />
            </div>
          </section>

          <section className="demo-section">
            <p className="section-description">sidepanel hybrid</p>
            <div className="search-wrapper">
              <BasicHybrid />
            </div>
          </section>

          <section className="demo-section">
            <p className="section-description">Ask AI</p>
            <div className="search-wrapper column">
              <AgentStudioExample />
            </div>
          </section>
        </main>
      </div>

      <DocSearchSidepanel
        typesenseServerConfig={typesenseServerConfig}
        typesenseCollectionName={defaultCollection}
        askAi={defaultAskAi}
        panel={{
          suggestedQuestions: ['test suggestion'],
        }}
      />
    </div>
  );
}

export default App;
