import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateClient } from 'aws-amplify/api';
import { createPost } from './graphql/mutations';
import { uploadData } from 'aws-amplify/storage';
import { fetchUserAttributes } from 'aws-amplify/auth';
import './PostForm.css';

const client = generateClient();

const PostForm = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pictures, setPictures] = useState([]);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const user = await fetchUserAttributes();
      setCurrentUserId(user.email);
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setPictures(files);
  };

  const handleTagAddition = () => {
    if (tagInput.trim() !== '') {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Upload pictures to S3 and get their URLs
    const pictureUrls = await Promise.all(
      pictures.map(async (picture) => {
        const pictureKey = `${Date.now()}_${picture.name}`;
        try {
          const result = await uploadData({
            path: pictureKey,
            data: picture,
            options: {
              contentType: picture.type,
            },
          });
          console.log('Succeeded: ', result);
          return `https://app-storage-76daa9bdaba9d-dev.s3.amazonaws.com/${encodeURIComponent(pictureKey)}`;
        } catch (error) {
          console.log('Error : ', error);
          return null;
        }
      })
    );

    // Filter out any null values from pictureUrls
    const validPictureUrls = pictureUrls.filter(url => url !== null);

    const input = {
      title,
      content,
      pictures: validPictureUrls, // Use the filtered array here
      likes: 0,
      tags,
      authorID: currentUserId, // Ensure authorID is set correctly
    };

    try {
      await client.graphql({ query: createPost, variables: { input } });
      navigate('/forum');
    } catch (error) {
      console.error('Error posting request:', error);
    }
  };

  return (
    <div className="pr-page">
      <form onSubmit={handleSubmit} className="pr-form">
        <h2>Post to Forum</h2>
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="pr-input"
        />
        <textarea
          placeholder="Description"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="pr-textarea"
        />
        <input
          type="file"
          multiple
          onChange={handleFileChange}
          className="pr-input"
        />
        <div className="pr-tag-input">
          <input
            type="text"
            placeholder="Enter tag"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            className="pr-input"
          />
          <button
            type="button"
            onClick={handleTagAddition}
            className="pr-add-button"
          >
            Add Tag
          </button>
        </div>
        <div className="pr-tags-list">
          {tags.map((tag, index) => (
            <div key={index} className="pr-tag">
              {tag}
            </div>
          ))}
        </div>
        <button type="submit" className="pr-button">
          Post Request
        </button>
      </form>
    </div>
  );
};

export default PostForm;
