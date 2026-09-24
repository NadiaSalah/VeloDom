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
import * as admin from "./admin.js";

export default {
  "admin.bulkUpdate": { handler: admin.bulkUpdateAdminProducts },
  "admin.getProduct": { handler: admin.getAdminProduct },
  "admin.listProducts": { handler: admin.listAdminProducts },
  "admin.updateProduct": { handler: admin.updateAdminProduct },
  "catalog.list": { handler: catalog.listCatalog },
  "catalog.getOne": { handler: catalog.getProduct },
  "cart.quote": { handler: catalog.quoteCart },
  "checkout.createMock": { handler: catalog.createMockCheckout }
};
