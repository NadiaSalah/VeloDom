import * as posts from "./posts.js";

export default {
  "articles.list": {
    handler: posts.listArticles
  },
  "articles.getOne": {
    handler: posts.getOne
  }
};
