
'use client';

import React, { useEffect, useState } from 'react';
import QuoteCard from '@/components/QuoteCard';
import { generateDailyQuote, UserProfile, Quote } from '@/lib/ai';

export default function Home() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [nameInput, setNameInput] = useState('');

  useEffect(() => {
    // Check local storage for profile
    const saved = localStorage.getItem('ark_profile');
    if (saved) {
      setProfile(JSON.parse(saved));
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (profile) {
      setLoading(true);
      generateDailyQuote(profile).then(q => {
        setQuote(q);
        setLoading(false);
      });
    }
  }, [profile]);

  const handleOnboarding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    const newProfile: UserProfile = {
      name: nameInput,
      interests: ['general'], // Default
      mood: 'neutral'
    };
    localStorage.setItem('ark_profile', JSON.stringify(newProfile));
    setProfile(newProfile);
  };

  if (loading) {
    return (
      <div className="flex-center full-height">
        <p className="fade-in">Loading your daily inspiration...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex-center full-height fade-in" style={{ flexDirection: 'column', padding: '2rem' }}>
        <h1 style={{ marginBottom: '2rem' }}>Welcome to ARK</h1>
        <p style={{ marginBottom: '2rem', textAlign: 'center', color: '#666' }}>
          Your daily personalized wisdom awaits.
        </p>
        <form onSubmit={handleOnboarding} style={{ width: '100%', maxWidth: '300px' }}>
          <input
            type="text"
            placeholder="What should we call you?"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            style={{
              width: '100%',
              padding: '1rem',
              marginBottom: '1rem',
              borderRadius: '8px',
              border: '1px solid #ddd',
              fontFamily: 'inherit'
            }}
          />
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '1rem',
              backgroundColor: '#1a1a1a',
              color: 'white',
              borderRadius: '8px',
              fontWeight: '600'
            }}
          >
            Start Journey
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-4 fade-in">
      <header className="flex-center" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
        <h3 style={{ letterSpacing: '2px', textTransform: 'uppercase', fontSize: '1rem' }}>ARK</h3>
      </header>

      {quote && (
        <QuoteCard
          content={quote.content}
          author={quote.author}
          topic={quote.topic}
          date={quote.date}
        />
      )}

      <div className="text-center" style={{ marginTop: '2rem', color: '#999', fontSize: '0.8rem' }}>
        <p>Curated for {profile.name}</p>
        <button
          onClick={() => { localStorage.removeItem('ark_profile'); setProfile(null); }}
          style={{ marginTop: '1rem', color: 'red', background: 'transparent', fontSize: '0.7rem' }}
        >
          Reset Profile
        </button>
      </div>
    </div>
  );
}
