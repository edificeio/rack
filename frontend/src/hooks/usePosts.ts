import { useEffect } from "react";
import { usePostStore } from "../store/postStore";

export const usePosts = () => {
  const { posts, loading, error, fetchPosts } = usePostStore();

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return { posts, loading, error };
};
