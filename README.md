# Sunny

AI 기반 기후·에너지 인사이트를 제공하는 Spring Boot + Vite/React 풀스택 프로젝트입니다. Oracle DB와 MyBatis로 실시간 데이터 소싱을 처리하고, Vite + React 19 프런트엔드에서 지도/차트 시각화를 제공합니다.

## 기술 스택
- **Backend**: Spring Boot 3.5, Java 17, MyBatis, Oracle JDBC
- **Frontend**: Vite 7, React 19, React Router 7, Deck.gl, MapLibre, Leaflet, Chart.js
- **Build/Dev**: Maven Wrapper, npm, ESLint, Vite Preview

## 디렉터리 구조
```
sunny/
├── frontend/                # Vite + React SPA
│   ├── src/                 # pages, components, services
│   └── package.json
├── src/
│   ├── main/java/com/future/my/   # Spring Boot 애플리케이션
│   └── main/resources/application.properties
├── pom.xml
├── mvnw / mvnw.cmd
└── README.md
```

## 사전 요구 사항
- Java 17 JDK
- Node.js 20+ / npm 10+
- Oracle DB (XE 등) + `sunny/oracle` 계정
- Git 2.40+

## Backend 실행
```bash
./mvnw spring-boot:run      # Windows CMD: mvnw.cmd spring-boot:run
```
- 서버 포트: `8080`
- 주요 설정: `src/main/resources/application.properties`
  - Oracle 접속 정보와 MyBatis mapper 위치가 정의되어 있습니다. 운영 환경에 맞게 `spring.datasource.*` 값을 수정하세요.

## Frontend 실행
```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```
- API 프록시 또는 .env 설정이 필요하면 `frontend/vite.config.js`에 구성하세요.
- 프로덕션 번들: `npm run build` → `frontend/dist/`

## 통합 개발 플로우
1. Spring Boot API를 8080 포트에서 실행합니다.
2. `frontend`를 dev 서버(5173)로 실행하여 API를 호출합니다.
3. 배포 시 `npm run build` 출력물을 정적 리소스로 옮기거나 별도 호스팅합니다.

## 테스트 & 빌드
- **Backend 빌드**: `./mvnw clean package`
- **Frontend 린트**: `npm run lint`
- CI 환경에서는 백엔드/프런트엔드 빌드를 각각 수행해 산출물을 업로드하세요.

## GitHub 업로드 가이드
1. Git 초기화 (이미 되어 있다면 생략)
   ```bash
   git init
   git branch -M main
   ```
2. 모든 변경 사항 추가
   ```bash
   git add .
   git commit -m "chore: initial Sunny project"
   ```
3. GitHub에서 새 저장소를 만든 뒤 원격 연결
   ```bash
   git remote add origin https://github.com/<username>/sunny.git
   git push -u origin main
   ```

## 라이선스
- 아직 라이선스를 선택하지 않았습니다. 공개 배포 전에 MIT, Apache-2.0 등 원하는 라이선스를 `LICENSE` 파일로 추가하세요.

## 추가 TODO
- Oracle 접속 정보를 환경 변수로 분리 (예: Spring `application-{profile}.properties`).
- 프런트엔드에서 API base URL을 환경별로 스위칭하도록 `.env` 템플릿 제공.

필요한 다른 문서(예: LICENSE, CONTRIBUTING 등)가 있다면 알려주세요!
