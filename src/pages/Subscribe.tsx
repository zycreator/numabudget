import { useAuth } from "@/hooks/useAuth";
import { Check, Star, Shield, Zap, RefreshCw } from "lucide-react";

const LEMON_SQUEEZY_CHECKOUT_URL = "https://numa.lemonsqueezy.com/checkout/buy/6dcc6e88-5ab7-4c75-a463-ea026f54c3dc";

const benefits = [
  { icon: Zap, text: "One-time payment" },
  { icon: RefreshCw, text: "No monthly fees" },
  { icon: Shield, text: "Secure & Private" },
  { icon: Check, text: "Lifetime Updates" },
];

const testimonials = [
  { name: "Your Name Here", text: "Add your review here. This is a placeholder testimonial.", rating: 5 },
  { name: "Another User", text: "Replace this with a real testimonial from a happy customer.", rating: 5 },
  { name: "Happy Customer", text: "One more placeholder — swap it out when you have real feedback!", rating: 5 },
];

const Subscribe = () => {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full space-y-10 text-center">
        {/* Hero */}
        <div className="space-y-3">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
            Take Control of Your Finances Forever.
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Stop paying monthly. Get full access to Numa Budget with a single payment — yours for life.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          {benefits.map((b) => (
            <div key={b.text} className="flex items-center gap-3 rounded-xl border border-border bg-card/60 backdrop-blur-sm px-4 py-3">
              <b.icon className="h-5 w-5 text-primary shrink-0" />
              <span className="text-sm font-medium text-foreground">{b.text}</span>
            </div>
          ))}
        </div>

        {/* Price + CTA */}
        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-xl p-8 space-y-5 shadow-lg shadow-black/10 max-w-md mx-auto">
          <p className="text-muted-foreground text-sm uppercase tracking-widest font-semibold">Lifetime Access</p>
          <p className="text-5xl font-black text-foreground">₱200<span className="text-lg font-medium text-muted-foreground">.00</span></p>
          <p className="text-xs text-muted-foreground">One-time payment · No hidden fees · Cancel-proof</p>
          <a
            href={LEMON_SQUEEZY_CHECKOUT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block w-full rounded-xl bg-green-600 hover:bg-green-700 px-6 py-4 text-base font-bold text-white transition-colors shadow-md shadow-green-900/20"
          >
            Get Lifetime Access →
          </a>
        </div>

        {/* Testimonials */}
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">What people are saying</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {testimonials.map((t, i) => (
              <div key={i} className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-5 text-left space-y-2">
                <div className="flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground italic">"{t.text}"</p>
                <p className="text-xs font-semibold text-foreground">— {t.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sign out */}
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
