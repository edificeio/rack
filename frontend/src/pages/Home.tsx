import { useState } from "react";
import PostList from "../components/PostList";
import PostForm from "../components/PostForm";
import SearchBar from "../components/SearchBar";
import { PostQueryDto } from "../../../client/rest";
import { QueryClient } from "@tanstack/react-query";
import { postService } from "../services/api/post.service";

export const loader = (queryClient: QueryClient) => async () => {
  // Preload posts for the home page
  await queryClient.ensureQueryData({
    queryKey: ["posts"],
    queryFn: () => postService.getPosts(),
  });
  return null;
};

export const Root = () => {
  const [query, setQuery] = useState<PostQueryDto>({});

  const handleSearch = (searchTerm: string) => {
    setQuery({ search: searchTerm });
  };

  return (
    <div>
      <h1>Post Demo</h1>
      <PostForm />
      <SearchBar onSearch={handleSearch} />
      <PostList query={query} />
    </div>
  );
};
