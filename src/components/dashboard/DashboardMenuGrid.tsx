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
  // Memoize the grid to prevent re-renders
  const gridContent = useMemo(() => {
    if (menuItems === null) {
      return (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (menuItems.length === 0) {
      return (
        <div className="text-center py-12 fade-in">
          <UserCog className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium text-muted-foreground">No modules assigned</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Contact your administrator to get access to modules.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
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
