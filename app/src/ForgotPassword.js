import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { generateClient } from 'aws-amplify/api';
import { listPosts } from './graphql/queries';
import LikeButton from './LikeButton';
import './ForumPage.css';

const client = generateClient();

const ForumPage = () => {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const result = await client.graphql({ query: listPosts });
      setPosts(result.data.listPosts.items);
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  return (
    <div className="forum-page">
      <header className="forum-header">
        <h1>Community Forum</h1>
        <Link to="/post-request" className="forum-button">Post a Request</Link>
      </header>
      <section className="forum-posts">
        {posts.map(post => (
          <div key={post.id} className="forum-post">
            <Link to={`/posts/${post.id}`}>
              <h2>{post.title}</h2>
            </Link>
            <p>{post.content}</p>
            <LikeButton postId={post.id} likes={post.likes} />
          </div>
        ))}
      </section>
    </div>
  );
};

export default ForumPage;
