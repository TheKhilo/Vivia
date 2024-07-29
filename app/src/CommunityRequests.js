import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'aws-amplify/auth';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/api';
import Modal from 'react-modal';
import { listRequests } from './graphql/queries';
import { createResponse } from './graphql/mutations';
import './CommunityRequests.css';
import { getUser } from './graphql/queries';
import Select from 'react-select';

Modal.setAppElement('#root'); // Adjust if your app root is different

function CommunityRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [message, setMessage] = useState('');
  const client = generateClient();
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [role, setRole] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true); // Add loading state
  const [filterUrgent, setFilterUrgent] = useState(false);
  const [filterCountry, setFilterCountry] = useState(null);
  const [filterLocale, setFilterLocale] = useState(null);
  const [filterTags, setFilterTags] = useState('');

  useEffect(() => {
    fetchUser();
    fetchRequests();
  }, []);

  const fetchUser = async () => {
    try {
      const user = await fetchUserAttributes();
      const response = await client.graphql({
        query: getUser,
        variables: { id: user.email },
      });
      const userData = response.data.getUser;
      setRole(userData.role);
      setUserEmail(userData.email);
      setLoading(false); // Set loading to false after fetching user data
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchRequests = async () => {
    try {
      const result = await client.graphql({
        query: listRequests,
        variables: {
          filter: { status: { eq: "open" } },
        },
      });
      setRequests(result.data.listRequests.items);
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  const handleRespond = async (requestID) => {
    if (role === 'senior') {
      alert("Seniors cannot respond to their own requests.");
      return;
    }
    try {
      const response = await client.graphql({
        query: getUser,
        variables: { id: userEmail }
      });
  
      const user = response.data.getUser;
      const volunteerID = user.email; // Use the user's unique ID
      const email = user.email || '';
      const name = user.name;
    
      const input = {
        requestID,
        volunteerID,
        message,
        email,
        name
      };
  
      await client.graphql({
        query: createResponse,
        variables: { input }
      });
  
      setModalIsOpen(false); // Close the modal after sending response
      setMessage(''); // Clear the message after sending
    } catch (error) {
      console.error('Error responding to request:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.log('Error signing out:', error);
    }
  };

  const openModal = (request) => {
    setSelectedRequest(request);
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
    setSelectedRequest(null);
    setMessage('');
  };

  const filteredRequests = requests.filter((request) => {
    const matchesUrgent = filterUrgent ? request.urgent === filterUrgent : true;
    const matchesCountry = filterCountry ? request.country === filterCountry.value : true;
    const matchesLocale = filterLocale ? request.locale === filterLocale.value : true;
    const matchesTags = filterTags ? filterTags.split(',').every(tag => Array.isArray(request.tags) && request.tags.includes(tag.trim())) : true;
    return matchesUrgent && matchesCountry && matchesLocale && matchesTags;
  });

  const sortedRequests = filteredRequests.sort((a, b) => new Date(a.date) - new Date(b.date));

  const countryOptions = requests.map(request => ({ value: request.country, label: request.country })).filter((v, i, a) => a.findIndex(t => t.value === v.value) === i);
  const localeOptions = requests.map(request => ({ value: request.locale, label: request.locale })).filter((v, i, a) => a.findIndex(t => t.value === v.value) === i);

  return (
    <div className="community-page">
      <header className="community-header">
        <h1 className="community-title">Community Requests</h1>
        <nav className="community-nav">
          <Link to="/forum" className="community-nav-button">
            Go to Community Forum
          </Link>
          <Link to="/leaderboard" className="community-nav-button">
            Leaderboard
          </Link>
          {role === 'volunteer' && (
            <Link to="/volunteer-responses" className="community-nav-button">
              Responses
            </Link>
          )}
          {role === 'senior' && (
            <Link to="/senior-responses" className="community-nav-button">
              Responses
            </Link>
          )}
          {role !== 'volunteer' && (
            <Link to="/post-request" className="community-nav-button">
              Post a Request
            </Link>
          )}
          <Link to="/profile" className="community-nav-button">
            View Profile
          </Link>
          <button onClick={handleSignOut} className="community-signout-button">
            Sign Out
          </button>
        </nav>
      </header>
      <main className="community-main">
        <div className="community-filters">
          <label>
            Urgent:
            <input
              type="checkbox"
              checked={filterUrgent}
              onChange={(e) => setFilterUrgent(e.target.checked)}
            />
          </label>
          <label>
            Country:
            <Select
              value={filterCountry}
              onChange={setFilterCountry}
              options={countryOptions}
              placeholder="Select a country"
            />
          </label>
          <label>
            State:
            <Select
              value={filterLocale}
              onChange={setFilterLocale}
              options={localeOptions}
              placeholder="Select a state"
            />
          </label>
          <label>
            Tags:
            <input
              type="text"
              placeholder="Enter tags"
              value={filterTags}
              onChange={(e) => setFilterTags(e.target.value)}
              className="community-tag-input"
            />
          </label>
        </div>
        <ul className="community-request-list">
          {sortedRequests.map((request) => (
            <li key={request.id} className={`community-request-item ${request.urgent ? 'urgent-request' : ''}`}>
              {request.picture && <img src={request.picture} alt={`${request.name}'s profile`} className="community-request-picture" />}
              <h3>{request.name}</h3>
              <h4>{request.title}</h4>
              <p>{request.description}</p>
              <p><strong>Due date:</strong> {request.date ? new Date(request.date).toLocaleString() : 'No date provided'}</p>
              <p>{request.country || 'No country provided'}</p>
              <p>{request.locale || 'No locale provided'}</p>
              {request.tags && request.tags.length > 0 && (
                <div className="community-tags">
                  <strong>Tags:</strong>
                  <ul className="community-tag-list">
                    {request.tags.map((tag, index) => (
                      <li key={index} className="community-tag">{tag}</li>
                    ))}
                  </ul>
                </div>
              )}
              {Array.isArray(request.pictures) && request.pictures.length > 0 && (
                <div className="community-request-pictures">
                  {request.pictures.map((pic, index) => (
                    <img key={index} src={pic} alt={`Request picture ${index + 1}`} className="community-request-pictures" />
                  ))}
                </div>
              )}
              {request.urgent && <p className="urgent-text">This request is urgent!</p>}
              {role === 'senior' ? null : (
                <button 
                  onClick={() => openModal(request)} 
                  className="community-respond-button"
                >
                  Respond
                </button>
              )}
              {selectedRequest && selectedRequest.id === request.id && (
                <Modal
                  isOpen={modalIsOpen}
                  onRequestClose={closeModal}
                  contentLabel="Respond to Request"
                  className="community-modal"
                  overlayClassName="community-modal-overlay"
                >
                  <h3>Respond to {selectedRequest.name}</h3>
                  <textarea
                    placeholder="Message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="community-textarea"
                  />
                  <button onClick={() => handleRespond(selectedRequest.id)} className="community-send-button">
                    Send Response
                  </button>
                  <button onClick={closeModal} className="community-cancel-button">
                    Cancel
                  </button>
                </Modal>
              )}
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

export default CommunityRequests;
