import { useState, useEffect, useRef } from 'react'
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import { GoogleGenerativeAI } from '@google/generative-ai'
import './App.css'

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

interface EmotionScores {
  happy: number;
  sad: number;
  surprised: number;
  angry: number;
  neutral: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  emotion?: string;
  voiceInfo?: string;
}

const STORAGE_KEY = 'faceMoodCounselorData';

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const requestRef = useRef<number>(0);
  const audioRequestRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recognitionRef = useRef<any>(null);
  const isTypingRef = useRef(false);
  const isListeningRef = useRef(false);
  const emotionsRef = useRef<EmotionScores>({ happy: 0, sad: 0, surprised: 0, angry: 0, neutral: 100 });
  const voiceEnergyRef = useRef(0);
  const voiceCalmnessRef = useRef(100);

  // User and Data State
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [usersData, setUsersData] = useState<any>({});
  const [usernameInput, setUsernameInput] = useState('');

  const [faceLandmarker, setFaceLandmarker] = useState<FaceLandmarker | null>(null);
  const [webcamActive, setWebcamActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emotions, setEmotions] = useState<EmotionScores>({
    happy: 0, sad: 0, surprised: 0, angry: 0, neutral: 100
  });

  const [isListening, setIsListening] = useState(false);
  const [voiceEnergy, setVoiceEnergy] = useState(0); 
  const [voiceCalmness, setVoiceCalmness] = useState(100); 
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false); 
  const [isSummarizing, setIsSummarizing] = useState(false);

  // --- Data Persistence ---
  const saveData = (data: any) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  useEffect(() => {
    async function initApp() {
      // 1. Load data from local storage
      const loadData = () => {
        try {
          const rawData = localStorage.getItem(STORAGE_KEY);
          if (rawData) {
            const parsedData = JSON.parse(rawData);
            setUsersData(parsedData.users || {});
            if (parsedData.currentUser && parsedData.users[parsedData.currentUser]) {
              setCurrentUser(parsedData.currentUser);
              setMessages(parsedData.users[parsedData.currentUser].history || []);
            } else {
               setMessages([
                { role: 'assistant', content: '안녕하세요. 당신의 표정과 목소리를 읽고 진심으로 듣는 AI 상담사입니다. 오늘 무슨 고민이 있으신가요?' }
              ]);
            }
          }
        } catch (e) {
          console.error("Failed to load data from local storage", e);
        }
      };
      loadData();

      // 2. Initialize AI/ML engines
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.20/wasm"
        );
        const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
          },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",
          numFaces: 1
        });
        setFaceLandmarker(landmarker);

        if (SpeechRecognition) {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'ko-KR';

          let finalTranscript = '';
          recognition.onresult = (e: any) => {
            let interimTranscript = '';
            for (let i = e.resultIndex; i < e.results.length; ++i) {
              if (e.results[i].isFinal) {
                finalTranscript += e.results[i][0].transcript;
                setTimeout(() => {
                  if (finalTranscript.trim() && !isTypingRef.current) {
                    handleAutoSend(finalTranscript);
                    finalTranscript = '';
                  }
                }, 1000); 
              } else {
                interimTranscript += e.results[i][0].transcript;
              }
            }
            setInputValue(finalTranscript + interimTranscript);
          };

          recognition.onend = () => {
            if (isListeningRef.current) recognition.start();
          };

          recognitionRef.current = recognition;
        }
      } catch (err) {
        setError("엔진 로드 실패");
      }
    }
    initApp();
    
    return () => {
      cancelAnimationFrame(requestRef.current);
      cancelAnimationFrame(audioRequestRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []); // [] : init once, cleanup on unmount only

  useEffect(() => {
    // 1. Auto-scroll to the latest message
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    // 2. Persist message history on change
    if (currentUser && messages.length > 0) {
      const newUsersData = {
        ...usersData,
        [currentUser]: {
          ...usersData[currentUser],
          history: messages,
        },
      };
      setUsersData(newUsersData);
      saveData({ users: newUsersData, currentUser });
    }
  }, [messages]);

  const predictWebcam = () => {
    if (videoRef.current && faceLandmarker && videoRef.current.readyState >= 2) {
      if (videoRef.current.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = videoRef.current.currentTime;
        try {
          const results = faceLandmarker.detectForVideo(videoRef.current, performance.now());
          if (results.faceLandmarks && results.faceLandmarks.length > 0) {
            setFaceDetected(true);
            if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
              const shapes = results.faceBlendshapes[0].categories;
              const find = (n: string) => shapes.find((c: any) => c.categoryName === n)?.score || 0;
              const h = Math.min(100, Math.round(((find("mouthSmileLeft") + find("mouthSmileRight")) / 2) * 250));
              const s = Math.min(100, Math.round(((find("eyeWideLeft") + find("eyeWideRight")) / 2 + find("jawOpen")) * 120));
              const a = Math.min(100, Math.round(((find("browDownLeft") + find("browDownRight")) / 2) * 200));
              const d = Math.min(100, Math.round(((find("mouthFrownLeft") + find("mouthFrownRight")) / 2) * 350));
              setEmotions({ happy: h, surprised: s, angry: a, sad: d, neutral: Math.max(0, 100 - (h + s + a + d)) });
            }
          } else {
            setFaceDetected(false);
          }
        } catch (e) {}
      }
    }
    requestRef.current = window.requestAnimationFrame(predictWebcam);
  };

  const checkAudio = () => {
    if (analyserRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setVoiceEnergy(Math.min(100, Math.round(avg * 2.5))); 
      let calm = 100;
      if (avg > 30) calm -= (avg - 30) * 2;
      const highFreq = dataArray.slice(dataArray.length / 2).reduce((a, b) => a + b) / (dataArray.length / 2);
      if (highFreq > 15) calm -= highFreq * 1.5;
      setVoiceCalmness(Math.max(0, Math.min(100, Math.round(calm))));
    }
    audioRequestRef.current = window.requestAnimationFrame(checkAudio);
  };

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setWebcamActive(true);
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          requestRef.current = window.requestAnimationFrame(predictWebcam);
        };
      }
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      audioRequestRef.current = window.requestAnimationFrame(checkAudio);
    } catch (err) {
      setError("카메라/마이크 권한 필요");
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setInputValue('');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  // 자동 전송 함수 (전화 모드 핵심)
  const handleAutoSend = async (content: string) => {
    if (!content.trim() || isTypingRef.current) return;
    await sendMessageInternal(content);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isTyping) return;
    const content = inputValue;
    setInputValue('');
    await sendMessageInternal(content);
  };

  const sendMessageInternal = async (content: string) => {
    isTypingRef.current = true;
    setIsTyping(true);

    const currentEmotions = emotionsRef.current;
    const currentVoiceEnergy = voiceEnergyRef.current;
    const currentVoiceCalmness = voiceCalmnessRef.current;

    const emotionList = [
      { name: '행복', score: currentEmotions.happy },
      { name: '슬픔', score: currentEmotions.sad },
      { name: '분노', score: currentEmotions.angry },
      { name: '놀람', score: currentEmotions.surprised }
    ];
    const dominant = emotionList.reduce((prev, curr) => (prev.score > curr.score) ? prev : curr);

    // 임계값을 20%로 상향하고, 특정 감정이 없으면 '차분함' 정도로 표현
    const dominantLabel = dominant.score > 20 ? `${dominant.name}(${dominant.score}%)` : `차분함`;
    const faceStatus = dominant.score > 20 
      ? `현재 감정: ${dominantLabel} (상세: 행복 ${currentEmotions.happy}%, 슬픔 ${currentEmotions.sad}%, 분노 ${currentEmotions.angry}%, 놀람 ${currentEmotions.surprised}%)`
      : `안정적인 표정 유지 중`;

    const voiceStatus = `목소리 에너지: ${currentVoiceEnergy}%, 안정도: ${currentVoiceCalmness}%`;

    const userMsg: ChatMessage = { role: 'user', content, emotion: faceStatus, voiceInfo: voiceStatus };
    
    // Create history context before updating messages state
    const history = messages.map(msg => 
      `${msg.role === 'user' ? '사용자' : '상담사'}: ${msg.content}`
    ).join('\n');

    setMessages(prev => [...prev, userMsg]);

    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

      const systemPrompt = `당신은 따뜻하고 공감 능력이 뛰어난 전문 심리 상담가입니다. 
당신의 목표는 사용자가 자신의 감정과 고민을 편안하게 털어놓도록 돕고, 충분한 지지와 공감을 보낸 뒤, 대화가 충분히 무르익었을 때 실질적인 도움을 주는 것입니다.

[대화 원칙: 티키타카와 경청]
1. 답변은 항상 짧고 간결하게 유지하세요. 한 번에 너무 많은 말을 하거나 여러 개의 질문을 던지면 사용자가 부담을 느낍니다. 한 턴에 하나의 질문만 하세요.
2. 섣부른 조언이나 해결책 제시는 절대 금물입니다. 대화 초중반에는 오직 사용자의 감정을 읽어주고(Validation) 공감하는 데 집중하세요.
3. 사용자가 상황을 차근차근 설명할 수 있도록 부드러운 열린 질문(Open-ended question)을 던지세요. 
   - 예: "그랬군요, 그때 기분이 어땠나요?", "어떤 점이 가장 마음을 무겁게 했나요?"

[대화의 3단계 흐름]
- 1단계 (초기 - 탐색 및 공감): 사용자의 감정을 수용하고 지지합니다. 문제를 판단하거나 해결하려 하지 말고 온전히 편을 들어주세요.
- 2단계 (중기 - 심화): 사용자가 자신의 마음을 더 깊이 들여다볼 수 있도록 유도합니다. 감정의 원인이나 구체적인 상황을 조심스럽게 물어보며 이야기를 끌어내세요.
- 3단계 (후기 - 해결책 및 마무리): 사용자가 충분히 감정을 쏟아냈다고 느껴지거나, 대화가 마무리되어 갈 때(약 5~6번의 티키타카 이후), 또는 사용자가 직접적으로 조언을 구할 때 조심스럽게 방향을 제시하세요.
   - 예: "이야기를 듣다 보니 이런 방법도 도움이 될 것 같은데, 제가 몇 가지 제안을 해드려도 괜찮을까요?"라고 먼저 동의를 구한 뒤 해결책을 추천하세요.

[금지 사항]
- "힘내세요", "다 잘 될 거예요" 같은 영혼 없는 피상적인 위로는 피하세요.
- 사용자의 행동이나 감정을 가르치려 들거나 비판하지 마세요.
- 사용자가 묻기 전까지는 AI라는 사실을 굳이 먼저 강조하며 선을 긋지 마세요.`;

      const characteristics = (currentUser && usersData[currentUser]?.characteristics) || '아직 파악되지 않음';

      const fullPrompt = `${systemPrompt}
      
[사용자 사전 정보]
- 이전 대화에서 파악된 사용자 특성 요약: ${characteristics}

[이전 대화 기록]
${history}

[현재 사용자 데이터]
- 표정에서 읽은 감정: ${userMsg.emotion}
- 목소리 분석: ${userMsg.voiceInfo}
- 사용자 메시지: ${userMsg.content}`;

      const result = await model.generateContent(fullPrompt);
      const text = result.response.text();
      setMessages(prev => [...prev, { role: 'assistant', content: text }]);
      await speak(text);
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: "잠시 연결이 끊겼어요." }]);
    } finally {
      isTypingRef.current = false;
      setIsTyping(false);
    }
  };

  const handleLogin = () => {
    if (!usernameInput.trim()) return;
    const username = usernameInput.trim();
    let newUsersData = { ...usersData };

    if (!newUsersData[username]) {
      newUsersData[username] = {
        username: username,
        history: [{ role: 'assistant', content: `안녕하세요, ${username}님. 오늘 어떤 이야기를 나누고 싶으신가요?` }],
        characteristics: ""
      };
    }
    
    setUsersData(newUsersData);
    setCurrentUser(username);
    setMessages(newUsersData[username].history);
    saveData({ users: newUsersData, currentUser: username });
  };

  const handleLogout = async () => {
    setIsSummarizing(true);
    await summarizeCharacteristics(true); // Pass true to suppress alert
    setIsSummarizing(false);
    
    saveData({ users: usersData, currentUser: null });
    setCurrentUser(null);
    setMessages([]);
    setUsernameInput('');
  };

  const summarizeCharacteristics = async (isSilent = false) => {
    if (!currentUser || messages.length === 0) return;
    
    setIsSummarizing(true);
    const history = messages.map(msg => 
      `${msg.role === 'user' ? '사용자' : '상담사'}: ${msg.content}`
    ).join('\n');

    const summarizationPrompt = `다음은 나와 사용자 간의 전체 심리 상담 대화 내용입니다. 이 대화를 바탕으로 사용자의 성격, 주요 고민, 심리적 경향 등을 50자 내외의 짧은 문장으로 요약해 주세요. 이 요약은 다음 대화에서 사용자를 더 잘 이해하기 위한 목적으로만 사용됩니다. 객관적인 사실과 추론에 기반하여 작성하고, 불필요한 미사여구나 추측은 피해주세요. 예: '업무 관련 스트레스가 높으며, 완벽주의적 성향을 보임.'

[대화 내용]
${history}`;

    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
      const result = await model.generateContent(summarizationPrompt);
      const summary = result.response.text();

      const newUsersData = {
        ...usersData,
        [currentUser]: {
          ...usersData[currentUser],
          characteristics: summary,
        },
      };
      setUsersData(newUsersData);
      saveData({ users: newUsersData, currentUser });
      if (!isSilent) {
        alert("사용자 특성 요약이 저장되었습니다.");
      }
    } catch (err) {
      console.error("요약 실패:", err);
      if (!isSilent) {
        alert("요약 저장에 실패했습니다.");
      }
    } finally {
      setIsSummarizing(false);
    }
  };

  const speak = async (text: string) => {
    try {
      const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
      if (!apiKey) throw new Error();
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "xi-api-key": apiKey },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.85, similarity_boost: 0.5 }
        }),
      });
      const blob = await response.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      return new Promise((resolve) => {
        audio.onended = resolve;
        audio.play();
      });
    } catch (e) {
      return new Promise((resolve) => {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'ko-KR';
        u.onend = resolve;
        window.speechSynthesis.speak(u);
      });
    }
  };

  if (!currentUser) {
    return (
      <div className="container login-container">
        <h1>FaceMood Counselor</h1>
        <p>로그인하여 이전 상담 내역을 확인하세요.</p>
        <div className="login-box">
          <input
            type="text"
            placeholder="사용자 이름을 입력하세요"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          <button onClick={handleLogin}>시작하기</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {isSummarizing && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>대화 내용을 요약하고 저장하는 중...</p>
        </div>
      )}
      <header>
        <h1>FaceMood Counselor</h1>
        <div className="user-info">
          <span>{currentUser}님, 환영합니다.</span>
          <button onClick={() => summarizeCharacteristics()} disabled={isSummarizing} className="summary-button">대화 내용 요약/저장</button>
          <button onClick={handleLogout} disabled={isSummarizing} className="logout-button">로그아웃</button>
        </div>
      </header>
      <main className="counseling-layout">
        <div className="visual-panel">
          <div className="viewer-container">
            <div className={`video-wrapper ${isListening ? 'calling' : ''}`}>
              <video ref={videoRef} autoPlay playsInline muted className="webcam-video"></video>
              <canvas ref={canvasRef} className="output-canvas"></canvas>
              {!webcamActive && (
                <div className="overlay">
                  <button onClick={startWebcam} disabled={!faceLandmarker || isSummarizing} className="start-button">상담 시작하기</button>
                </div>
              )}
              {isListening && (
                <div className="voice-visualizer">
                  <div className="energy-container">
                    <div className="energy-bar" style={{ height: `${Math.random() * 20 + voiceEnergy}%` }}></div>
                    <div className="energy-bar" style={{ height: `${voiceEnergy}%` }}></div>
                    <div className="energy-bar" style={{ height: `${Math.random() * 30 + voiceEnergy}%` }}></div>
                    <div className="energy-bar" style={{ height: `${voiceEnergy * 0.8}%` }}></div>
                    <div className="energy-bar" style={{ height: `${Math.random() * 15 + voiceEnergy}%` }}></div>
                  </div>
                  <span>LIVE CALLING...</span>
                </div>
              )}
            </div>
          </div>
          <div className="emotion-dashboard">
            <div className="mini-bars">
              <div className="bar-item"><span>😃</span><div className="bar"><div style={{width: `${emotions.happy}%`, background: '#facc15'}}></div></div></div>
              <div className="bar-item"><span>😢</span><div className="bar"><div style={{width: `${emotions.sad}%`, background: '#8b5cf6'}}></div></div></div>
              <div className="bar-item"><span>😠</span><div className="bar"><div style={{width: `${emotions.angry}%`, background: '#ef4444'}}></div></div></div>
              <div className="bar-item"><span>😲</span><div className="bar"><div style={{width: `${emotions.surprised}%`, background: '#3b82f6'}}></div></div></div>
              <div className="bar-item"><span>😐</span><div className="bar"><div style={{width: `${emotions.neutral}%`, background: '#94a3b8'}}></div></div></div>
              <div className="bar-item"><span>🎙️</span><div className="bar"><div style={{width: `${voiceCalmness}%`, background: '#10b981'}}></div></div></div>
            </div>
          </div>
        </div>
        <div className="chat-panel">
          <div className="chat-history">
            {messages.map((msg, idx) => (
              <div key={idx} className={`message-bubble ${msg.role}`}>
                <div className="message-content">{msg.content}</div>
                {msg.role === 'user' && <div className="emotion-tag">멀티모달 대화 중</div>}
              </div>
            ))}
            {isTyping && <div className="message-bubble assistant typing">상담사가 듣는 중...</div>}
            <div ref={chatEndRef} />
          </div>
          <div className="chat-input-area">
            <button className={`mic-button ${isListening ? 'active' : ''}`} onClick={toggleListening} disabled={isSummarizing}>{isListening ? '⏹️' : '🎤'}</button>
            <input type="text" placeholder={isListening ? "말씀하세요 (끊기면 자동 전송)" : "마이크를 눌러 전화 모드 시작"} value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} disabled={isSummarizing} />
            <button onClick={handleSendMessage} disabled={isTyping || !inputValue.trim() || isSummarizing}>전송</button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
