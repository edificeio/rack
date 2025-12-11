import React, { useState } from "react";
import { postService } from "../services/api/post.service";

const PostForm: React.FC = () => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [authorId, setAuthorId] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await postService.createPost({ title, content, authorId });
    setTitle("");
    setContent("");
    setAuthorId("");
    // Refresh list, but for simplicity, not implemented
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Create Post</h2>
      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <textarea
        placeholder="Content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required
      />
      <input
        type="text"
        placeholder="Author ID"
        value={authorId}
        onChange={(e) => setAuthorId(e.target.value)}
        required
      />
      <button type="submit">Create</button>
    </form>
  );
};

export default PostForm;
