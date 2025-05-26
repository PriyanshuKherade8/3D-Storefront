import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Banner3D from "./Module/Banner3D";

function NotFound() {
  return <div>Not Found</div>;
}

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/:id" element={<Banner3D />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
};

export default App;
