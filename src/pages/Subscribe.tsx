import { useAuth } from "@/hooks/useAuth";

const Subscribe = () => {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Subscribe to Continue</h1>
        <p className="text-muted-foreground text-sm">
          You need an active subscription to access the app. Choose a plan below to get started.
        </p>
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <p className="text-lg font-semibold text-foreground">Premium Plan</p>
          <p className="text-3xl font-bold text-primary">Coming Soon</p>
          <p className="text-xs text-muted-foreground">
            Subscription payments will be available shortly.
          </p>
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
