import { PostClient } from "@edifice.io/demo-client-rest";
import {
  CreatePostDto,
  UpdatePostDto,
  PostQueryDto,
} from "@edifice.io/rack-client-rest";

const postClient = new PostClient();

export const postService = {
  getPosts: (query?: PostQueryDto) => postClient.getPosts(query),
  getPost: (id: number) => postClient.getPost(id),
  createPost: (data: CreatePostDto) => postClient.createPost(data),
  updatePost: (id: number, data: UpdatePostDto) =>
    postClient.updatePost(id, data),
  deletePost: (id: number) => postClient.deletePost(id),
};
