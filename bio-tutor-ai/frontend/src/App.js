import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Layout from "./components/Layout";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import AskAI from "./pages/AskAI";
import TeachMe from "./pages/TeachMe";
import PDFStudy from "./pages/PDFStudy";
import Quiz from "./pages/Quiz";
import Flashcards from "./pages/Flashcards";
import Revision from "./pages/Revision";
import ExamMode from "./pages/ExamMode";
import Practice from "./pages/Practice";
import ConceptMap from "./pages/ConceptMap";
import DiagramReading from "./pages/DiagramReading";
import Progress from "./pages/Progress";
import Bookmarks from "./pages/Bookmarks";
import Achievements from "./pages/Achievements";
import Profile from "./pages/Profile";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/app" element={<Layout />}>
              <Route index element={<Navigate to="/app/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="ask" element={<AskAI />} />
              <Route path="teach" element={<TeachMe />} />
              <Route path="pdf" element={<PDFStudy />} />
              <Route path="quiz" element={<Quiz />} />
              <Route path="flashcards" element={<Flashcards />} />
              <Route path="revision" element={<Revision />} />
              <Route path="exam" element={<ExamMode />} />
              <Route path="practice" element={<Practice />} />
              <Route path="concept-map" element={<ConceptMap />} />
              <Route path="diagram" element={<DiagramReading />} />
              <Route path="progress" element={<Progress />} />
              <Route path="bookmarks" element={<Bookmarks />} />
              <Route path="achievements" element={<Achievements />} />
              <Route path="profile" element={<Profile />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster position="top-right" richColors />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
