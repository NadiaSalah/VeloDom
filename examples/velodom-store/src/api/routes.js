/**
 * ----------------------------------------
 * Module: Storefront Request Registry
 * ----------------------------------------
 *
 * Gives templates stable request names while business behavior remains in
 * replaceable application modules.
 * ----------------------------------------
 */

import * as catalog from "./catalog.js";

export default {
  "catalog.list": { handler: catalog.listCatalog },
  "catalog.getOne": { handler: catalog.getProduct },
  "cart.quote": { handler: catalog.quoteCart },
  "checkout.createMock": { handler: catalog.createMockCheckout }
};
