import { listArticles } from "@/api/posts.js";
import {
  frameworkPrinciples,
  homeMetrics,
  learningPath
} from "@/content/learning.js";

export const state = {
  lessons: learningPath,
  metrics: homeMetrics,
  posts: [],
  principles: frameworkPrinciples
};

export async function init({ state }) {
  const result = await listArticles();
  state.posts = result.posts;
}
