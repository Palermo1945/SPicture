// src/main.js
import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// import UploadComponent from './components/UploadComponent';
// import VideoGenerator from './components/VideoGenerator';
import Video from './components/Video_gen';

const App = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Video />} />
            </Routes>
        </Router>
    );
};

ReactDOM.render(<App />, document.getElementById('root'));
