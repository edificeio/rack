import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { postService } from "../api/post.service";
import {
  PostQueryDto,
  CreatePostDto,
  UpdatePostDto,
} from "@edifice.io/rack-client-rest";

export const usePosts = (query?: PostQueryDto) =>
  useQuery({
    queryKey: ["posts", query],
    queryFn: () => postService.getPosts(query),
  });

export const usePost = (id: number) =>
  useQuery({
    queryKey: ["post", id],
    queryFn: () => postService.getPost(id),
    enabled: !!id,
  });

export const useCreatePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePostDto) => postService.createPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
};

export const useUpdatePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePostDto }) =>
      postService.updatePost(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
};

export const useDeletePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => postService.deletePost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
};
