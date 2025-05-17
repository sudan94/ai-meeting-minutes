# AI Meeting Minutes Generator

This application automatically generates meeting minutes from audio recordings using AI. It processes audio files, transcribes them, and provides a structured summary of the meeting.

## Features

- Upload and process audio recordings
- Real-time processing status updates
- View list of processed meetings
- Detailed meeting view with transcriptions and summaries
- Modern Material-UI interface

## Prerequisites

- Python 3.8 or higher
- Node.js 16 or higher
- npm or yarn
- FFmpeg (for audio processing)

## Installation

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create and activate a virtual environment:
```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

3. Install Python dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables:
Create a `.env` file in the backend directory with the following variables:
```
OPENAI_API_KEY=your_openai_api_key
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install Node.js dependencies:
```bash
npm install
# or
yarn install
```

## Running the Application

### Backend

1. Make sure you're in the backend directory and your virtual environment is activated
2. Start the FastAPI server:
```bash
uvicorn main:app --reload
```
The backend will be available at `http://localhost:8000`

### Frontend

1. Make sure you're in the frontend directory
2. Start the development server:
```bash
npm start
# or
yarn start
```
The frontend will be available at `http://localhost:3000`

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. Click "Upload New Recording" to process a new meeting
3. Wait for the processing to complete
4. View the list of processed meetings
5. Click on any meeting to view its details

## API Documentation

Once the backend is running, you can access the API documentation at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## License

This project is licensed under the MIT License - see the LICENSE file for details.