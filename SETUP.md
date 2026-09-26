# LMS Project — Setup (complete project, includes the Teacher Portal update)

## 0. IMPORTANT — start clean
- Extract this zip into a **NEW, EMPTY folder**. Do NOT extract over your old project (mixing old and new files is what breaks things).
- **Stop every running backend/frontend first** (close old terminals). An old backend still running on port 3000
  will keep answering with old code. On Windows:
      netstat -ano | findstr :3000
      taskkill /PID <number-in-last-column> /F

## 1. Backend  (lms-backend)
1. Copy your existing `.env` from your old project into `lms-backend/`
   (or copy `.env.example` to `.env` and fill it in — see the comments inside).
2. Make sure PostgreSQL is running and the database named in `.env` exists.
3. In a terminal:
      cd lms-backend
      npm install
      npm run start:dev
4. Wait until you see these two lines in the terminal (this is how you know the upload feature is live):
      Mapped {/uploads/video, POST} route
      Mapped {/uploads/image, POST} route
   Also open http://localhost:3000/api-docs — there must be an "Uploads" section.

## 2. Frontend  (lms-frontend)
      cd lms-frontend
      npm install
      npm run dev
   Open http://localhost:5173

## 3. Mobile  (lms-mobile) — unchanged, only if you use it
      cd lms-mobile
      npm install
      npx expo start

## No new packages
This update added NO new dependencies. package.json / package-lock.json are identical to your originals.
`npm install` only restores what was already listed.

## Teacher portal quick test
Log in as a teacher -> you land on /teacher (Overview, no cart) -> Draft Courses -> New course ->
add a cover image -> Create & add content -> add a module -> Add lesson -> Video -> drop a video file.
Uploaded files are stored in `lms-backend/uploads/` (created automatically).
