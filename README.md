# FaceMood Counselor - 실시간 감정 인식 AI 상담 서비스

2026년형 Google MediaPipe Face Landmarker와 Gemini AI를 활용한 실시간 웹캠 기반 AI 상담 서비스입니다. 사용자의 표정을 실시간으로 분석하여 현재 감정에 가장 적합한 상담과 조언을 제공합니다.

## 🚀 주요 기능
- **실시간 감정 추론:** 52개의 Blendshape 데이터를 조합하여 5가지 핵심 감정(행복, 놀람, 분노, 슬픔, 평온) 수치화.
- **AI 상담사 (Gemini):** 실시간 감정 데이터와 대화 내용을 종합 분석하여 공감 중심의 피드백 제공.
- **개인정보 보호 최적화:** 얼굴 인식 그리드를 시각화하지 않고 내부 연산에만 활용하여 프라이버시를 보호하며 쾌적한 UX 제공.
- **반응형 대시보드:** 실시간 감정 변화를 직관적인 바 그래프로 표시.

## 🛠 기술 스택
- **Frontend:** React 19 (TypeScript)
- **Build Tool:** Vite 5
- **AI Engine:** Google MediaPipe Tasks-Vision (`@mediapipe/tasks-vision`)
- **LLM Engine:** Google Generative AI (Gemini 2.5 Flash)
- **Styling:** Vanilla CSS (Modern CSS Variables, Flexbox, Grid)

## 🔄 최근 변경 사항
- **상담사 AI 프롬프트 고도화:** '티키타카' 대화 원칙, 3단계 상담 흐름, 구체적인 금지 사항을 포함한 새로운 프롬프트를 적용하여, 더 깊이 있는 공감과 단계적인 상호작용이 가능하도록 AI의 상담 로직을 개선했습니다. (2026-03-22)
- **감정 판단 로직 개선:** '평온' 상태가 과도하게 강조되던 문제를 해결하기 위해 감정 임계값을 20%로 상향하고, 안정적인 상태에서는 대화 내용에 집중하도록 AI 프롬프트 수정. (2026-03-22)

## 📦 실행 방법 (Getting Started)

프로젝트를 로컬 환경에서 실행하려면 아래 단계를 따르세요.

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env` 파일을 생성하고 Gemini API 키를 입력합니다.
```bash
VITE_GEMINI_API_KEY=YOUR_API_KEY_HERE
```

### 3. 개발 서버 실행
```bash
npm run dev
```
- 실행 후 터미널에 표시되는 로컬 호스트 주소(기본값: `http://localhost:5173`)로 접속합니다.
- 브라우저에서 **카메라 접근 권한**을 요청하면 '허용'을 눌러주세요.

### 4. 프로덕션 빌드
```bash
npm run build
```

## 📅 개발 로드맵 (Progress)
- [x] **Phase 1:** 프로젝트 초기화 및 개발 환경 설정
- [x] **Phase 2:** MediaPipe 엔진 연동 및 웹캠 스트리밍 구현
- [x] **Phase 3:** 실시간 감정 추론 로직 및 분석 대시보드 구축
- [x] **Phase 4:** Gemini API 연동 및 AI 상담 기능 추가 (보안 강화를 위한 그리드 비가시화 적용)
- [x] **Bug Fix:** 음성 인식 시작/종료 시 웹캠이 멈추는 현상 해결 (MediaStream 관리 로직 최적화)
- [ ] **Phase 5:** UI/UX 고도화 및 상담 기록 저장 기능 (진행 예정)

## ⚠️ 주의사항
- 본 서비스는 카메라 기능을 사용하므로 카메라가 장착된 기기에서 최적의 성능을 발휘합니다.
- MediaPipe 엔진 초기 로딩 시 약간의 시간이 소요될 수 있습니다. (초기 로딩바 참조)
