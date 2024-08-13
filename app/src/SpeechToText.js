import { Predictions } from '@aws-amplify/predictions';
import { Amplify } from 'aws-amplify';
import mic from 'microphone-stream';
import { useState } from 'react';
import './App.css';
import amplifyconfig from './amplifyconfiguration.json';
import process from 'process';
import { Buffer } from 'buffer';
window.Buffer = Buffer;
window.process = process;

Amplify.configure(amplifyconfig);

function SpeechToText({ setTranscribedText }) {
    const [response, setResponse] = useState('Record audio to generate a transcription.');
    const [recording, setRecording] = useState(false);
    const [micStream, setMicStream] = useState(null);
    const [audioBuffer, setAudioBuffer] = useState([]);

    const startRecording = async () => {
        console.log('start recording');
        setAudioBuffer([]);  // Reset the buffer

        const startMic = new mic();
        startMic.setStream(await window.navigator.mediaDevices.getUserMedia({ video: false, audio: true }));

        startMic.on('data', (chunk) => {
            const raw = mic.toRaw(chunk);
            if (raw) {
                setAudioBuffer(prevBuffer => [...prevBuffer, ...raw]);
            }
        });

        setRecording(true);
        setMicStream(startMic);
    };

    const stopRecording = () => {
        console.log('stop recording');

        if (micStream) {
            micStream.stop();
            setMicStream(null);
        }
        setRecording(false);
        convertFromBuffer(audioBuffer);
    };

    const convertFromBuffer = async (bytes) => {
        setResponse('Converting text...');
    
        try {
            const { transcription } = await Predictions.convert({
                transcription: {
                    source: {
                        bytes,
                    },
                    language: 'en-US',
                },
            });
            const text = transcription.fullText;
            setResponse(text);
            setTranscribedText(text); // Ensure this updates the parent state directly
        } catch (err) {
            setResponse(JSON.stringify(err, null, 2));
        }
    };
    
    return (
        <div>
            <div>
                <h3>Speech to text</h3>
                {recording ? (
                    <button onClick={stopRecording}>Stop recording</button>
                ) : (
                    <button onClick={startRecording}>Start recording</button>
                )}
                <p>{response}</p>
            </div>
        </div>
    );
}

export default SpeechToText;
