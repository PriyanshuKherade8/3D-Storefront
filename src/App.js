import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Banner3D from "./Module/Banner3D";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Banner3D />} />
      </Routes>
    </Router>
  );
};

export default App;
