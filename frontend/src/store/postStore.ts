import { create } from "zustand";
import { postService } from "../services/api/post.service";
import { Post } from "~/models/post";

interface PostState {
  posts: Post[];
  loading: boolean;
  error: string | null;
  fetchPosts: () => Promise<void>;
  createPost: (
    post: Omit<Post, "id" | "createdAt" | "updatedAt">,
  ) => Promise<void>;
  deletePost: (id: number) => Promise<void>;
}

export const usePostStore = create<PostState>((set) => ({
  posts: [],
  loading: false,
  error: null,

  fetchPosts: async () => {
    set({ loading: true, error: null });
    try {
      const posts = await postService.getPosts();
      set({ posts, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  createPost: async (post) => {
    try {
      const newPost = await postService.createPost(post);
      set((state) => ({ posts: [...state.posts, newPost] }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  deletePost: async (id) => {
    try {
      await postService.deletePost(id);
      set((state) => ({ posts: state.posts.filter((p) => p.id !== id) }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
}));
