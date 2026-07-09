import * as posts from "./posts.js";
import * as users from "./users.js";

export default {
  "posts.getAll": posts.getAll,
  "posts.search": posts.search,
  "posts.getTags": posts.getTags,
  "posts.getByTag": posts.getByTag,
  "posts.getOne": posts.getOne,
  "posts.getComments": posts.getComments,
  "posts.create": posts.create,
  "posts.update": posts.update,
  "posts.delete": posts.remove,
  "comments.create": posts.addComment,
  "users.getAll": users.getAll,
  "users.getOne": users.getOne,
  "auth.login": users.login,
  "demo.middlewarePost": {
    handler: posts.getOne,
    middleware: ["trimStringFields", "requestLogger"]
  }
};
