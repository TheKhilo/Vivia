import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { uploadData, remove } from 'aws-amplify/storage';
import Select from 'react-select';
import { Country, State } from 'country-state-city';
import './ProfilePage.css';
import { getUser } from './graphql/queries';
import { updateUser } from './graphql/mutations';
import { generateClient } from 'aws-amplify/api';
import { deleteUser } from 'aws-amplify/auth';
import { requestsBySeniorIDAndId, responsesByVolunteerIDAndId, responsesByRequestIDAndId } from './graphql/queries';
import { deleteUser as deleteUserMutation, deleteRequest, deleteResponse } from './graphql/mutations';

function ProfilePage() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [locale, setLocale] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [profilePicture, setProfilePicture] = useState('');
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [role, setRole] = useState('');
  const [country, setCountry] = useState('');
  const [description, setDescription] = useState('');
  const [rating, setRating] = useState('');
  const [counter, setCounter] = useState('');
  const navigate = useNavigate();
  const client = generateClient();

  const handleDeleteUser = async () => {
    try {
      const userID = user.email;

      // Function to delete all requests by seniorID
      const deleteRequestsBySeniorID = async (seniorID) => {
        const { data } = await client.graphql({
          query: requestsBySeniorIDAndId,
          variables: { seniorID },
        });
        for (const request of data.listRequestsBySeniorID.items) {
          await deleteRequestAndResponses(request.id);
        }
      };

      // Function to delete all responses by volunteerID
      const deleteResponsesByVolunteerID = async (volunteerID) => {
        try {
          const { data } = await client.graphql({
            query: responsesByVolunteerIDAndId,
            variables: { volunteerID },
          });
      
          // Check if the expected data structure exists
          const responses = data?.responsesByVolunteerIDAndId?.items || [];
      
          if (responses.length > 0) {
            // Iterate and delete each response
            for (const response of responses) {
              await client.graphql({
                query: deleteResponse,
                variables: { input: { id: response.id } },
              });
            }
          } else {
            console.warn('No responses found for the provided volunteer ID.');
          }
        } catch (error) {
          console.error('Error deleting responses by volunteer ID:', error);
        }
      };
      

      // Function to delete a request and its responses
      const deleteRequestAndResponses = async (requestID) => {
        try {
          const { data } = await client.graphql({
            query: responsesByRequestIDAndId,
            variables: { requestID },
          });
      
          // Check if the expected data structure exists
          const responses = data?.responsesByRequestIDAndId?.items || [];
      
          if (responses.length > 0) {
            // Iterate and delete each response
            for (const response of responses) {
              await client.graphql({
                query: deleteResponse,
                variables: { input: { id: response.id } },
              });
            }
          } else {
            console.warn('No responses found for the provided request ID.');
          }
      
          // Proceed to delete the request after deleting responses
          await client.graphql({
            query: deleteRequest,
            variables: { input: { id: requestID } },
          });
      
        } catch (error) {
          console.error('Error deleting request and responses:', error);
        }
      };
      

      if (role === 'senior') {
        await deleteRequestsBySeniorID(userID);
      } else if (role === 'volunteer') {
        await deleteResponsesByVolunteerID(userID);
      }

      // Delete the user from the User table
      await client.graphql({
        query: deleteUserMutation,
        variables: { input: { id: userID } },
      });

      // Finally, delete the user from Cognito
      await deleteUser();

      // Navigate to a different page or show a confirmation message
      navigate('/');

    } catch (error) {
      console.log(error);
    }
  }
  const fetchUser = async () => {
    try {
      const userInfo1 = await fetchUserAttributes();
      const response = await client.graphql({
        query: getUser,
        variables: { id: userInfo1.email }
      });

      const userInfo = response.data.getUser;

      if (userInfo) {
        setUser(userInfo);
        setName(userInfo.name || '');
        setEmail(userInfo.email || '');
        setPhoneNumber(userInfo.phone_number || '');
        setBirthdate(userInfo.birthdate || '');
        setLocale(userInfo.locale || '');
        setProfilePicture(userInfo.picture || '');
        setRole(userInfo.role || '');
        setCountry(userInfo.country || '');
        setDescription(userInfo.description || '');
        setRating(userInfo.rating || '');
        setCounter(userInfo.counter || '');
      } else {
        console.log('User not found');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      if (error.errors) {
        console.log('GraphQL Error Details:', error.errors);
        error.errors.forEach(err => {
          console.log('GraphQL Error Message:', err.message);
          console.log('GraphQL Error Path:', err.path);
          console.log('GraphQL Error Extensions:', err.extensions);
        });
      }
    }
  };
  useEffect(() => {
    

    fetchUser();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    try {
      let profilePictureUrl = profilePicture;
  
      if (profilePictureFile) {
        if (profilePicture && profilePicture !== 'https://example.com/default-profile-picture.png') {
          const oldPictureKey = decodeURIComponent(profilePicture.split('/').pop());
          await remove({ path: oldPictureKey });
        }
        const filename = `${email}`;
        await uploadData({
          path: filename,
          data: profilePictureFile,
          options: {
            level: 'public',
            contentType: profilePictureFile.type,
          },
        });
  
        // Add cache-busting query parameter
        profilePictureUrl = `https://app-storage-76daa9bdaba9d-dev.s3.amazonaws.com/${encodeURIComponent(filename)}?t=${new Date().getTime()}`;
      }
  
      const updatedAttributes = {
        id: email,
        name,
        phone_number: phoneNumber,
        birthdate,
        locale,
        picture: profilePictureUrl,
        country: country,
        description: description,
      };
  
      await client.graphql({
        query: updateUser,
        variables: { input: updatedAttributes }
      });
      fetchUser();
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile. Please try again.');
    }
  };
  

  const getCountryOptions = () => {
    return Country.getAllCountries().map((country) => ({
      value: country.name,
      label: country.name,
    }));
  };

  const getStateOptions = (countryName) => {
    const country = Country.getAllCountries().find((c) => c.name === countryName);
    return country ? State.getStatesOfCountry(country.isoCode).map((state) => ({
      value: state.name,
      label: state.name,
    })) : [];
  };

  return (
    <div className="profile-page">
      <section className="profile-section">
        <h2>Profile</h2>
        {!isEditing ? (
          <div className="profile-view">
            {profilePicture && (
              <div className="profile-picture">
                <img src={profilePicture} alt="Profile" />
              </div>
            )}
            <p><strong>Full Name:</strong> {name}</p>
            <p><strong>Description:</strong> {description}</p>
            <p><strong>Email:</strong> {email}</p>
            <p><strong>Phone:</strong> {phoneNumber}</p>
            <p><strong>Birthdate:</strong> {birthdate}</p>
            <p><strong>Country:</strong> {country}</p>
            <p><strong>State:</strong> {locale}</p>
            <p><strong>Role:</strong> {role}</p>
            {role === 'volunteer' && (
              <>
                <p><strong>Rating:</strong> {rating}</p>
                <p><strong>Total Contributions:</strong> {counter}</p>
              </>
            )}
            <button onClick={() => setIsEditing(true)}>Edit Profile</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label>
              Full Name:
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label>
              Description:
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} required />
            </label>
            <label>
              Email:
              <input type="email" value={email} disabled />
            </label>
            <label>
              Phone:
              <input type="text" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required />
            </label>
            <label>
              Birthdate:
              <input type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} required />
            </label>
            <label>
              Country:
              <Select
                options={getCountryOptions()}
                value={{ value: country, label: country }}
                onChange={(selectedOption) => setCountry(selectedOption.value)}
                required
              />
            </label>
            <label>
              State:
              <Select
                options={getStateOptions(country)}
                value={{ value: locale, label: locale }}
                onChange={(selectedOption) => setLocale(selectedOption.value)}
                required
              />
            </label>
            <label>
              Role:
              <input type="text" value={role} disabled />
            </label>
            <label>
              Profile Picture:
              <input type="file" onChange={(e) => setProfilePictureFile(e.target.files[0])} />
            </label>
            <button type="submit">Save</button>
          </form>
        )}
        <div className="navigation-buttons">
          <button onClick={() => navigate('/forum')}>Back to Forum</button>
          <button onClick={() => navigate('/requests')}>Back to Request</button>
          <button onClick={handleDeleteUser}>Delete Account</button>
        </div>
      </section>
    </div>
  );
}

export default ProfilePage;
