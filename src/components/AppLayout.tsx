import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function AppLayout() {
  const [companyName, setCompanyName] = useState<string>("");

  useEffect(() => {
    const fetchCompanyProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from('company_profiles')
          .select('company_name')
          .eq('user_id', session.user.id)
          .maybeSingle();
        
        if (data) {
          setCompanyName(data.company_name);
        }
      }
    };

    fetchCompanyProfile();
  }, []);

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col w-full">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-card/80 backdrop-blur-sm px-4">
            <SidebarTrigger className="text-foreground" />
            <div className="flex-1">
              {companyName && (
                <h2 className="text-sm font-medium text-muted-foreground">
                  {companyName}
                </h2>
              )}
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
