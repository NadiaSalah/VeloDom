import * as posts from "./posts.js";
import * as users from "./users.js";

export default {
  "posts.getAll": posts.getAll,
  "posts.getOne": posts.getOne,
  "posts.create": posts.create,
  "posts.update": posts.update,
  "posts.delete": posts.remove,
  "users.getAll": users.getAll,
  "users.getOne": users.getOne,
  "demo.authPost": {
    handler: posts.getOne,
    auth: "demo"
  },
  "demo.adminPost": {
    handler: posts.getOne,
    auth: "demo",
    roles: ["admin"]
  },
  "demo.editorPost": {
    handler: posts.getOne,
    auth: "demo",
    roles: ["editor", "admin"]
  },
  "demo.middlewarePost": {
    handler: posts.getOne,
    middleware: ["trimStringFields", "requestLogger"]
  },
  "demo.serverAuthPost": {
    handler: posts.getOne,
    auth: true
  }
};
