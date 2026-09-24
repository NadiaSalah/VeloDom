/**
 * ----------------------------------------
 * Module: Catalog Page Behavior
 * ----------------------------------------
 *
 * Prepares URL-backed filter links and request retry parameters around the
 * public catalog result supplied by the page-data contract.
 * ----------------------------------------
 */

export const state = {
  catalogResult: null,
  catalogLoading: false,
  catalogError: "",
  filters: {},
  failureFilters: {},
  searchQuery: "",
  selectedCategory: "all",
  selectedSort: "featured",
  categoryLinks: [],
  previousHref: "/",
  nextHref: "/",
  locale: "en-US"
};

export function init({ state, data }) {
  applyCatalogResult(state, data);
}

function applyCatalogResult(state, result) {
  state.catalogResult = result;
  state.filters = { ...result.filters };
  state.failureFilters = { ...result.filters, mode: "error" };
  state.searchQuery = result.filters.q;
  state.selectedCategory = result.filters.category;
  state.selectedSort = result.filters.sort;
  state.previousHref = createCatalogHref(result.filters, result.filters.page - 1);
  state.nextHref = createCatalogHref(result.filters, result.filters.page + 1);
  state.categoryLinks = [
    { id: "all", label: "All products" },
    ...result.categories
  ].map(category => ({
    ...category,
    active: category.id === result.filters.category,
    href: createCatalogHref({
      ...result.filters,
      category: category.id
    }, 1)
  }));
}

function createCatalogHref(filters, page) {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.category && filters.category !== "all") {
    params.set("category", filters.category);
  }
  if (filters.sort && filters.sort !== "featured") {
    params.set("sort", filters.sort);
  }
  if (page > 1) params.set("page", String(page));

  const query = params.toString();
  return query ? `/?${query}` : "/";
}
