import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Building2, Settings, Lock, UserCog, UserCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import LoadingButton from "@/components/LoadingButton";
import WaiterCard from "@/components/WaiterCard";
import StaffCard from "@/components/StaffCard";
import LoadingSpinner from "@/components/LoadingSpinner";

interface CompanyProfile {
  id?: string;
  company_name: string;
  company_name_tamil?: string;
  phone: string;
  email: string;
  address: string;
  gstin: string;
  billing_settings?: BillingSettings | null;
  city: string;
  state: string;
  pincode: string;
  thank_you_note: string;
}

interface BillingSettings {
  ModernBilling: {
    mode: "inclusive" | "exclusive";
    inclusiveBillType: "split" | "nosplit";
  };
  ManualBilling: {
    mode: "inclusive" | "exclusive";
    inclusiveBillType: "split" | "nosplit";
    allowIgst: boolean;
  };
  isRestaurant?: boolean;
  enableParcelBill?: boolean;
  autoPrint?: boolean;
  defaultPaymentMode?: string;
  enableKitchenInterface?: boolean;
  securityProtection?: boolean;
  billingPassword?: string;
  kitchenPassword?: string;
  enableWaiters?: boolean;
  enableBilingualBill?: boolean;
}

interface Waiter {
  id: string;
  username: string;
  display_name: string;
  is_active: boolean;
}

