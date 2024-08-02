import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/api';
import { requestsBySeniorIDAndId, responsesByRequestIDAndId, getUser } from './graphql/queries';
import { updateRequest, updateUser } from './graphql/mutations';
import './ViewResponses.css';
import { fetchUserAttributes } from 'aws-amplify/auth';
import ProfileModal from './ProfileModal';
import Modal from 'react-modal';

Modal.setAppElement('#root');

function ViewResponses() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [responses, setResponses] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editRequestModalIsOpen, setEditRequestModalIsOpen] = useState(false);
  const [currentRequest, setCurrentRequest] = useState(null);
  const [updatedRequest, setUpdatedRequest] = useState({});
  const [closeRequestModalIsOpen, setCloseRequestModalIsOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(1);
  const [helpReceived, setHelpReceived] = useState(null);
  const [daysFromNow, setDaysFromNow] = useState('');
  const client = generateClient();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const user = await fetchUserAttributes();
      const seniorID = user.email;
      const result = await client.graphql({
        query: requestsBySeniorIDAndId,
        variables: { seniorID }
      });
      const requests = result.data.requestsBySeniorIDAndId.items;
      setRequests(requests);
  
      // Fetch responses for each request
      const responsesData = {};
      await Promise.all(requests.map(async (request) => {
        const responseResult = await client.graphql({
          query: responsesByRequestIDAndId,
          variables: { requestID: request.id }
        });
        responsesData[request.id] = responseResult.data.responsesByRequestIDAndId.items;
      }));
      setResponses(responsesData);
    } catch (error) {
      console.error('Error fetching requests or responses:', error);
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

  const handleProfileClick = async (userId) => {
    try {
      const result = await client.graphql({
        query: getUser,
        variables: { id: userId }
      });
      const user = result.data.getUser;
      setSelectedUser(user);
      setShowModal(true);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const handleChooseVolunteer = async (requestId, volunteerId, volunteerName) => {
    try {
      await client.graphql({
        query: updateRequest,
        variables: { input: { id: requestId, volunteerID: volunteerId, volunteerName } }
      });
      fetchRequests(); // Refresh the requests after updating
      alert('Volunteer chosen successfully! \nGo ahead, call him!');
    } catch (error) {
      console.error('Error choosing volunteer:', error);
    }
  };

  const openEditRequestModal = (request) => {
    setCurrentRequest(request);
    setUpdatedRequest({
      ...request,
      date: new Date(request.date).toISOString().slice(0, 16), // Convert to datetime-local format
      urgent: request.urgent || false, // Initialize urgent
    });
    setDaysFromNow(calculateDaysFromNow(new Date(request.date)));
    setEditRequestModalIsOpen(true);
  };

  const calculateDaysFromNow = (date) => {
    const currentDate = new Date();
    const diffTime = date - currentDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : '';
  };

  const closeEditRequestModal = () => {
    setEditRequestModalIsOpen(false);
    setCurrentRequest(null);
  };

  const handleUpdateRequestChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setUpdatedRequest({ ...updatedRequest, [name]: checked });
    } else {
      setUpdatedRequest({ ...updatedRequest, [name]: value });
    }
  };

  const handleDaysChange = (e) => {
    const days = e.target.value;
    setDaysFromNow(days);
    if (days) {
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + parseInt(days, 10));
      setUpdatedRequest({ ...updatedRequest, date: newDate.toISOString().slice(0, 16) });
    } else {
      setUpdatedRequest({ ...updatedRequest, date: '' });
    }
  };

  const handleUpdateRequest = async () => {
    try {
      // Define the allowed fields in the UpdateRequestInput type
      const allowedFields = [
        'id',
        'name',
        'title',
        'description',
        'date',
        'location',
        'seniorID',
        'volunteerID',
        'status',
        'country',
        'locale',
        'seniorFeedback',
        'volunteerFeedback',
        'picture',
        'urgent'
      ];

      // Filter out any fields that are not allowed
      const formattedRequest = Object.keys(updatedRequest)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = key === 'date' ? new Date(updatedRequest[key]).toISOString() : updatedRequest[key];
          return obj;
        }, {});

      await client.graphql({
        query: updateRequest,
        variables: { input: formattedRequest }
      });
      closeEditRequestModal();
      fetchRequests(); // Refresh the requests after updating
    } catch (error) {
      console.error('Error updating request:', error);
    }
  };

  const openCloseRequestModal = (request) => {
    if (!request || !request.id) {
      console.error('Request or request ID is missing');
      alert('Error: Request or request ID is missing');
      return;
    }
    setCurrentRequest(request);
    setHelpReceived(null);
    setFeedback('');
    setRating(1); // Set default rating to 1
    setCloseRequestModalIsOpen(true);
  };
  
  const closeCloseRequestModal = () => {
    setCloseRequestModalIsOpen(false);
    setCurrentRequest(null);
    setHelpReceived(null);
    setFeedback('');
    setRating(1);
  };
  
  const handleCloseRequestChange = (e) => {
    const { name, value } = e.target;
    if (name === 'rating') {
      setRating(parseInt(value, 10));
    } else if (name === 'feedback') {
      setFeedback(value);
    } else if (name === 'helpReceived') {
      setHelpReceived(value === 'yes');
    }
  };

  const handleCloseRequest = async () => {
    try {
      if (!currentRequest || !currentRequest.id) {
        console.error('Current request or request ID is missing');
        alert('Error: Current request or request ID is missing');
        return;
      }
  
      const { id, volunteerID } = currentRequest;
  
      // Validate rating value
      const parsedRating = parseInt(rating, 10);
      if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
        console.error('Invalid rating value:', rating);
        alert('Error: Invalid rating value. Please provide a rating between 1 and 5.');
        return;
      }
  
      if (helpReceived) {
        // Update the request with the senior's feedback and status
        await client.graphql({
          query: updateRequest,
          variables: {
            input: {
              id,
              seniorFeedback: feedback,
              status: 'closed',
              rate: parsedRating
            }
          }
        });
  
        // Fetch the volunteer's current data
        const volunteer = await client.graphql({
          query: getUser,
          variables: { id: volunteerID }
        });
  
        const volunteerData = volunteer.data.getUser;
        const newRating = Math.ceil(volunteerData.rating
          ? ((volunteerData.rating * volunteerData.counter) + parsedRating) / (volunteerData.counter + 1)
          : parsedRating);
        const newRateCount = (volunteerData.counter || 0) + 1;
        // Update the volunteer's profile with the new rating
        await client.graphql({
          query: updateUser,
          variables: {
            input: {
              id: volunteerID,
              rating: newRating,
              counter: newRateCount
            }
          }
        });
      } else {
        // Update the request status to 'uncomplete'
        await client.graphql({
          query: updateRequest,
          variables: {
            input: {
              id,
              status: 'uncomplete'
            }
          }
        });
      }
  
      closeCloseRequestModal();
      fetchRequests(); // Refresh the requests after updating
    } catch (error) {
      console.error('Error closing request:', error);
  
      // Display a user-friendly error message
      alert(`An error occurred while closing the request: ${error.message || 'Unknown error'}. Please try again.`);
  
      // Log detailed error information
      if (error.errors) {
        error.errors.forEach(err => {
          console.error('GraphQL Error Message:', err.message);
          console.error('GraphQL Error Path:', err.path);
          console.error('GraphQL Error Extensions:', err.extensions);
        });
      }
    }
  };

  return (
    <div className="cr-page">
      <header className="cr-header">
        <h1 className="cr-title">Responses</h1>
        <nav className="cr-nav">
          <Link to="/forum" className="cr-nav-button">
            Go to Community Forum
          </Link>
          <Link to="/requests" className="cr-nav-button">
            Go to Community Requests
          </Link>
          <button onClick={handleSignOut} className="cr-signout-button">
            Sign Out
          </button>
        </nav>
      </header>
      <main className="cr-main">
        {requests
          .sort((a, b) => (a.status === 'open' && b.status !== 'open' ? -1 : 1))
          .map((request) => (
            <div
              key={request.id}
              className="cr-request-item"
              style={{
                backgroundColor: request.status === 'closed' 
                  ? 'lightgreen' 
                  : (request.status === 'uncomplete' ? '#ffcccb' : 'white')
              }}
            >
              <h3>{request.title}</h3>
              <p>{request.description}</p>
              <p>{new Date(request.date).toLocaleString()}</p>
              <p>{request.location}</p>
              <p>{request.country}</p>
              <p>{request.locale}</p>
              {request.updatedAt && <p>Updated at: {new Date(request.updatedAt).toLocaleString()}</p>}
              {request.pictures && Array.isArray(request.pictures) && (
                <div className="request-pictures">
                  {request.pictures.map((pic, index) => (
                    <img key={index} src={pic} alt={`Request picture ${index + 1}`} className="request-picture" />
                  ))}
                </div>
              )}
              {request.status === 'open' && (
                <>
                  <button onClick={() => openEditRequestModal(request)}>Edit Request</button>
                  <button onClick={() => openCloseRequestModal(request)}>Close Request</button>
                </>
              )}
              <h4>Responses:</h4>
              {request.status === 'open' ? (
                <ul>
                  {responses[request.id] && responses[request.id].length > 0 ? (
                    responses[request.id].map((response) => (
                      <li key={response.id} className="cr-response-item">
                        <div className="cr-response-content">
                          <div>
                            <p>
                              Profile: <span onClick={() => handleProfileClick(response.email)} className="cr-profile-link">{response.name}</span>
                            </p>
                            <p>Message: {response.message}</p>
                            <p>Sent At: {new Date(response.createdAt).toLocaleString()}</p>
                          </div>
                          <button onClick={() => handleChooseVolunteer(request.id, response.volunteerID, response.name)}>Choose</button>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li>No responses yet</li>
                  )}
                </ul>
              ) : (
                request.volunteerID ? (
                  <p>Volunteer: {request.volunteerName}</p>
                ) : (
                  <p>No responses available for closed requests.</p>
                )
              )}
            </div>
        ))}
      </main>
      {showModal && <ProfileModal user={selectedUser} onClose={() => setShowModal(false)} />}
      {editRequestModalIsOpen && (
        <Modal
          isOpen={editRequestModalIsOpen}
          onRequestClose={closeEditRequestModal}
          contentLabel="Edit Request"
          className="edit-request-modal"
          overlayClassName="edit-request-modal-overlay"
        >
          <h2>Edit Request</h2>
          <label>
            Title:
            <input
              type="text"
              name="title"
              value={updatedRequest.title}
              onChange={handleUpdateRequestChange}
            />
          </label>
          <label>
            Description:
            <textarea
              name="description"
              value={updatedRequest.description}
              onChange={handleUpdateRequestChange}
            />
          </label>
          <label htmlFor="daysFromNow" className="pr-help-label">You would like to receive help in the next - days:</label>
          <input
            id="daysFromNow"
            type="number"
            placeholder="Number of days"
            value={daysFromNow}
            onChange={handleDaysChange}
            className="pr-input"
          />
          <div className="edit-urgent-checkbox">
            <label>Mark as urgent: </label>
            <input
              type="checkbox"
              name="urgent"
              checked={updatedRequest.urgent}
              onChange={handleUpdateRequestChange}
            />
          </div>
          <button onClick={handleUpdateRequest}>Save Changes</button>
          <button onClick={closeEditRequestModal}>Cancel</button>
        </Modal>
      )}
      {closeRequestModalIsOpen && (
        <Modal
          isOpen={closeRequestModalIsOpen}
          onRequestClose={closeCloseRequestModal}
          contentLabel="Close Request"
          className="close-request-modal"
          overlayClassName="close-request-modal-overlay"
        >
          <h2>Close Request</h2>
          <h3>Volunteer: {currentRequest.volunteerName}</h3>
          <label>
            Did you receive help?
            <select name="helpReceived" value={helpReceived ? 'yes' : 'no'} onChange={handleCloseRequestChange}>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          {helpReceived !== null && helpReceived && (
            <>
              <label>
                Feedback:
                <textarea
                  name="feedback"
                  value={feedback}
                  onChange={handleCloseRequestChange}
                />
              </label>
              <label>
                Rating:
                <select name="rating" value={rating} onChange={handleCloseRequestChange}>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </label>
            </>
          )}
          <button onClick={handleCloseRequest}>Submit Feedback and Close</button>
          <button onClick={closeCloseRequestModal}>Cancel</button>
        </Modal>
      )}
    </div>
  );
}

export default ViewResponses;
