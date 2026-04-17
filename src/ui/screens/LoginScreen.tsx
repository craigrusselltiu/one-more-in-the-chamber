import { memo, useEffect, useRef, useState } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import {
  signUpWithEmail,
  loginWithEmail,
  loginWithGoogle,
  markDisplayNameSet,
} from '../../services/auth';
import { setAuthStorageMode } from '../../services/supabase';
import {
  checkDisplayNameAvailable,
  claimDisplayName,
  validateDisplayName,
  DISPLAY_NAME_MAX,
} from '../../services/players';
import { useMetaStore } from '../../store/metaStore';
import type { Screen } from '../../App';

type Tab = 'signin' | 'signup';

const CARD_BG = 'rgba(28, 25, 23, 0.85)';
const CARD_SHADOW = '3px 3px 2px rgba(0,0,0,0.7)';
const BUTTON_SHADOW = '2px 2px 1px rgba(0,0,0,0.4)';

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoFocus,
  disabled,
  hint,
  error,
  success,
  maxLength,
}: {
  label: string;
  type: 'text' | 'email' | 'password';
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  hint?: string;
  error?: string;
  success?: string;
  maxLength?: number;
}) {
  const status = error ?? success ?? hint;
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[9px] text-stone-500 uppercase tracking-wider">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
        maxLength={maxLength}
        className="bg-stone-900/70 text-stone-100 text-[11px] px-2.5 py-1 rounded-sm outline-none disabled:opacity-60"
        style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)' }}
      />
      {status && (
        error ? (
          <span className="text-[9px] text-red-400">{error}</span>
        ) : success ? (
          <span className="text-[10px] text-emerald-400 font-bold">{'\u2713'} {success}</span>
        ) : (
          <span className="text-[9px] text-stone-500">{hint}</span>
        )
      )}
    </div>
  );
}

function AmberButton({
  children,
  onClick,
  disabled,
  full,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  full?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ boxShadow: disabled ? 'none' : BUTTON_SHADOW }}
      className={`px-4 py-1.5 text-[11px] rounded-sm transition-transform ${
        disabled
          ? 'bg-stone-800 text-stone-600 cursor-not-allowed opacity-70'
          : 'bg-amber-800 text-amber-200 hover:bg-amber-700 active:translate-y-0.5'
      } ${full ? 'w-full' : ''}`}
    >
      {children}
    </button>
  );
}

function StoneButton({
  children,
  onClick,
  full,
}: {
  children: React.ReactNode;
  onClick: () => void;
  full?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{ boxShadow: BUTTON_SHADOW, cursor: 'pointer' }}
      className={`px-4 py-1.5 text-[11px] rounded-sm bg-stone-800 text-stone-300 hover:bg-stone-700 active:translate-y-0.5 transition-transform ${
        full ? 'w-full' : ''
      }`}
    >
      {children}
    </button>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-5 py-1.5 text-[11px] rounded-sm transition-transform"
      style={{
        backgroundColor: active ? 'rgba(120, 53, 15, 0.85)' : 'rgba(28, 25, 23, 0.8)',
        color: active ? '#fcd34d' : '#a8a29e',
        boxShadow: active ? BUTTON_SHADOW : 'none',
        transform: active ? 'translateY(-2px)' : 'none',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

/** Debounced availability check used by both sign-up and pick-name flows. */
function useDisplayNameAvailability(name: string, enabled = true) {
  const [state, setState] = useState<{
    status: 'idle' | 'checking' | 'available' | 'taken' | 'invalid';
    message?: string;
  }>({ status: 'idle' });
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!enabled) return;
    if (timer.current) window.clearTimeout(timer.current);
    const trimmed = name.trim();
    if (!trimmed) {
      setState({ status: 'idle' });
      return;
    }
    const validation = validateDisplayName(trimmed);
    if (!validation.ok) {
      setState({ status: 'invalid', message: validation.message });
      return;
    }
    setState({ status: 'checking' });
    timer.current = window.setTimeout(async () => {
      const available = await checkDisplayNameAvailable(trimmed);
      setState({ status: available ? 'available' : 'taken' });
    }, 350);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [name, enabled]);
  return state;
}

/** Shared card wrapper: the stone-toned panel both screens sit inside. */
function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-sm p-4 flex flex-col gap-2.5"
      style={{
        width: 280,
        backgroundColor: CARD_BG,
        boxShadow: CARD_SHADOW,
      }}
    >
      <div className="text-center">
        <h2
          className="text-sm text-amber-400 font-bold uppercase"
          style={{ WebkitTextStroke: '3px #000', paintOrder: 'stroke fill', letterSpacing: '1px' }}
        >
          {title}
        </h2>
        {subtitle && <p className="text-[11px] text-stone-400 mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function StaySignedInToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 text-[10px] text-stone-300 bg-transparent outline-none"
      style={{ cursor: 'pointer' }}
    >
      <span
        className="inline-flex items-center justify-center rounded-sm"
        style={{
          width: 14,
          height: 14,
          backgroundColor: checked ? 'rgba(120, 53, 15, 0.85)' : 'rgba(28, 25, 23, 0.9)',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)',
        }}
      >
        {checked && (
          <span style={{ color: '#fcd34d', fontSize: '10px', lineHeight: 1 }}>{'\u2713'}</span>
        )}
      </span>
      Stay signed in
    </button>
  );
}

