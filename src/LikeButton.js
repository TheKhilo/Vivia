import React, { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/api';
import { updatePost } from './graphql/mutations';
import { fetchUserAttributes } from 'aws-amplify/auth';

const client = generateClient();

const LikeButton = ({ postId, likes, likedBy = [] }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [currentLikes, setCurrentLikes] = useState(likes);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await fetchUserAttributes();
        setUserId(user.email);
        setIsLiked(Array.isArray(likedBy) && likedBy.includes(user.email));
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };

    fetchUser();
  }, [likedBy]);

  const handleLike = async () => {
    if (isLiked) return;

    const updatedLikedBy = Array.isArray(likedBy) ? [...likedBy, userId] : [userId];

    const input = {
      id: postId,
      likes: currentLikes + 1,
      likedBy: updatedLikedBy,
    };

    try {
      await client.graphql({ query: updatePost, variables: { input } });
      setCurrentLikes(currentLikes + 1);
      setIsLiked(true);
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  return (
    <button onClick={handleLike} disabled={isLiked}>
      {isLiked ? 'Liked' : 'Like'} ({currentLikes})
    </button>
  );
};

export default LikeButton;
