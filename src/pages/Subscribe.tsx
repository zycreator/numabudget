import { useAuth } from "@/hooks/useAuth";

const LEMON_SQUEEZY_CHECKOUT_URL = "https://numa.lemonsqueezy.com/checkout/buy/6dcc6e88-5ab7-4c75-a463-ea026f54c3dc";

const Subscribe = () => {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Subscribe to Continue</h1>
        <p className="text-muted-foreground text-sm">
          You need an active subscription to access the app. Get lifetime access below.
        </p>
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <p className="text-lg font-semibold text-foreground">Lifetime Access</p>
          <p className="text-3xl font-bold text-primary">One-Time Payment</p>
          <p className="text-xs text-muted-foreground">
            Pay once, use forever. No recurring fees.
          </p>
          <a
            href={LEMON_SQUEEZY_CHECKOUT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Get Lifetime Access
          </a>
        </div>
        <button
          onClick={signOut}
          className="text-sm text-muted-foreground hover:text-foreground underline"
        >
          Sign out
        </button>
      </div>
    </div>
  );
};

export default Subscribe;
