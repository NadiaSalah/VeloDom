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
import {
  createOrderFromServer,
  expireStoreSession,
  getOrderFromServer,
  getStoreSession,
  loginStoreSession,
  logoutStoreSession
} from "#app/domain/backend/store-api-client.js";

const adminPolicy = {
  auth: true,
  roles: ["admin"],
  authRedirect: "/sign-in?reason=admin"
};

export default {
  "admin.bulkUpdate": { ...adminPolicy, handler: admin.bulkUpdateAdminProducts },
  "admin.getProduct": { ...adminPolicy, handler: admin.getAdminProduct },
  "admin.listProducts": { ...adminPolicy, handler: admin.listAdminProducts },
  "admin.updateProduct": { ...adminPolicy, handler: admin.updateAdminProduct },
  "catalog.list": { handler: catalog.listCatalog },
  "catalog.getOne": { handler: catalog.getProduct },
  "cart.quote": { handler: catalog.quoteCart },
  "orders.create": {
    handler: createOrderFromServer,
    auth: true,
    roles: ["admin", "customer"],
    authRedirect: "/sign-in?returnTo=/checkout&reason=checkout"
  },
  "orders.get": {
    handler: getOrderFromServer,
    auth: true
  },
  "session.current": { handler: getStoreSession },
  "session.expire": { handler: expireStoreSession, auth: true },
  "session.login": { handler: loginStoreSession },
  "session.logout": { handler: logoutStoreSession, auth: true }
};
