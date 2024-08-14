import { useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import { getCurrentUser } from '@aws-amplify/auth';
import awsconfig from './aws-exports';

const useConfigureAmplify = () => {
  useEffect(() => {
    getCurrentUser()
      .then(credentials => {
        console.log('Fetched credentials:', credentials);
        Amplify.configure({
          ...awsconfig,
          credentials: credentials
        });
      })
      .catch(err => console.error('Error fetching credentials:', err));
  }, []);
};

export default useConfigureAmplify;
