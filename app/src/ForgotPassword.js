import React, { useState } from 'react';
import { resetPassword, confirmResetPassword } from 'aws-amplify/auth';
import { useNavigate } from 'react-router-dom'; // Assuming you are using react-router for navigation

function ForgotPassword() {
  const [username, setUsername] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState('requestReset'); // 'requestReset' or 'confirmReset'
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  async function handleResetPassword(username) {
    try {
      const output = await resetPassword({ username });
      handleResetPasswordNextSteps(output);
    } catch (error) {
      setMessage('Error: ' + error.message);
    }
  }

  function handleResetPasswordNextSteps(output) {
    const { nextStep } = output;
    switch (nextStep.resetPasswordStep) {
      case 'CONFIRM_RESET_PASSWORD_WITH_CODE':
        setStep('confirmReset');
        break;
      case 'DONE':
        setMessage('Successfully reset password.');
        break;
      default:
        setMessage('Unexpected step: ' + nextStep.resetPasswordStep);
    }
  }

  async function handleConfirmResetPassword() {
    try {
      await confirmResetPassword({ username, confirmationCode, newPassword });
      setMessage('Password successfully reset.');
      navigate('/signin'); // Redirect to sign-in page after successful reset
    } catch (error) {
      setMessage('Error: ' + error.message);
    }
  }

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-section">
        {step === 'requestReset' && (
          <div>
            <h2>Forgot Password</h2>
            <input
              type="text"
              placeholder="Enter your email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <button onClick={() => handleResetPassword(username)}>Reset Password</button>
          </div>
        )}
        {step === 'confirmReset' && (
          <div>
            <h2>Confirm Password Reset</h2>
            <input
              type="text"
              placeholder="Enter confirmation code"
              value={confirmationCode}
              onChange={(e) => setConfirmationCode(e.target.value)}
            />
            <input
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button onClick={handleConfirmResetPassword}>Confirm Reset</button>
          </div>
        )}
        {message && <p>{message}</p>}
      </div>
    </div>
  );
}

export default ForgotPassword;
