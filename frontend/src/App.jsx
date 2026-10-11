import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home.jsx";
import ContractPage from "./pages/ContractPage.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <div className="banner">
        This is an information-management tool. It is not legal advice. Always check items against the original contract.
      </div>
      <header className="topbar">
        <Link to="/">Contract Obligation and Renewal Assistant</Link>
      </header>
      <main className="page">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/contracts/:id" element={<ContractPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}