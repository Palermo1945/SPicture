import React, { useState } from 'react';
import axios from 'axios';
import '../index.css'; // or './App.css'

const Video = () => {
    const [file, setFile] = useState(null);
    const [resultUrl, setResultUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setResultUrl('');
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setLoading(true);
        setError('');

        try {
            const response = await axios.post(`http://localhost:3000/api/upload-and-generate`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setResultUrl(response.data.result_url);
        } catch (err) {
            console.error(err);
            setError('Failed to generate video. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 to-blue-500 py-12 px-4">
            <div className="max-w-lg w-full bg-blue-50 rounded-lg shadow-lg p-6">
                <h1 className="text-2xl font-semibold text-center mb-6 text-blue-800">Upload Files and Generate Video</h1>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="file"
                        accept=".docx, .pdf"
                        onChange={handleFileChange}
                        className="block w-full border border-blue-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-2 rounded-md text-white ${loading ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'} transition-colors`}
                    >
                        {loading ? 'Generating...' : 'Upload and Generate'}
                    </button>
                </form>
                {error && <p className="text-red-500 text-center mt-4">{error}</p>}
                {resultUrl && (
                    <div className="mt-6 text-center">
                        <h2 className="text-xl font-semibold text-blue-800">Video Generated!</h2>
                        <video className="mt-4 w-1/2 mx-auto" controls>
                            <source src={resultUrl} type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                        <br />
                        <a
                            href={resultUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 inline-block bg-blue-200 hover:bg-blue-300 text-blue-800 font-semibold py-2 px-4 rounded transition-colors"
                        >
                            Download Video
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Video;