interface Staff {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  allowed_modules: string[];
  is_active: boolean;
  show_in_bill: boolean;
}

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [profile, setProfile] = useState<CompanyProfile>({
    company_name: "",
    company_name_tamil: "",
    phone: "",
    email: "",
    address: "",
    gstin: "",
    city: "",
    state: "",
    pincode: "",
    thank_you_note: "Thank you for your business!",
  });

  useEffect(() => {
    Promise.all([fetchProfile(), fetchWaiters(), fetchStaff()]).finally(() => {
      setPageLoading(false);
    });
  }, []);

  const fetchWaiters = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Only select non-sensitive fields - never fetch passwords
      const { data, error } = await supabase
        .from('waiters')
        .select('id, username, display_name, is_active, created_by, auth_user_id, created_at, updated_at')
        .eq('created_by', user.id)
        .order('display_name');

      if (error) throw error;
      setWaiters((data || []) as Waiter[]);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchStaff = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('created_by', user.id)
        .order('display_name');

      if (error) throw error;
      setStaff((data || []) as Staff[]);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setProfile({
          ...data,
          billing_settings: (data.billing_settings as unknown as BillingSettings) ?? null
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const safeProfile: any = {
        ...profile,
        billing_settings: profile.billing_settings as unknown as any
      };

      if (profile.id) {
        const { error } = await supabase
          .from("company_profiles")
          .update(safeProfile)
          .eq("id", profile.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("company_profiles")
          .insert([{ ...safeProfile, user_id: user.id }]);

        if (error) throw error;
      }

      toast.success("Profile saved successfully!");
      // Update session cache
      sessionStorage.setItem('companyName', profile.company_name);
      fetchProfile();
    } catch (error) {
      console.error(error);
      toast.error("Error saving profile");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!oldPassword) {
      toast.error("Please enter your current password");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setPasswordLoading(true);

    try {
      // First verify old password by re-authenticating
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("User not found");

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPassword,
      });

      if (signInError) {
        toast.error("Current password is incorrect");
        setPasswordLoading(false);
        return;
      }

      // Now update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success("Password changed successfully!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Error changing password");
    } finally {
      setPasswordLoading(false);
    }
  };

  // Billing Settings Component
  const BillingSettingsSection = () => {
    const [settingsLoading, setSettingsLoading] = useState(true);
    const [settings, setSettings] = useState<BillingSettings>({
      ModernBilling: { mode: "inclusive", inclusiveBillType: "split" },
      ManualBilling: { mode: "exclusive", inclusiveBillType: "split", allowIgst: true },
      isRestaurant: false,
      enableParcelBill: false,
      autoPrint: false,
      defaultPaymentMode: "cash",
      enableKitchenInterface: false,
      securityProtection: false,
      billingPassword: "",
      kitchenPassword: "",
      enableBilingualBill: false
    });

    useEffect(() => {
      setSettingsLoading(true);
      if (profile?.billing_settings) {
        setSettings({
          ModernBilling: {
            mode: profile.billing_settings.ModernBilling?.mode || "inclusive",
            inclusiveBillType: profile.billing_settings.ModernBilling?.inclusiveBillType || "split"
          },
          ManualBilling: {
            mode: profile.billing_settings.ManualBilling?.mode || "exclusive",
            inclusiveBillType: profile.billing_settings.ManualBilling?.inclusiveBillType || "split",
            allowIgst: profile.billing_settings.ManualBilling?.allowIgst ?? true
          },
          isRestaurant: profile.billing_settings.isRestaurant ?? false,
          enableParcelBill: profile.billing_settings.enableParcelBill ?? false,
          autoPrint: profile.billing_settings.autoPrint ?? false,
          defaultPaymentMode: profile.billing_settings.defaultPaymentMode || "cash",
          enableKitchenInterface: profile.billing_settings.enableKitchenInterface ?? false,
          securityProtection: profile.billing_settings.securityProtection ?? false,
          billingPassword: profile.billing_settings.billingPassword || "",
          kitchenPassword: profile.billing_settings.kitchenPassword || "",
          enableBilingualBill: profile.billing_settings.enableBilingualBill ?? false
        });
      }
      setTimeout(() => setSettingsLoading(false), 300);
    }, [profile]);

    const [isSaving, setIsSaving] = useState(false);

    const save = async () => {
      setIsSaving(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Sign in required");
        
        const { error } = await supabase
          .from('company_profiles')
          .update({ billing_settings: settings as unknown as any })
          .eq('user_id', user.id);
        
        if (error) throw error;
        
        // Update session cache
        sessionStorage.setItem('billingSettings', JSON.stringify(settings));
        
        toast.success("Settings saved successfully");
        fetchProfile();
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Failed to save");
      } finally {
        setIsSaving(false);
      }
    };

    if (settingsLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Modern Billing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Modern Billing Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Tax Mode</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant={settings.ModernBilling.mode === "inclusive" ? "default" : "outline"}
                  onClick={() =>
                    setSettings({
                      ...settings,
                      ModernBilling: { ...settings.ModernBilling, mode: "inclusive" }
                    })
                  }
                >
                  Inclusive (MRP)
                </Button>
                <Button
                  type="button"
                  variant={settings.ModernBilling.mode === "exclusive" ? "default" : "outline"}
                  onClick={() =>
                    setSettings({
                      ...settings,
                      ModernBilling: { ...settings.ModernBilling, mode: "exclusive" }
                    })
                  }
                >
                  Exclusive (Add GST)
                </Button>
              </div>
            </div>

            {settings.ModernBilling.mode === "inclusive" && (
              <div>
                <Label>Show Tax Type</Label>
                <select
                  value={settings.ModernBilling.inclusiveBillType}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ModernBilling: {
                        ...settings.ModernBilling,
                        inclusiveBillType: e.target.value as "split" | "nosplit"
                      }
                    })
                  }
                  className="border rounded p-2 w-full mt-1 bg-background"
                >
                  <option value="split">Show Tax Split (Base + GST)</option>
                  <option value="mrp">No Tax Columns (MRP Inclusive)</option>
                </select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manual Billing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Manual Billing Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Tax Mode</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant={settings.ManualBilling.mode === "inclusive" ? "default" : "outline"}
                  onClick={() =>
                    setSettings({
                      ...settings,
                      ManualBilling: { ...settings.ManualBilling, mode: "inclusive" }
                    })
                  }
                >
                  Inclusive
                </Button>
                <Button
                  type="button"
                  variant={settings.ManualBilling.mode === "exclusive" ? "default" : "outline"}
                  onClick={() =>
                    setSettings({
                      ...settings,
                      ManualBilling: { ...settings.ManualBilling, mode: "exclusive" }
                    })
                  }
                >
                  Exclusive
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={settings.ManualBilling.allowIgst}
                onCheckedChange={(v) =>
                  setSettings({
                    ...settings,
                    ManualBilling: { ...settings.ManualBilling, allowIgst: v }
                  })
                }
              />
              <span>Allow IGST</span>
            </div>
          </CardContent>
        </Card>

        {/* Restaurant Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Restaurant Mode</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch
                checked={settings.isRestaurant || false}
                onCheckedChange={(v) =>
                  setSettings({
                    ...settings,
                    isRestaurant: v,
                    enableKitchenInterface: v ? settings.enableKitchenInterface : false
                  })
                }
              />
              <div>
                <span className="font-medium">Enable Restaurant Mode</span>
                <p className="text-xs text-muted-foreground">
                  Shows parcel/takeaway toggle and enables kitchen & waiter interfaces
                </p>
              </div>
            </div>

            {settings.isRestaurant && (
              <div className="ml-6 space-y-4 border-l-2 pl-4">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={settings.enableKitchenInterface || false}
                    onCheckedChange={(v) =>
                      setSettings({ ...settings, enableKitchenInterface: v })
                    }
                  />
                  <span>Enable Kitchen Interface</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch
                checked={settings.securityProtection || false}
                onCheckedChange={(v) =>
                  setSettings({ ...settings, securityProtection: v })
                }
              />
              <div>
                <span className="font-medium">Password Protection</span>
                <p className="text-xs text-muted-foreground">
                  Require passwords to access billing and kitchen
                </p>
              </div>
            </div>

            {settings.securityProtection && (
              <div className="ml-6 space-y-4 border-l-2 pl-4">
                <div>
                  <Label htmlFor="billingPassword">Billing Password</Label>
                  <Input
                    id="billingPassword"
                    type="password"
                    value={settings.billingPassword || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, billingPassword: e.target.value })
                    }
                    placeholder="Set billing password"
                    className="mt-1 max-w-xs"
                  />
                </div>
                {settings.enableKitchenInterface && (
                  <div>
                    <Label htmlFor="kitchenPassword">Kitchen Password</Label>
                    <Input
                      id="kitchenPassword"
                      type="password"
                      value={settings.kitchenPassword || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, kitchenPassword: e.target.value })
                      }
                      placeholder="Set kitchen password"
                      className="mt-1 max-w-xs"
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Print Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Print Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch
                checked={settings.autoPrint || false}
                onCheckedChange={(v) => setSettings({ ...settings, autoPrint: v })}
              />
              <span>Auto-print on Complete Sale</span>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={settings.enableBilingualBill || false}
                onCheckedChange={(v) => setSettings({ ...settings, enableBilingualBill: v })}
              />
              <div>
                <span className="font-medium">Bilingual Bill (English + Tamil)</span>
                <p className="text-xs text-muted-foreground">
                  Show Tamil text below English on thermal bills
                </p>
              </div>
            </div>

            <div>
              <Label>Default Payment Mode</Label>
              <select
                value={settings.defaultPaymentMode || "cash"}
                onChange={(e) =>
                  setSettings({ ...settings, defaultPaymentMode: e.target.value })
                }
                className="border rounded p-2 w-full max-w-xs mt-1 bg-background"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="upi">UPI</option>
                <option value="mixed">Mixed Payment</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <LoadingButton onClick={save} isLoading={isSaving} className="w-full sm:w-auto">
          Save All Settings
        </LoadingButton>
      </div>
    );
  };

  const isRestaurantMode = profile.billing_settings?.isRestaurant;

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" text="Loading settings..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold">Settings</h1>
        </div>
      </header>

      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <Tabs defaultValue="business" className="space-y-6">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 lg:w-fit gap-1">
            <TabsTrigger value="business" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Business</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Billing</span>
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-2">
              <UserCog className="h-4 w-4" />
              <span className="hidden sm:inline">Team</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">Account</span>
            </TabsTrigger>
          </TabsList>

          {/* Business Details Tab */}
          <TabsContent value="business">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Business Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company_name">Company Name *</Label>
                      <Input
                        id="company_name"
                        value={profile.company_name}
                        onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="company_name_tamil">Company Name (Tamil)</Label>
                      <Input
                        id="company_name_tamil"
                        value={profile.company_name_tamil || ""}
                        onChange={(e) => setProfile({ ...profile, company_name_tamil: e.target.value })}
                        placeholder="யூஜி ஸ்டோர்ஸ் (used in bilingual bills)"
                      />
                      <p className="text-xs text-muted-foreground">
                        Used in thermal bills when bilingual mode is enabled
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gstin">GSTIN</Label>
                      <Input
                        id="gstin"
                        value={profile.gstin}
                        onChange={(e) => setProfile({ ...profile, gstin: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={profile.address}
                        onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={profile.city}
                        onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={profile.state}
                        onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pincode">Pincode</Label>
                      <Input
                        id="pincode"
                        value={profile.pincode}
                        onChange={(e) => setProfile({ ...profile, pincode: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="thank_you_note">Thank You Note</Label>
                      <Textarea
                        id="thank_you_note"
                        value={profile.thank_you_note}
                        onChange={(e) => setProfile({ ...profile, thank_you_note: e.target.value })}
                        placeholder="Thank you for your business!"
                        rows={3}
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={loading}>
                    {loading ? "Saving..." : "Save Profile"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Settings Tab */}
          <TabsContent value="billing">
            <BillingSettingsSection />
          </TabsContent>

          {/* Team Management Tab */}
          <TabsContent value="team" className="space-y-6">
            {/* Staff Management */}
            <StaffCard staff={staff} onRefresh={fetchStaff} isRestaurantMode={isRestaurantMode || false} />
            
            {/* Waiter Management - Only show when restaurant mode is enabled */}
            {isRestaurantMode && (
              <WaiterCard waiters={waiters} onRefresh={fetchWaiters} />
            )}
          </TabsContent>

          {/* Account Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Change Account Password</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label htmlFor="old-password">Current Password *</Label>
                    <Input
                      id="old-password"
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="Enter current password"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password *</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password *</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      required
                    />
                  </div>
                  <Button type="submit" disabled={passwordLoading}>
                    {passwordLoading ? (
                      <>
                        <span className="animate-spin mr-2">⟳</span>
                        Changing...
                      </>
                    ) : "Change Password"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Profile;