function nameHint(status: ReturnType<typeof useDisplayNameAvailability>['status']): string | undefined {
  if (status === 'checking') return 'Checking availability...';
  return undefined;
}

function nameSuccess(status: ReturnType<typeof useDisplayNameAvailability>['status']): string | undefined {
  if (status === 'available') return 'Available.';
  return undefined;
}

function nameError(state: ReturnType<typeof useDisplayNameAvailability>): string | undefined {
  if (state.status === 'taken') return 'Already taken.';
  if (state.status === 'invalid') return state.message;
  return undefined;
}

const LAST_EMAIL_KEY = 'omitc-last-login-email';

function readLastEmail(): string {
  try { return localStorage.getItem(LAST_EMAIL_KEY) ?? ''; } catch { return ''; }
}
function saveLastEmail(email: string): void {
  try {
    if (email) localStorage.setItem(LAST_EMAIL_KEY, email);
    else localStorage.removeItem(LAST_EMAIL_KEY);
  } catch { /* ignore */ }
}

export const LoginScreen = memo(function LoginScreen() {
  const playerName = useMetaStore((s) => s.meta.playerName);
  const [tab, setTab] = useState<Tab>('signin');
  const [email, setEmail] = useState(() => readLastEmail());
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState(playerName);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(true);

  const nameAvail = useDisplayNameAvailability(displayName, tab === 'signup');

  /** Apply the user's persistence choice before any auth call so the new
   *  session lands in localStorage (stay) or sessionStorage (tab-only). */
  const applyStayLoggedIn = () => {
    setAuthStorageMode(stayLoggedIn ? 'local' : 'session');
  };

  const handleBack = () => {
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'main-menu' satisfies Screen);
  };

  const handleSignIn = async () => {
    setFormError(null);
    applyStayLoggedIn();
    setSubmitting(true);
    const trimmedEmail = email.trim();
    const { error } = await loginWithEmail(trimmedEmail, password);
    setSubmitting(false);
    if (error) {
      setFormError(error);
      return;
    }
    saveLastEmail(trimmedEmail);
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'main-menu' satisfies Screen);
  };

  const handleSignUp = async () => {
    setFormError(null);
    const trimmedName = displayName.trim();
    const validation = validateDisplayName(trimmedName);
    if (!validation.ok) {
      setFormError(validation.message);
      return;
    }
    if (nameAvail.status === 'taken') {
      setFormError('That name is taken -- choose another.');
      return;
    }
    applyStayLoggedIn();
    setSubmitting(true);
    const stillAvailable = await checkDisplayNameAvailable(trimmedName);
    if (!stillAvailable) {
      setFormError('That name is taken -- choose another.');
      setSubmitting(false);
      return;
    }
    const { error: signUpErr } = await signUpWithEmail(email.trim(), password);
    if (signUpErr) {
      setFormError(signUpErr);
      setSubmitting(false);
      return;
    }
    const claim = await claimDisplayName(trimmedName);
    if (!claim.ok) {
      if (claim.reason === 'taken') {
        setFormError('Name was just claimed -- pick another and click Sign Up again.');
      } else if (claim.reason === 'not_authenticated') {
        setFormError(
          'Account created. Check your email to verify, then sign in to finish picking your name.',
        );
      } else {
        setFormError(claim.message ?? 'Could not save display name. Try again.');
      }
      setSubmitting(false);
      return;
    }
    markDisplayNameSet(trimmedName);
    saveLastEmail(email.trim());
    setSubmitting(false);
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'main-menu' satisfies Screen);
  };

  const handleGoogle = async () => {
    setFormError(null);
    applyStayLoggedIn();
    const { error } = await loginWithGoogle();
    if (error) setFormError(error);
  };

  const canSubmit =
    !submitting &&
    email.trim().length > 0 &&
    password.length > 0 &&
    (tab === 'signin' || (displayName.trim().length > 0 && nameAvail.status === 'available'));

  return (
    <div
      className="relative flex flex-col items-center justify-center h-full"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${import.meta.env.BASE_URL}assets/backgrounds/artifact_bg.png)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Tabs sit on top of the card */}
      <div className="flex gap-2 mb-3">
        <TabButton label="Sign In" active={tab === 'signin'} onClick={() => { setTab('signin'); setFormError(null); }} />
        <TabButton label="Sign Up" active={tab === 'signup'} onClick={() => { setTab('signup'); setFormError(null); }} />
      </div>

      <AuthCard
        title={tab === 'signin' ? 'Welcome Back' : 'Create Account'}
        subtitle={
          tab === 'signin'
            ? 'Continue your journey across the West.'
            : 'Your local progress will transfer to your account.'
        }
      >
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          autoFocus
          disabled={submitting}
        />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="at least 6 characters"
          disabled={submitting}
        />
        {tab === 'signup' && (
          <Field
            label="Display Name"
            type="text"
            value={displayName}
            onChange={setDisplayName}
            placeholder={`Up to ${DISPLAY_NAME_MAX} characters`}
            maxLength={DISPLAY_NAME_MAX}
            disabled={submitting}
            hint={nameHint(nameAvail.status)}
            success={nameSuccess(nameAvail.status)}
            error={nameError(nameAvail)}
          />
        )}

        {formError && (
          <div className="text-[11px] text-red-300 border border-red-900/70 bg-red-950/50 rounded-sm px-3 py-2 leading-snug">
            {formError}
          </div>
        )}

        <StaySignedInToggle checked={stayLoggedIn} onChange={setStayLoggedIn} />

        <div className="flex justify-between items-center gap-2 mt-1">
          <StoneButton onClick={handleBack}>Back</StoneButton>
          <AmberButton
            onClick={tab === 'signin' ? handleSignIn : handleSignUp}
            disabled={!canSubmit}
          >
            {submitting ? '...' : tab === 'signin' ? 'Sign In' : 'Sign Up'}
          </AmberButton>
        </div>

        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-px bg-stone-700" />
          <span className="text-[10px] text-stone-500 uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-stone-700" />
        </div>

        <button
          onClick={handleGoogle}
          style={{ boxShadow: BUTTON_SHADOW, cursor: 'pointer' }}
          className="w-full flex items-center justify-center gap-2 px-4 py-1.5 text-[11px] rounded-sm bg-stone-900 text-stone-200 hover:bg-stone-800 active:translate-y-0.5 transition-transform"
        >
          <GoogleMark />
          Continue with Google
        </button>
      </AuthCard>
    </div>
  );
});

