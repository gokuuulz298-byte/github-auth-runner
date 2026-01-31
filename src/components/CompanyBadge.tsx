import { memo, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Building2 } from "lucide-react";

/**
 * Golden shiny company name badge for header display
 * Caches company name in sessionStorage for performance
 */
const CompanyBadge = memo(() => {
  const [companyName, setCompanyName] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanyName = async () => {
      // Check sessionStorage cache first
      const cached = sessionStorage.getItem('company_name_cache');
      if (cached) {
        const { name, timestamp } = JSON.parse(cached);
        // Cache valid for 5 minutes
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          setCompanyName(name);
          return;
        }
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('company_profiles')
          .select('company_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data?.company_name) {
          setCompanyName(data.company_name);
          sessionStorage.setItem('company_name_cache', JSON.stringify({
            name: data.company_name,
            timestamp: Date.now()
          }));
        }
      } catch (error) {
        console.error("Error fetching company name:", error);
      }
    };

    fetchCompanyName();
  }, []);

  if (!companyName) return null;

  return (
    <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 dark:from-amber-600 dark:via-yellow-500 dark:to-amber-600 shadow-md border border-amber-400/50">
      <Building2 className="h-3.5 w-3.5 text-amber-800 dark:text-amber-100" />
      <span className="text-xs font-bold text-amber-900 dark:text-amber-50 tracking-wide truncate max-w-[150px]">
        {companyName}
      </span>
    </div>
  );
});

CompanyBadge.displayName = "CompanyBadge";

export default CompanyBadge;
