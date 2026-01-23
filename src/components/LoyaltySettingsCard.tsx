import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Gift, Award, Coins } from "lucide-react";
import { toast } from "sonner";
import LoadingButton from "@/components/LoadingButton";

interface LoyaltySettings {
  id?: string;
  points_per_rupee: number;
  rupees_per_point_redeem: number;
  min_points_to_redeem: number;
  is_active: boolean;
}

interface LoyaltySettingsCardProps {
  userId: string;
}

const LoyaltySettingsCard = ({ userId }: LoyaltySettingsCardProps) => {
  const [settings, setSettings] = useState<LoyaltySettings>({
    points_per_rupee: 1,
    rupees_per_point_redeem: 1,
    min_points_to_redeem: 100,
    is_active: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [userId]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('loyalty_settings')
        .select('*')
        .eq('created_by', userId)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setSettings({
          id: data.id,
          points_per_rupee: Number(data.points_per_rupee) || 1,
          rupees_per_point_redeem: Number(data.rupees_per_point_redeem) || 1,
          min_points_to_redeem: data.min_points_to_redeem || 100,
          is_active: data.is_active ?? true,
        });
      }
    } catch (error) {
      console.error("Error fetching loyalty settings:", error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (settings.id) {
        // Update existing
        const { error } = await supabase
          .from('loyalty_settings')
          .update({
            points_per_rupee: settings.points_per_rupee,
            rupees_per_point_redeem: settings.rupees_per_point_redeem,
            min_points_to_redeem: settings.min_points_to_redeem,
            is_active: settings.is_active,
          })
          .eq('id', settings.id);
        
        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('loyalty_settings')
          .insert({
            created_by: userId,
            points_per_rupee: settings.points_per_rupee,
            rupees_per_point_redeem: settings.rupees_per_point_redeem,
            min_points_to_redeem: settings.min_points_to_redeem,
            is_active: settings.is_active,
          })
          .select()
          .single();
        
        if (error) throw error;
        setSettings(prev => ({ ...prev, id: data.id }));
      }
      
      toast.success("Loyalty settings saved!");
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving loyalty settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Gift className="h-4 w-4 text-amber-600" />
            Loyalty Points Configuration
          </CardTitle>
          <div className="flex items-center gap-2">
            <Switch
              checked={settings.is_active}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, is_active: checked }))}
            />
            <span className="text-xs text-muted-foreground">
              {settings.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs flex items-center gap-1">
                  <Coins className="h-3 w-3" />
                  Points per ₹ spent
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={settings.points_per_rupee}
                  onChange={(e) => setSettings(prev => ({ ...prev, points_per_rupee: parseFloat(e.target.value) || 1 }))}
                  className="mt-1"
                  placeholder="e.g., 1 = 1 point per ₹1"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Customer earns {settings.points_per_rupee} point(s) for every ₹1 spent
                </p>
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1">
                  <Award className="h-3 w-3" />
                  ₹ value per point
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.01"
                  value={settings.rupees_per_point_redeem}
                  onChange={(e) => setSettings(prev => ({ ...prev, rupees_per_point_redeem: parseFloat(e.target.value) || 1 }))}
                  className="mt-1"
                  placeholder="e.g., 1 = ₹1 per point"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Each point is worth ₹{settings.rupees_per_point_redeem} when redeemed
                </p>
              </div>
              <div>
                <Label className="text-xs">Minimum points to redeem</Label>
                <Input
                  type="number"
                  min="1"
                  value={settings.min_points_to_redeem}
                  onChange={(e) => setSettings(prev => ({ ...prev, min_points_to_redeem: parseInt(e.target.value) || 100 }))}
                  className="mt-1"
                  placeholder="e.g., 100"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Customer needs at least {settings.min_points_to_redeem} points to redeem
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <LoadingButton onClick={handleSave} isLoading={isSaving} className="flex-1">
                Save Settings
              </LoadingButton>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between">
            <div className="grid grid-cols-3 gap-4 flex-1">
              <div className="text-center p-2 bg-background/50 rounded-lg">
                <p className="text-lg font-bold text-amber-600">{settings.points_per_rupee}</p>
                <p className="text-[10px] text-muted-foreground">Pts/₹ earned</p>
              </div>
              <div className="text-center p-2 bg-background/50 rounded-lg">
                <p className="text-lg font-bold text-green-600">₹{settings.rupees_per_point_redeem}</p>
                <p className="text-[10px] text-muted-foreground">Value/Point</p>
              </div>
              <div className="text-center p-2 bg-background/50 rounded-lg">
                <p className="text-lg font-bold text-purple-600">{settings.min_points_to_redeem}</p>
                <p className="text-[10px] text-muted-foreground">Min redeem</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="ml-4">
              <Settings className="h-3.5 w-3.5 mr-1" />
              Edit
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LoyaltySettingsCard;
