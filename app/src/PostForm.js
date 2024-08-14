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
  const [listening, setListening] = useState(false);
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

  const resizeImage = (file, maxWidth, maxHeight, callback) => {
    const img = document.createElement('img');
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          callback(blob);
        }, file.type, 0.8); // Adjust quality as needed
      };
    };

    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);

    files.forEach(file => {
      resizeImage(file, 800, 800, (resizedBlob) => {
        const previewUrl = URL.createObjectURL(resizedBlob);
        setPictures(prevPictures => [...prevPictures, { file: resizedBlob, preview: previewUrl }]);
      });
    });
  };

  const handleRemovePhoto = (index) => {
    setPictures((prevPictures) => prevPictures.filter((_, i) => i !== index));
  };

  const handleTagAddition = () => {
    if (tagInput.trim() !== '') {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleTagRemove = (index) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const pictureUrls = await Promise.all(
      pictures.map(async (picture) => {
        if (picture && picture.file) {
          const pictureKey = `${Date.now()}_${picture.file.name}`;
          try {
            const result = await uploadData({
              path: pictureKey,
              data: picture.file,
              options: {
                contentType: picture.file.type,
              },
            });
            return `https://app-storage-76daa9bdaba9d-dev.s3.amazonaws.com/${encodeURIComponent(pictureKey)}`;
          } catch (error) {
            console.log('Error : ', error);
            return null;
          }
        }
        return null;
      })
    );

    const validPictureUrls = pictureUrls.filter((url) => url !== null);

    const input = {
      title,
      content,
      pictures: validPictureUrls,
      likes: 0,
      tags,
      authorID: currentUserId,
    };

    try {
      await client.graphql({ query: createPost, variables: { input } });
      navigate('/forum');
    } catch (error) {
      console.error('Error posting request:', error);
    }
  };

  // Speech Recognition Setup
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = SpeechRecognition ? new SpeechRecognition() : null;

  const startListening = () => {
    if (!recognition) {
      console.warn('Speech recognition is not supported in this browser.');
      return;
    }

    recognition.lang = 'en-US';
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onresult = (event) => {
      const last = event.results.length - 1;
      const speechResult = event.results[last][0].transcript;
      setContent(prev => prev + ' ' + speechResult);
    };

    recognition.start();
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
        <button
          type="button"
          onClick={startListening}
          disabled={listening || !recognition}
          className="pr-add-button voice-button"
        >
          {listening ? 'Listening...' : 'Add Description by Voice'}
        </button>

        <input
          type="file"
          multiple
          onChange={handleFileChange}
          className="pr-input"
        />

        <div className="pr-photo-thumbnails">
          {pictures.map((picture, index) => (
            <div key={index} className="pr-photo-thumbnail">
              <img src={picture.preview} alt={`Preview ${index}`} className="pr-thumbnail-image" />
              <button type="button" className="pr-remove-thumbnail" onClick={() => handleRemovePhoto(index)}>
                &times;
              </button>
            </div>
          ))}
        </div>

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
              <button type="button" className="pr-remove-tag" onClick={() => handleTagRemove(index)}>
                &times;
              </button>
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
