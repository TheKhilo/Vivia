import React from 'react';
import './ProfileModal.css';

const ProfileModal = ({ user, onClose }) => {
  if (!user) return null;

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <button className="profile-modal-close" onClick={onClose}>X</button>
        <div className="profile-picture">
          <img src={user.picture} alt={`${user.name}'s profile`} />
        </div>
        <h2>{user.name}</h2>
        <div className="profile-view">
          <p>Email: {user.email}</p>
          <p>Phone Number: {user.phone_number}</p>
          <p>Birthdate: {user.birthdate}</p>
          <p>Locale: {user.locale}</p>
          <p>Country: {user.country}</p>
          <p>Role: {user.role}</p>
          <p>Description: {user.description}</p>
          <p>Rating: {user.rating}</p>
          <p>Total Contributions: {user.counter}</p>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
