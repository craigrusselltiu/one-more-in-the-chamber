import { memo, useState } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import {
  loginWithEmail,
  signUpWithEmail,
  loginWithGoogle,
  loginWithGithub,
  loginWithDiscord,
} from '../../services/auth';
import { playHover } from '../../services/sfx';
import type { Screen } from '../../App';

type AuthMode = 'login' | 'signup';

function SocialButton({
  label,
  onClick,
  color,
  disabled,
}: {
  label: string;
  onClick: () => void;
  color: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={playHover}
      disabled={disabled}
      className="w-full py-2 text-xs border text-stone-200 hover:brightness-125 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        backgroundColor: color,
        borderColor: 'rgba(255,255,255,0.15)',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {label}
    </button>
  );
}

export const AuthScreen = memo(function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleBack = () => {
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'main-menu' satisfies Screen);
  };

  const handleEmailSubmit = async () => {
    if (!email.trim() || !password.trim()) return;
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    const result =
      mode === 'login'
        ? await loginWithEmail(email, password)
        : await signUpWithEmail(email, password);

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else if (mode === 'signup') {
      setSuccessMsg('Check your email to confirm your account.');
    } else {
      // Login success -- go back to main menu
      EventBus.emit(GameEvent.SCREEN_CHANGE, 'main-menu' satisfies Screen);
    }
  };

  const handleSocial = async (
    provider: () => Promise<{ error: string | null }>,
  ) => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    const result = await provider();
    setLoading(false);
    if (result.error) setError(result.error);
    // OAuth redirects the page, so no explicit navigation needed on success
  };

  return (
    <div className="flex flex-col items-center h-full bg-[#1a1a2e]/95">
      {/* Header */}
      <div className="mt-6 mb-2 text-center">
        <h2
          className="text-xl text-amber-400"
          style={{ letterSpacing: '1px' }}
        >
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </h2>
        <p className="text-xs text-stone-500 mt-1">
          Sign in to sync progress & compete on leaderboards
        </p>
      </div>

      <div className="w-full max-w-[300px] px-4 flex flex-col gap-3">
        {/* Social login buttons */}
        <div className="flex flex-col gap-2">
          <SocialButton
            label="Continue with Google"
            onClick={() => handleSocial(loginWithGoogle)}
            color="rgba(66, 133, 244, 0.3)"
            disabled={loading}
          />
          <SocialButton
            label="Continue with GitHub"
            onClick={() => handleSocial(loginWithGithub)}
            color="rgba(110, 84, 148, 0.3)"
            disabled={loading}
          />
          <SocialButton
            label="Continue with Discord"
            onClick={() => handleSocial(loginWithDiscord)}
            color="rgba(88, 101, 242, 0.3)"
            disabled={loading}
          />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-stone-700" />
          <span className="text-[10px] text-stone-500">or use email</span>
          <div className="flex-1 h-px bg-stone-700" />
        </div>

        {/* Email form */}
        <div className="flex flex-col gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            disabled={loading}
            autoComplete="email"
            className="w-full bg-stone-800/60 border border-stone-600 text-stone-200 text-xs px-3 py-2 outline-none focus:border-amber-600 disabled:opacity-50"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleEmailSubmit();
            }}
            placeholder="Password"
            disabled={loading}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="w-full bg-stone-800/60 border border-stone-600 text-stone-200 text-xs px-3 py-2 outline-none focus:border-amber-600 disabled:opacity-50"
          />

          <button
            onClick={handleEmailSubmit}
            onMouseEnter={playHover}
            disabled={loading || !email.trim() || !password.trim()}
            className="w-full py-2 text-xs border disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'rgba(180, 83, 9, 0.4)',
              borderColor: '#b45309',
              color: '#fbbf24',
              cursor:
                loading || !email.trim() || !password.trim()
                  ? 'not-allowed'
                  : 'pointer',
            }}
          >
            {loading
              ? 'Please wait...'
              : mode === 'login'
                ? 'Sign In'
                : 'Create Account'}
          </button>
        </div>

        {/* Error / success messages */}
        {error && (
          <p className="text-red-400 text-[10px] text-center">{error}</p>
        )}
        {successMsg && (
          <p className="text-green-400 text-[10px] text-center">{successMsg}</p>
        )}

        {/* Toggle mode */}
        <p className="text-[10px] text-stone-500 text-center">
          {mode === 'login' ? (
            <>
              No account?{' '}
              <button
                onClick={() => {
                  setMode('signup');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="text-amber-400 underline bg-transparent border-none p-0"
                style={{ cursor: 'pointer' }}
              >
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="text-amber-400 underline bg-transparent border-none p-0"
                style={{ cursor: 'pointer' }}
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Back button */}
      <div className="py-3">
        <button
          onClick={handleBack}
          onMouseEnter={playHover}
          className="px-6 py-2 bg-stone-700/50 text-stone-300 text-sm border border-stone-600 hover:bg-stone-600/50"
          style={{ cursor: 'pointer' }}
        >
          Back
        </button>
      </div>
    </div>
  );
});
