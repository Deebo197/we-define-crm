import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function PageNotFound() {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
      <div className="text-center">
        <img src="/brand/repevo-favicon.svg" alt="Repevo" className="w-14 h-14 rounded-2xl mx-auto mb-6" />
        <h1 className="text-5xl font-bold text-ink mb-2">404</h1>
        <p className="text-muted mb-8">This page doesn't exist</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}