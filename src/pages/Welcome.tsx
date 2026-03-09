import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAccessControl } from "@/hooks/useAccessControl";
import { useEffect } from "react";
import logo from "@/assets/logo.png";
import { Check } from "lucide-react";

const Welcome = () => {
  const { user, loading: authLoading } = useAuth();
  const { hasAccess, loading: subLoading } = useAccessControl();
  const navigate = useNavigate();

  // If user doesn't have access yet, redirect to subscribe
  useEffect(() => {
    if (!authLoading && !subLoading) {
      if (!user) navigate("/auth", { replace: true });
      else if (!hasAccess) navigate("/subscribe", { replace: true });
    }
  }, [user, hasAccess, authLoading, subLoading, navigate]);

  if (authLoading || subLoading) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Check className="h-8 w-8 text-primary" />
          </div>
          <img src={logo} alt="Numa" className="h-12 mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">You're in! 🎉</h1>
          <p className="text-muted-foreground text-sm">
            Your lifetime access is active. Let's set up your first budget and take control of your finances.
          </p>
        </div>

        <button
          onClick={() => navigate("/", { replace: true })}
          className="w-full rounded-xl bg-primary px-6 py-4 text-base font-bold text-primary-foreground transition-colors hover:bg-primary/90 shadow-md"
        >
          Create My First Budget →
        </button>
      </div>
    </div>
  );
};

export default Welcome;
