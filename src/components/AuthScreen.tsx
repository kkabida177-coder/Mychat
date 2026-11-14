import { FormEvent, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import {
  CheckCircle2,
  Lock,
  LogOut,
  Mail,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';
import { ensureUserAccountInitialized } from '../lib/chatService';
import { AVATAR_PRESETS } from '../types/chat';

interface AuthScreenProps {
  pendingVerificationUser: User | null;
  onVerified: () => Promise<void>;
}

export function AuthScreen({ pendingVerificationUser, onVerified }: AuthScreenProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_PRESETS[0].url);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showEmailProviderGuide, setShowEmailProviderGuide] = useState(false);

  const handleGoogleSignIn = async () => {
    setError(null);
    setInfo(null);
    setShowEmailProviderGuide(false);
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await ensureUserAccountInitialized(cred.user);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sign in with Google.';
      if (message.includes('popup-closed-by-user')) {
        setError('Sign-in window was closed before completing.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setShowEmailProviderGuide(false);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError('Please enter your email and password.');
      return;
    }

    if (mode === 'signup' && !displayName.trim()) {
      setError('Please enter your name for your profile.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        await updateProfile(cred.user, {
          displayName: displayName.trim().slice(0, 60),
          photoURL: selectedAvatar,
        });
        await sendEmailVerification(cred.user);
        setInfo('Account created! We sent a verification link to your email.');
      } else {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        if (cred.user.emailVerified) {
          await ensureUserAccountInitialized(cred.user);
        }
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      const rawMessage = err instanceof Error ? err.message : 'Authentication failed.';

      if (code === 'auth/operation-not-allowed') {
        setShowEmailProviderGuide(true);
        setError('Email/Password sign-in is not enabled yet on this Firebase project.');
      } else if (code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Try signing in instead.');
      } else if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        setError('Incorrect email or password. Please check your credentials.');
      } else if (code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(rawMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!pendingVerificationUser) return;
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      await sendEmailVerification(pendingVerificationUser);
      setInfo('Verification email sent. Please check your inbox and spam folder.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend verification email.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerified = async () => {
    if (!pendingVerificationUser) return;
    setLoading(true);
    setError(null);
    try {
      await pendingVerificationUser.reload();
      if (auth.currentUser?.emailVerified) {
        await onVerified();
      } else {
        setError('Email is not verified yet. Please click the link in your email first.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify status.');
    } finally {
      setLoading(false);
    }
  };

  if (pendingVerificationUser) {
    return (
      <div className="min-h-screen w-full bg-[#F0F2F5] flex flex-col">
        <div className="h-44 bg-[#008069] w-full shrink-0" />
        <main className="flex-1 flex items-start justify-center px-4 -mt-28 pb-10 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200/80 p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-[#E7F8F0] text-[#008069] flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-[#111B21]">Verify your email</h1>
                <p className="text-sm text-slate-500">{pendingVerificationUser.email}</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              For account security, My Chat requires a verified email address before activating your
              conversations. Click the verification link sent to your inbox, then tap continue.
            </p>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {info && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
                {info}
              </div>
            )}

            <div className="space-y-3">
              <button
                type="button"
                disabled={loading}
                onClick={handleCheckVerified}
                className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-[#00A884] hover:bg-[#008069] text-white font-medium text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>I&apos;ve Verified — Continue</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={handleResendVerification}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Resend Verification Email</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => signOut(auth)}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-medium text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out &amp; Switch Account</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#F0F2F5] flex flex-col overflow-y-auto">
      {/* Top Emerald Banner */}
      <div className="bg-[#008069] pt-8 pb-28 px-4 sm:px-8 shrink-0">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-white border border-white/20">
            <MessageCircle className="w-6 h-6" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-white">My Chat</span>
        </div>
      </div>

      {/* Main Centered Split Card */}
      <main className="flex-1 px-4 -mt-20 pb-10">
        <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* Left Info Panel */}
          <div className="lg:col-span-5 bg-gradient-to-br from-[#F4FBF7] via-white to-[#ECFDF5] p-6 sm:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-100">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#008069] tracking-wide">
                <Lock className="w-3.5 h-3.5" />
                <span>Private One-to-One Messaging</span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#111B21] leading-tight [text-wrap:balance]">
                Fast, crisp conversations with the people who matter.
              </h1>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Sign in to message friends in real time, share emojis, see live online status, and
                keep your conversations synced across desktop and mobile.
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-emerald-900/10 space-y-3 text-sm text-slate-600">
              <div className="flex items-start gap-3">
                <span className="h-6 w-6 rounded-full bg-[#00A884]/15 text-[#008069] font-display font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <span>Sign in with Google in one click or create an email account.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="h-6 w-6 rounded-full bg-[#00A884]/15 text-[#008069] font-display font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <span>Customize your name, @username handle, and profile picture.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="h-6 w-6 rounded-full bg-[#00A884]/15 text-[#008069] font-display font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <span>Add friends by @username or invite link and start chatting live.</span>
              </div>
            </div>
          </div>

          {/* Right Auth Form */}
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
            <div className="max-w-md w-full mx-auto space-y-6">
              {/* Primary Google Auth Button */}
              <div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleGoogleSignIn}
                  className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 active:scale-[0.99] text-[#111B21] font-medium text-sm flex items-center justify-center gap-3 shadow-xs transition-all disabled:opacity-60"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.91 6.72-4.91Z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </div>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-xs text-slate-400 whitespace-nowrap">
                  or use email
                </span>
                <div className="border-t border-slate-200 w-full" />
              </div>

              {/* Segmented Sign In / Sign Up Tabs */}
              <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setError(null);
                    setInfo(null);
                  }}
                  className={`min-h-[40px] rounded-lg text-sm font-medium transition-all ${
                    mode === 'signin'
                      ? 'bg-white text-[#111B21] shadow-xs'
                      : 'text-slate-600 hover:text-[#111B21]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                    setInfo(null);
                  }}
                  className={`min-h-[40px] rounded-lg text-sm font-medium transition-all ${
                    mode === 'signup'
                      ? 'bg-white text-[#111B21] shadow-xs'
                      : 'text-slate-600 hover:text-[#111B21]'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 space-y-2">
                  <p>{error}</p>
                  {showEmailProviderGuide && (
                    <p className="text-xs text-red-600 leading-relaxed">
                      To enable Email/Password login: open Firebase Console &rarr; Authentication
                      &rarr; Sign-in method &rarr; Add new provider &rarr; Email/Password &rarr;
                      Enable and Save. Or click <strong>Continue with Google</strong> above to sign
                      in right away.
                    </p>
                  )}
                </div>
              )}

              {info && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
                  {info}
                </div>
              )}

              <form onSubmit={handleEmailAuth} className="space-y-4">
                {mode === 'signup' && (
                  <>
                    <div>
                      <label
                        htmlFor="auth-name"
                        className="block text-xs font-medium text-slate-700 mb-1.5"
                      >
                        Display Name
                      </label>
                      <div className="relative">
                        <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="auth-name"
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="e.g. Maya Lin"
                          maxLength={60}
                          className="w-full min-h-[44px] pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00A884]/30 focus:border-[#00A884]"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="block text-xs font-medium text-slate-700 mb-2">
                        Choose a Starter Avatar
                      </span>
                      <div className="flex items-center gap-3">
                        {AVATAR_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setSelectedAvatar(preset.url)}
                            title={preset.label}
                            className={`rounded-full p-0.5 transition-all ${
                              selectedAvatar === preset.url
                                ? 'ring-2 ring-[#00A884] ring-offset-2 scale-105'
                                : 'opacity-75 hover:opacity-100'
                            }`}
                          >
                            <img
                              src={preset.url}
                              alt={preset.label}
                              className="h-11 w-11 rounded-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label
                    htmlFor="auth-email"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="auth-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="w-full min-h-[44px] pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00A884]/30 focus:border-[#00A884]"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="auth-password"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="auth-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                      className="w-full min-h-[44px] pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00A884]/30 focus:border-[#00A884]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-[#00A884] hover:bg-[#008069] active:scale-[0.99] text-white font-semibold text-sm transition-all disabled:opacity-60"
                >
                  {loading
                    ? 'Please wait...'
                    : mode === 'signin'
                      ? 'Sign In to My Chat'
                      : 'Create My Chat Account'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
