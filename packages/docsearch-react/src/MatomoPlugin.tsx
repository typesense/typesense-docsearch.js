import debounce from 'lodash/debounce';

declare global {
    interface Window {
        _paq: any;
    }
}

var query_cache = "";

function _matomoSiteSearch(query: string, hits: string) {
        query_cache = query;
        var _paq = window._paq = window._paq || [];
        _paq.push(['trackSiteSearch', query, false, hits]);
}

var matomoSiteSearch_debounced = debounce(_matomoSiteSearch, 500);

export function createMatomoPlugin() {
    return {
        onStateChange({ state }) {
            if ( state.isOpen && state.query.length > 2 && query_cache !== state.query ) {
                matomoSiteSearch_debounced(state.query, state.context.nbHits);
            }
        },
    };
};