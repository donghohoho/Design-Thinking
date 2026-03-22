# BMI: Balance of Mind Index - 마음의 균형을 위한 멘탈 PT 서비스

"몸의 무게는 재면서, 왜 마음의 무게는 재지 않나요?"

우리는 갓생(God-saeng)을 위해 매일 거울을 보고 체중계에 올라갑니다. 하지만 당신의 마음은 어떤가요? 불안이 비대해지거나 우울이라는 체지방이 일상을 무겁게 누르고 있지는 않은지, **BMI(Balance of Mind Index)**를 통해 내 마음의 균형을 체크해보세요. BMI는 당신의 멘탈을 벌크업하는 '멘탈 PT' 서비스입니다.

## 🚀 핵심 기능 (App Features)
- **Mind-Check (마음 인바디):** 상담 전 실시간 표정 및 목소리 분석을 통해 나의 스트레스, 불안, 자존감 지수를 그래프로 시각화합니다.
- **Mental PT (전문가 매칭):** 단순한 치료가 아닌, 당신의 멘탈 밸런스를 잡아주는 '멘탈 트레이너'와의 상담을 제공합니다.
- **Routine Log (마음 기록):** 운동 일지를 쓰듯, 상담 후 내 마음 지수의 변화를 기록하고 관리하는 세련된 자기 관리 루틴입니다.

## 🛠 기술 스택
- **Frontend:** React 19 (TypeScript)
- **Build Tool:** Vite 5
- **AI Engine:** Google MediaPipe Tasks-Vision (`@mediapipe/tasks-vision`)
- **LLM Engine:** Google Generative AI (Gemini 3 Flash)
- **Styling:** Vanilla CSS (Modern CSS Variables, Flexbox, Grid)

## 🔄 최근 변경 사항
- **리브랜딩:** 'FaceMood Counselor'에서 'BMI: Balance of Mind Index'로 서비스명 및 컨셉 변경.
- **사용자별 데이터 영속성:** 로그인 기능을 통해 사용자별 대화 기록 및 AI가 추론한 성격 특성 저장.
- **AI 상담 고도화:** 이전 대화 맥락과 사용자 특성을 기억하여 상담하는 장기 기억형 AI 상담사 도입.
- **프롬프트 개선:** '티키타카' 대화 원칙 및 3단계 상담 흐름 적용.

## 📦 실행 방법 (Getting Started)
프로젝트를 로컬 환경에서 실행하려면 아래 단계를 따르세요.

### 0. 다운로드 및 환경 준비
GitHub 저장소를 클론한 후 프로젝트 디렉토리로 이동합니다.
```bash
git clone <저장소_URL>
cd Homepage
```

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env` 파일을 생성하고 Gemini API 키를 입력합니다.
```bash
# .env 파일 생성 후 아래 내용 입력
VITE_GEMINI_API_KEY=YOUR_API_KEY_HERE
```

### 3. 개발 서버 실행
```bash
npm run dev
```

### 4. 프로덕션 빌드
```bash
npm run build
```

## 📅 개발 로드맵 (Progress)
- [x] **Phase 1-4:** 브랜드 리브랜딩 및 핵심 상담 기능 구현 완료.
- [ ] **Phase 5:** 사용자 대시보드 UI/UX 고도화 (진행 예정)
