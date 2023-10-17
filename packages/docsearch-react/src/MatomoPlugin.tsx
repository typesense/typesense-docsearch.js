import debounce from 'lodash/debounce';

declare global {
    interface Window {
        _paq: any;
    }
}

function _matomoSiteSearch(query: string, hits: string) {
        var _paq = window._paq = window._paq || [];
        if (query.length > 0) {
            _paq.push(['trackSiteSearch', query, false, hits]);
        }
}

var matomoSiteSearch_debounced = debounce(_matomoSiteSearch, 400);

export function createMatomoPlugin() {
    return {
        onStateChange({ state }) {
            matomoSiteSearch_debounced(state.query, state.context.nbHits);
        }
    };
};