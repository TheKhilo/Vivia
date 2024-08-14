import { Predictions } from '@aws-amplify/predictions';
import { Amplify } from 'aws-amplify';
import mic from 'microphone-stream';
import { useState } from 'react';
import { Buffer } from 'buffer';  // Import Buffer polyfill
import process from 'process';    // Import process polyfill
import './App.css';
import awsconfig from './aws-exports';

Amplify.configure(awsconfig);
window.Buffer = Buffer;
window.process = process;

function SpeechToText({ onTranscriptionComplete }) {
    const [response, setResponse] = useState('Record audio to generate a transcription.');

    function AudioRecorder({ finishRecording }) {
      const [recording, setRecording] = useState(false);
      const [micStream, setMicStream] = useState(null);
      const [audioBuffer] = useState(
        (function() {
          let buffer = [];
          function add(raw) {
            buffer = buffer.concat(...raw);
            return buffer;
          }
          function newBuffer() {
            console.log('resetting buffer');
            buffer = [];
          }
   
          return {
            reset: function() {
              newBuffer();
            },
            addData: function(raw) {
              add(raw);
            },
            getData: function() {
              return buffer;
            }
          };
        })()
      );

      const startRecording = async () => {
        console.log('start recording');
        audioBuffer.reset();

        const startMic = new mic();
        startMic.setStream(await window.navigator.mediaDevices.getUserMedia({ video: false, audio: true }));
        
        startMic.on('data', (chunk) => {
            var raw = mic.toRaw(chunk);
            if (raw == null) {
              return;
            }
            audioBuffer.addData(raw);

          });

        setRecording(true);
        setMicStream(startMic);
      }

      async function stopRecording() {
        console.log('stop recording');

        micStream.stop();
        setMicStream(null);
        setRecording(false);

        const resultBuffer = audioBuffer.getData();
        finishRecording(resultBuffer);
      }

      return (
        <div>
          <div>
          {recording && <button type="button" onClick={stopRecording}>Stop recording</button>}
        {!recording && <button type="button" onClick={startRecording}>Start recording</button>}
        {/* The type="button" prevents the form from submitting */}
          </div>
        </div>
      );
    }

    const convertFromBuffer = async (bytes) => {
      setResponse('Converting text...');
      
      try {
        const { transcription } = await Predictions.convert({
          transcription: {
            source: {
              bytes: Buffer.from(bytes) // Use Buffer to handle binary data
            },
            language: 'en-US', // other options include 'en-GB', 'fr-FR', 'fr-CA', 'es-US'
          },
        });
        setResponse(transcription.fullText);
        onTranscriptionComplete(transcription.fullText); // Send transcription back to the parent component
      } catch (err) {
        setResponse(JSON.stringify(err, null, 2));
      }
    }

    return (
      <div>
        <div>
          <h3>Speech to text</h3>
          <AudioRecorder finishRecording={convertFromBuffer} />
          <p>{response}</p>
        </div>
      </div>
    );
}

export default SpeechToText;
