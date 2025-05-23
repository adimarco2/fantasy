import React from 'react';
import { Link } from 'react-router-dom';

function Navbar() {
  // Basic styling for the navbar
  const navStyle = {
    backgroundColor: '#f0f0f0',
    padding: '10px',
    marginBottom: '20px',
  };

  const linkStyle = {
    margin: '0 10px',
    textDecoration: 'none',
    color: '#333',
  };

  return (
    <nav style={navStyle}>
      <Link to="/" style={linkStyle}>Home</Link>
      <Link to="/login" style={linkStyle}>Login</Link>
      <Link to="/signup" style={linkStyle}>Signup</Link>
      <Link to="/dashboard" style={linkStyle}>Dashboard</Link>
      <Link to="/my-teams" style={linkStyle}>My Teams</Link>
      <Link to="/create-team" style={linkStyle}>Create Team</Link>
      <Link to="/leagues" style={linkStyle}>Leagues</Link> {/* Add link to Leagues List */}
      <Link to="/leagues/create" style={linkStyle}>Create League</Link> {/* Add link to Create League */}
    </nav>
  );
}

export default Navbar;
