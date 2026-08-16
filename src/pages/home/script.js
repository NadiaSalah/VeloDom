import { listArticles } from "../../api/posts.js";

export async function init({ state }) {
  state.posts = [];
  state.featuredPost = null;
  state.principles = [
    "HTML-first authoring",
    "Compiler-first validation",
    "Folder-first conventions",
    "Runtime-lightweight modules",
    "Vanilla or TypeScript user code"
  ];
  state.metrics = [
    {
      label: "Core docs",
      value: "59 files"
    },
    {
      label: "Tests",
      value: "197 passing"
    },
    {
      label: "TODO",
      value: "100%"
    }
  ];

  const result = await listArticles();

  state.posts = result.posts;
  state.featuredPost = state.posts[0] || null;
}
