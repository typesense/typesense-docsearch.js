import React from 'react';
import { DocSearch } from 'typesense-docsearch-react';

import './app.css';
import '@docsearch/css';

function App() {
  const params = {
    typesenseCollectionName: 'docusaurus-2', // Replace with your own doc site's name. Should match the collection name in the scraper settings.

    typesenseServerConfig: {
      nodes: [
        {
          host: 'x3s805zrawjuod9fp-1.a1.typesense.net',
          port: 443,
          protocol: 'https',
        },
        {
          host: 'x3s805zrawjuod9fp-2.a1.typesense.net',
          port: 443,
          protocol: 'https',
        },
      ],
      apiKey: 'c1DmVFTQGnnP5XtW8FV7btCDeTYhBLz6', //insert search key here
    },
    typesenseSearchParameters: {}
  }
  return (
    <div>
      <h1>DocSearch v3 - React</h1>
      <DocSearch
        {...params}
      />
    </div>
  );
}

export default App;
