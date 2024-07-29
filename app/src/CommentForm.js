import React, { useState } from 'react';
import { generateClient } from 'aws-amplify/api';
import { createComment } from './graphql/mutations';
import './CommentForm.css';

const client = generateClient();

const CommentForm = ({ postId }) => {
  const [content, setContent] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const input = { postID: postId, content, likes: 0 };
    try {
      await client.graphql({ query: createComment, variables: { input } });
      setContent('');
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="comment-form">
      <textarea
        placeholder="Write a comment..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="comment-input"
      />
      <button type="submit" className="comment-button">Comment</button>
    </form>
  );
};

export default CommentForm;
