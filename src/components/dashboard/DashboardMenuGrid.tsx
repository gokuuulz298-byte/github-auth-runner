import { memo, useMemo } from "react";
import { UserCog } from "lucide-react";
import DashboardMenuCard from "./DashboardMenuCard";

interface MenuItem {
  icon: any;
  label: string;
  path: string;
  id: string;
  color: string;
  description: string;
}

interface DashboardMenuGridProps {
  menuItems: MenuItem[] | null;
  onNavigate: (path: string) => void;
}

const DashboardMenuGrid = memo(({ menuItems, onNavigate }: DashboardMenuGridProps) => {
  const gridContent = useMemo(() => {
    if (menuItems === null) {
      // Shimmer loader for staff accounts loading modules
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      );
    }

    if (menuItems.length === 0) {
      return (
        <div className="text-center py-16">
          <UserCog className="h-14 w-14 mx-auto mb-3 text-muted-foreground/40" />
          <h3 className="text-base font-medium text-muted-foreground">No modules assigned</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Contact your administrator to get access.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {menuItems.map((item, index) => (
          <DashboardMenuCard
            key={item.path}
            icon={item.icon}
            label={item.label}
            description={item.description}
            color={item.color}
            index={index}
            onClick={() => onNavigate(item.path)}
          />
        ))}
      </div>
    );
  }, [menuItems, onNavigate]);

  return gridContent;
});

DashboardMenuGrid.displayName = "DashboardMenuGrid";

export default DashboardMenuGrid;