/**
 * PickNameScreen: shown after OAuth first-time sign-in when the user is
 * authenticated but has no row in public.players yet.
 */
export const PickNameScreen = memo(function PickNameScreen() {
  const localName = useMetaStore((s) => s.meta.playerName);
  const [displayName, setDisplayName] = useState(localName);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nameAvail = useDisplayNameAvailability(displayName);

  const handleClaim = async () => {
    setFormError(null);
    const trimmed = displayName.trim();
    const validation = validateDisplayName(trimmed);
    if (!validation.ok) {
      setFormError(validation.message);
      return;
    }
    setSubmitting(true);
    const claim = await claimDisplayName(trimmed);
    if (!claim.ok) {
      if (claim.reason === 'taken') setFormError('That name was just claimed -- pick another.');
      else setFormError(claim.message ?? 'Could not save. Try again.');
      setSubmitting(false);
      return;
    }
    markDisplayNameSet(trimmed);
    setSubmitting(false);
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'main-menu' satisfies Screen);
  };

  const canSubmit = !submitting && nameAvail.status === 'available';

  return (
    <div
      className="relative flex flex-col items-center justify-center h-full"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${import.meta.env.BASE_URL}assets/backgrounds/artifact_bg.png)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <AuthCard
        title="Pick a Display Name"
        subtitle="This is how other players will see you."
      >
        <Field
          label="Display Name"
          type="text"
          value={displayName}
          onChange={setDisplayName}
          placeholder="3-20 chars, letters/numbers/_"
          autoFocus
          disabled={submitting}
          hint={nameHint(nameAvail.status)}
          success={nameSuccess(nameAvail.status)}
          error={nameError(nameAvail)}
        />

        {formError && (
          <div className="text-[11px] text-red-300 border border-red-900/70 bg-red-950/50 rounded-sm px-3 py-2 leading-snug">
            {formError}
          </div>
        )}

        <div className="flex justify-end">
          <AmberButton onClick={handleClaim} disabled={!canSubmit}>
            {submitting ? '...' : 'Confirm'}
          </AmberButton>
        </div>
      </AuthCard>
    </div>
  );
});

/** Google G mark rendered inline so we don't need an asset. */
function GoogleMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C33.9 6.2 29.2 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C33.9 6.2 29.2 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.8-2 13.3-5.2l-6.1-5.2C29.2 35.3 26.7 36 24 36c-5.2 0-9.6-3.1-11.3-7.5l-6.5 5C9.5 39.7 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4-4.1 5.3l6.1 5.2c-.4.4 6.7-4.9 6.7-14.5 0-1.2-.1-2.4-.4-3.5z" />
    </svg>
  );
}
