import React from "react";
import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Layout from "./pages/Layout";
import Dashboard from "./pages/Dashboard.jsx";
import WriteArticle from "./pages/WriteArticle";
import BlogTitle from "./pages/BlogTitle";
import GenerateImages from "./pages/GenerateImages.jsx";
import RemoveBackground from "./pages/RemoveBackground.jsx";
import RemoveObject from "./pages/RemoveObject.jsx";
import ReviewResume from "./pages/ReviewResume.jsx";
import Community from "./pages/community.jsx";
import { useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";
import {Toaster} from "react-hot-toast";  
const App = () => {
  
  return (
    <div>
      <Toaster/>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="ai" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="write-article" element={<WriteArticle />} />
          <Route path="blog-titles" element={<BlogTitle />} />
          <Route path="generate-images" element={<GenerateImages />} />
          <Route path="remove-bg" element={<RemoveBackground />} />
          <Route path="remove-objects" element={<RemoveObject />} />
          <Route path="review-resume" element={<ReviewResume />} />
          <Route path="community" element={<Community />} />
        </Route>
      </Routes>
    </div>
  );
};

export default App;
