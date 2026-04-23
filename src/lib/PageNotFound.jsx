import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function PageNotFound() {
  return (
    <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7F5BFF] to-[#3A1DFF] flex items-center justify-center mx-auto mb-6">
          <span className="text-white font-bold text-2xl">W</span>
        </div>
        <h1 className="text-5xl font-bold text-white mb-2">404</h1>
        <p className="text-[#A1A1B5] mb-8">This page doesn't exist</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7F5BFF] to-[#6F3BFF] text-white text-sm font-medium hover:from-[#6F3BFF] hover:to-[#3A1DFF] transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}