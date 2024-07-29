import React, { useEffect, useState } from 'react';
import { listUsers } from './graphql/queries';
import { generateClient } from 'aws-amplify/api';

import './Leaderboard.css';

const Leaderboard = () => {
  const [volunteers, setVolunteers] = useState([]);
  const client = generateClient();

  useEffect(() => {
    fetchVolunteers();
  }, []);

  const fetchVolunteers = async () => {
    try {
      const filter = { role: { eq: "volunteer" } };
      const { data } = await client.graphql({query:listUsers, variables:{filter },});
      const sortedVolunteers = data.listUsers.items.sort((a, b) => {
        if (b.rating === a.rating) {
          return b.counter - a.counter;
        }
        return b.rating - a.rating;
      });
      setVolunteers(sortedVolunteers);
    } catch (error) {
      console.error('Error fetching volunteers:', error);
    }
  };

  return (
    <div className="leaderboard-page">
      <header className="leaderboard-header">
        <h1 className="leaderboard-title">Volunteer Leaderboard</h1>
      </header>
      <main className="leaderboard-main">
        <ul className="leaderboard-list">
          {volunteers.map((volunteer, index) => (
            <li key={volunteer.id} className="leaderboard-item">
              <span className="leaderboard-rank">{index + 1}</span>
              <img src={volunteer.picture} alt={volunteer.name} className="leaderboard-picture" />
              <div className="leaderboard-details">
                <h2>{volunteer.name}</h2>
                <p>Rating: {volunteer.rating}</p>
                <p>Contributions: {volunteer.counter}</p>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
};

export default Leaderboard;
