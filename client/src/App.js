import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import CreateTeamPage from './pages/CreateTeamPage';
import MyTeamsPage from './pages/MyTeamsPage';
import CreateLeaguePage from './pages/CreateLeaguePage'; // Import CreateLeaguePage
import LeaguesListPage from './pages/LeaguesListPage'; // Import LeaguesListPage
import LeagueDetailsPage from './pages/LeagueDetailsPage'; // Import LeagueDetailsPage
import './App.css'; // Default CRA styles

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <div className="content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/create-team" element={<CreateTeamPage />} />
            <Route path="/my-teams" element={<MyTeamsPage />} />
            <Route path="/leagues/create" element={<CreateLeaguePage />} /> {/* Add route for CreateLeaguePage */}
            <Route path="/leagues" element={<LeaguesListPage />} /> {/* Add route for LeaguesListPage */}
            <Route path="/leagues/:leagueId" element={<LeagueDetailsPage />} /> {/* Add route for LeagueDetailsPage */}
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
