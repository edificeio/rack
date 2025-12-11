import React, { useEffect, useState } from "react";
import { postService } from "../services/api/post.service";
import { PostDto, PostQueryDto } from "../../../client/rest";

interface PostListProps {
  query?: PostQueryDto;
}

const PostList: React.FC<PostListProps> = ({ query }) => {
  const [posts, setPosts] = useState<PostDto[]>([]);

  useEffect(() => {
    if (
      query &&
      (query.search || query.authorId || query.limit || query.offset)
    ) {
      postService.getPosts(query).then(setPosts);
    } else {
      postService.getPosts().then(setPosts);
    }
  }, [query]);

  return (
    <div>
      <h2>Posts</h2>
      <ul>
        {posts.map((post) => (
          <li key={post.id}>
            <h3>{post.title}</h3>
            <p>{post.content}</p>
            <small>
              By {post.authorId} on{" "}
              {new Date(post.createdAt).toLocaleDateString()}
            </small>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PostList;
