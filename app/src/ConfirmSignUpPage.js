import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { confirmSignUp, signIn } from 'aws-amplify/auth';
import './ConfirmSignUpPage.css';
import { signOut } from 'aws-amplify/auth';

function ConfirmSignUpPage() {
  const [confirmationCode, setConfirmationCode] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const username = location.state?.username;
  const password = location.state?.password; // Assuming password is passed through the location state

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await confirmSignUp({username, confirmationCode});
      await signOut();
      const user = await signIn({ username, password });
      
      navigate('/forum')
    } catch (error) {
      console.error('Error confirming sign-up:', error);
      alert('Error confirming sign-up. Please try again.')
    }
  };

  return (
    <div className="confirm-signup-page">
      <section className="confirm-signup-section">
        <form onSubmit={handleSubmit}>
          <label>
            Confirmation Code:
            <input
              type="text"
              value={confirmationCode}
              onChange={(e) => setConfirmationCode(e.target.value)}
              required
            />
          </label>
          <br />
          <button type="submit">Confirm Sign Up</button>
        </form>
      </section>
    </div>
  );
}

export default ConfirmSignUpPage;
