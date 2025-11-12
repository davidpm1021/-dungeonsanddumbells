import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../services/api';
import useAuthStore from '../stores/authStore';

export default function Register() {
  const navigate = useNavigate();
  const { setLoading, setError, error, loading } = useAuthStore();

  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password length
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      await auth.register(formData.email, formData.username, formData.password);

      // Auto-login after successful registration
      const loginResponse = await auth.login(formData.username, formData.password);
      const { token, user } = loginResponse.data;

      useAuthStore.getState().setAuth(user, token);
      navigate('/character/create');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0118] relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -top-48 -left-48 animate-float"></div>
        <div className="absolute w-96 h-96 bg-blue-600/20 rounded-full blur-3xl top-1/3 -right-48 animate-float-delayed"></div>
        <div className="absolute w-96 h-96 bg-amber-600/20 rounded-full blur-3xl -bottom-48 left-1/3 animate-float-slow"></div>

        {/* Floating particles */}
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-float-particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${15 + Math.random() * 10}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-block p-4 rounded-full bg-gradient-to-br from-amber-400/20 to-purple-400/20 backdrop-blur-sm border border-white/10 mb-4 animate-scale-in">
              <span className="text-5xl">✨</span>
            </div>
            <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-amber-200 via-purple-200 to-blue-200 bg-clip-text text-transparent">
              Join the Adventure
            </h1>
            <p className="text-gray-300 text-lg">Create your account and start leveling up</p>
          </div>

          <form onSubmit={handleSubmit} className="glass-card p-8 border border-purple-500/20 animate-fade-in delay-200">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Forge Your Legend</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="label">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="username" className="label">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="input"
                  placeholder="adventurer123"
                  required
                  autoComplete="username"
                  pattern="[a-zA-Z0-9_]{3,50}"
                  title="3-50 characters, letters, numbers, and underscores only"
                />
                <p className="text-xs text-gray-500 mt-1">
                  3-50 characters, alphanumeric and underscores only
                </p>
              </div>

              <div>
                <label htmlFor="password" className="label">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input"
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  minLength={8}
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="label">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="input"
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-200 px-4 py-3 rounded-xl animate-fade-in">
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="modern-button w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Forging your destiny...' : 'Create Account'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm text-gray-400 animate-fade-in delay-1000">
            Already have an account?{' '}
            <Link to="/login" className="text-amber-300 font-medium hover:text-amber-200 transition-colors">
              Return to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
