import React, { useState } from 'react';
import { generateClient } from 'aws-amplify/api';
import { createRequest } from './graphql/mutations';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { Link, useNavigate } from 'react-router-dom';
import { uploadData } from 'aws-amplify/storage';
import { getUser } from './graphql/queries';

import './PostRequest.css';

const client = generateClient();

const PostRequest = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [daysFromNow, setDaysFromNow] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [pictures, setPictures] = useState([]);
  const [picturePreviews, setPicturePreviews] = useState([]);
  const [listening, setListening] = useState(false);
  const navigate = useNavigate();

  // Check for browser compatibility with SpeechRecognition
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = SpeechRecognition ? new SpeechRecognition() : null;

  const handleDaysChange = (e) => {
    const days = e.target.value;
    setDaysFromNow(days);
    if (days) {
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + parseInt(days, 10));
      setDate(newDate.toISOString().slice(0, 16)); // Set the date in the format yyyy-MM-ddThh:mm
    } else {
      setDate('');
    }
  };

  const handleDelete = (i) => {
    setTags(tags.filter((tag, index) => index !== i));
  };

  const handleAddition = () => {
    if (tagInput.trim() !== '') {
      setTags([...tags, { id: tags.length + 1, text: tagInput.trim() }]);
      setTagInput('');
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
        setPicturePreviews(prevPreviews => [...prevPreviews, previewUrl]);
      });
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user1 = await fetchUserAttributes();
    const response = await client.graphql({
      query: getUser,
      variables: { id: user1.email }
    });
    const user = response.data.getUser;
    const seniorID = user.email;
    const country = user.country;
    const locale = user.locale;
    const name = user.name;
    const location = user.locale;
    const picture = user.picture;
    const tagsArray = tags.map(tag => tag.text);

    const pictureUrls = await Promise.all(
      pictures.map(async (picture) => {
        const pictureKey = `${Date.now()}_${picture.file.name}`;
        try {
          const result = await uploadData({
            path: pictureKey,
            data: picture.file,
            options: {
              contentType: picture.file.type,
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

    const validPictureUrls = pictureUrls.filter(url => url !== null);

    const input = {
      name,
      title,
      description,
      date: new Date(date).toISOString(),
      location,
      seniorID,
      country,
      locale,
      status: 'open',
      picture,
      urgent,
      tags: tagsArray,
      pictures: validPictureUrls
    };

    try {
      const result = await client.graphql({
        query: createRequest,
        variables: { input }
      });
      navigate('/requests');
    } catch (error) {
      console.error('Error posting request:', error);
    }
  };

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
      setDescription(prev => prev + ' ' + speechResult);
    };

    recognition.start();
  };

  return (
    <div className="pr-page">
      <form onSubmit={handleSubmit} className="pr-form">
        <h2>Post a Request</h2>
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="pr-input"
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows="10"
          cols="50"
          className="pr-textarea"
        />
        <button type="button" onClick={startListening} disabled={listening || !recognition} className="pr-add-button">
          {listening ? 'Listening...' : 'Add Description by Voice'}
        </button>

        <label htmlFor="daysFromNow" className="pr-help-label">You would like to receive help in the next - days:</label>
        <input
          id="daysFromNow"
          type="number"
          placeholder="Number of days"
          value={daysFromNow}
          onChange={handleDaysChange}
          className="pr-input"
        />
        <div className="pr-checkbox">
          <label>Mark as urgent: </label>
          <input
            type="checkbox"
            checked={urgent}
            onChange={(e) => setUrgent(e.target.checked)}
          />
        </div>
        <label htmlFor="tags">Tags:</label>
        <div className="pr-tag-input">
          <input
            type="text"
            placeholder="Enter tag"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            className="pr-input"
          />
          <button type="button" onClick={handleAddition} className="pr-add-button">Add Tag</button>
        </div>
        <div className="pr-tags-list">
          {tags.map((tag, index) => (
            <div key={index} className="pr-tag">
              {tag.text}
              <button type="button" onClick={() => handleDelete(index)} className="pr-tag-delete-button">x</button>
            </div>
          ))}
        </div>
        <label htmlFor="picture-upload" className="pr-picture-label">Add Photos:</label>
        <input
          id="picture-upload"
          type="file"
          multiple
          onChange={handleFileChange}
          className="pr-input"
          style={{ display: 'none' }} // Hide the file input
        />
        <button
          type="button"
          onClick={() => document.getElementById('picture-upload').click()}
          className="pr-add-button"
        >
          Add Photo
        </button>
        <div className="pr-picture-previews">
          {picturePreviews.map((preview, index) => (
            <img key={index} src={preview} alt={`Preview ${index}`} className="pr-picture-preview" />
          ))}
        </div>
        <button className="pr-button" type="submit">Post Request</button>
      </form>
    </div>
  );
};

export default PostRequest;
