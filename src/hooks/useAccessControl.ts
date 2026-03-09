import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useAccessControl = () => {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setHasAccess(false);
      setLoading(false);
      return;
    }

    const fetch = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("has_lifetime_access")
        .eq("id", user.id)
        .maybeSingle();

      setHasAccess(data?.has_lifetime_access ?? false);
      setLoading(false);
    };

    fetch();
  }, [user]);

  return { hasAccess, loading };
};
