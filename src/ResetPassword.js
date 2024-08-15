import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { confirmResetPassword } from 'aws-amplify/auth';
import './ResetPassword.css';

function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const username = location.state?.username;
  const [confirmationCode, setConfirmationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleConfirmResetPassword = async () => {
    try {
      await confirmResetPassword({ username, confirmationCode, newPassword });
      setMessage('Password reset successfully.');
      navigate('/signin');
    } catch (error) {
      console.log(error);
      setMessage('Error confirming password reset. Please try again.');
    }
  };

  return (
    <div className="reset-password-page">
      <section className="reset-password-section">
        <h2>Reset Password</h2>
        <input
          type="text"
          placeholder="Enter your confirmation code"
          value={confirmationCode}
          onChange={(e) => setConfirmationCode(e.target.value)}
        />
        <input
          type="password"
          placeholder="Enter your new password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <button onClick={handleConfirmResetPassword}>Confirm Reset Password</button>
        {message && <p>{message}</p>}
      </section>
    </div>
  );
}

export default ResetPassword;
