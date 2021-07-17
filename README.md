# Typesense DocSearch.js

This is a fork of Algolia's awesome [DocSearch.js](https://github.com/algolia/docsearch) library, customized to send queries to [Typesense](https://typesense.org).

To be able to use this, you'd first need to setup and run the [Typesense DocSearch Scraper](https://github.com/typesense/typesense-docsearch-scraper).

#### What is Typesense? 

If you're new to Typesense, it is an **open source** search engine that is simple to use, run and scale, with clean APIs and documentation. 

Think of it as an open source alternative to Algolia and an easier-to-use, batteries-included alternative to ElasticSearch. Get a quick overview from [this guide](https://typesense.org/guide/).

## Usage

#### Step 0: Setup typesense-docsearch-scraper

Follow the instructions in the [typesense-docsearch-scraper](https://github.com/typesense/typesense-docsearch-scraper) repo to setup the scraper for your site.

#### Step 1: Add the following snippet to all your pages

```html
<!-- Somwhere in your doc site's navigation -->
<input type="search" id="searchbar">

<!-- Before the closing head -->
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/typesense-docsearch.js@{{docSearchJSVersion}}/dist/cdn/docsearch.min.css"
/>

<!-- Before the closing body -->
<script src="https://cdn.jsdelivr.net/npm/typesense-docsearch.js@{{docSearchJSVersion}}/dist/cdn/docsearch.min.js"></script>

<script>
  docsearch({
    inputSelector: '#searchbar',
    typesenseCollectionName: 'docs', // Should match the collection name you mention in the docsearch scraper config.js
    typesenseServerConfig: { // See here for all possible options under this key: https://typesense.org/docs/0.20.0/api/authentication.html#search-delivery-network
      nodes: [{
        host: 'localhost', // For Typesense Cloud use xxx.a1.typesense.net
        port: '8108',      // For Typesense Cloud use 443
        protocol: 'http'   // For Typesense Cloud use https
      }],
      apiKey: '<SEARCH_API_KEY>', // Use API Key with only Search permissions
    },
    typesenseSearchParams: { // Optional. Any search parameters [here](https://typesense.org/docs/0.20.0/api/documents.html#arguments) can be used.
      filter_by: 'version:=0.21.0'
    },
  });
</script>
```

Read the official [DocSearch documentation](https://docsearch.algolia.com/docs/behavior#handleselected) for information about additional options.

#### Step 2: Style your DocSearch Dropdown

You can override the following styles as needed:

```css

.algolia-autocomplete .ds-dropdown-menu {
  width: 500px;
}

.algolia-autocomplete .typesense-docsearch-suggestion--category-header {
  color: darkgray;
  border: 1px solid gray;
}

.algolia-autocomplete .typesense-docsearch-suggestion--subcategory-column {
  color: gray;
}

.algolia-autocomplete .typesense-docsearch-suggestion--title {
  font-weight: bold;
  color: black;
}

.algolia-autocomplete .typesense-docsearch-suggestion--text {
  font-size: 0.8rem;
  color: gray;
}

.algolia-autocomplete .typesense-docsearch-suggestion--highlight {
  color: blue;
}
```

Notice that you still need to use `.algolia-autocomplete` class names since we use [autocomplete.js](https://github.com/algolia/autocomplete) unmodified, but for docsearch classnames the class names are `.typesense-docsearch-*` since this is a modified version of DocSearch.js.

## Integrations

#### Vuepress component

If you use Vuepress for a documentation framework, here's a [Vue Component](https://github.com/typesense/typesense-website/blob/master/docs-site/content/.vuepress/components/TypesenseSearchBox.vue) that uses this version of DocSearch.


## Help

If you have any questions or run into any problems, please create a Github issue and we'll try our best to help.
